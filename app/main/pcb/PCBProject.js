const fs = require('fs-extra');
const path = require('path');

const whatsThatGerber = require('whats-that-gerber')
const gerbValid = require('whats-that-gerber').validate;
const GerberData = require('./GerberData.js');
const GerberTransforms = require('./GerberTransforms.js');

class PCBProject {

    constructor(projectFileName) {
        if (projectFileName) {
            this.loadCache(projectFileName);
        }
        else {
            this.gbrjob = {};
        }
    }


    get projectId() {
        if (this.gbrjob.GeneralSpecs) {
            if (this.gbrjob.GeneralSpecs.ProjectId) {
                return this.gbrjob.GeneralSpecs.ProjectId.Name;
            }
        }

        return undefined;
    }

    /**
     * Returns an array of all of the files that are involved in this
     * particular PCBProject.
     */
    get fileList() {
        if (!this._flist) {
            this._flist = [];
            if (this.gbrjob.FilesAttributes) {
                let thiz = this;
                this.gbrjob.FilesAttributes.forEach(attr => {
                    thiz._flist.push(attr.Path);
                });
            }

            if (this.drillFile) {
                this._flist.push(this.drillFile);
            }
        }
        return this._flist;
    }

    get size() {
        if (this.gbrjob.GeneralSpecs) {
            let _size = this.gbrjob.GeneralSpecs.Size;
            if (_size) {
                return { x: _size.X, y: _size.Y };
            }
        }

        return undefined;
    }


    async getGerberData() {
        if (!this._gerberData) {
            this._gerberData = new GerberData();
            let projectFiles = this.getProjectFileList();
            await this._gerberData.loadFilesAsync(projectFiles); 
        }
        return this._gerberData;
    }


    getProjectFileList() {
       if (!this._projectFiles) {
            let projectFiles = [];
            let thiz = this;
            this.fileList.forEach(fileName => {
                projectFiles.push(thiz.dirName + "/" + fileName)
            })
            this._projectFiles = projectFiles;
       }
       return this._projectFiles;
    }


    // Method is guaranteed to succeed in that if the
    // size is not specified, the Gerber files are 
    // parsed so the size can be deduced.
    async getSize() {
        let size = this.size;

        if (!size) {
            console.log(`No size data for project ${this.projectId} - parsing gerber files.`);

            let gerberData = await this.getGerberData();

            size = gerberData.size;

            this.gbrjob.GeneralSpecs.Size = { X: size.x, Y: size.y };

        }

        return size;
    }


    get gbrjob() {
        return this._gbrjob;
    }

    set gbrjob(newGbrJob) {
        this._gbrjob = newGbrJob;
        this.flist = undefined;
    }

    get drillFile() {
        return this._drillFile
    }


    set drillFile(newDrillFile) {
        this._drillFile = newDrillFile;
        this._flist = undefined;
    }


    /**
     * Returns the base file name of the requested side (or drill)
     * @param {string} sideName One of "top", "bottom", or "drill"
     * @returns The base file name if it is part of this project, or undefined
     */
    getSideFile(sideName) {
        let search = sideName.toLowerCase();

        if (search === 'drill') {
            // A drill file is wanted...
            return this.drillFile;
        }
        else {
            let search = sideName.toLowerCase();
            if (search === 'bottom') {
                search = 'bot';
            }
            for (let i=0; i < this.gbrjob.FilesAttributes.length; i++) {
                let attr = this.gbrjob.FilesAttributes[i];
                let ff = attr.FileFunction.toLowerCase();
                if (ff.indexOf('copper') >= 0 && ff.indexOf(search) >= 0) {
                    return attr.Path;
                }
            };
        }

        return undefined;
    }


    /**
     * Returns an object that represents this project for the user interface.
     */
     getUiObj() {
        let sides = [];
        this.gbrjob.FilesAttributes.forEach(attr => {
            if (attr.FileFunction.indexOf('Copper') >= 0) {
                // This attribute is for a copper side.
                if (attr.FileFunction.indexOf('Top') > 0) {
                    sides.push('top');
                }
                else if (attr.FileFunction.indexOf('Bot') > 0) {
                    sides.push('bottom');
                }
            }
        });

        let master = this.boundingBoxes.master.bb;
        let masterWidth = master.max.x - master.min.x;
        let masterHeight = master.max.y - master.min.y;
        let rotateNeeded = (masterHeight > masterWidth);
        return {
            projectId: this.projectId,
            sides,
            hasDrill: (this.drillFile ? true : false),
            size: this.size,
            sizes: {
                copper: this.boundingBoxes.copper.both.bb,
                master
            },
            rotateNeeded
        };
    }


    /**
     * Adds the specified file attribute to the list of existing
     * files (if it does not already exist)...
     * @param {object} newAttr The new entry to add to FilesAttributes
     */
    addFilesAttributes(newAttr) {
        let flist = this.fileList;
        let newFileName = newAttr.Path;
        if (!flist.includes(newFileName)) {
            this.gbrjob.FilesAttributes.push(newAttr);
            this._flist.push(newFileName);
        }
    }


    /**
     * Loads a Gerber project file into this project object
     * @param {string} projectFileName The name of the gbrjob file to load
     */
    loadCache(projectFileName) {
        let jStr = fs.readFileSync(projectFileName, 'utf8');
        let projectData = JSON.parse(jStr);
        this.gbrjob = projectData.gbrjob;
        this.drillFile = projectData.drillFile;
        this.boundingBoxes = projectData.boundingBoxes;
        this.dirName = path.dirname(projectFileName);
    }


    /**
     * Saves this project file so it can be reloaded later...
     */
    async saveCache(projectFileName) {
        console.log('Saving project cache file', projectFileName);
        await this.getSize();
        await this.getGerberData();

        if (this.size.y > this.size.x) {
            console.log("Project taller than wider - rotations needed...");
            await this._rotateProjectFiles();
        }

        let projectData = { gbrjob: this.gbrjob };
        projectData.boundingBoxes = this._gerberData.boundingBoxes;
        projectData.drillFile = this.drillFile;
        let jStr = JSON.stringify(projectData, null, 2);
        await fs.writeFile(projectFileName, jStr, 'utf8');
    }


    async _rotateProjectFiles() {
        let gData = await this.getGerberData();

        // Rotates all of the files in the project 90 degrees...
        let gTrans = new GerberTransforms(this);
        gTrans.rotate90();
        let files = this.fileList;
        for (const fileName of files) {
            let gbrTarget = this.dirName + "/" + fileName;
            let tempFile = this.dirName + "/" + "__toRotate.gbr";
            await fs.move(gbrTarget, tempFile, { overwrite: true });
            console.log(`Rotating ${gbrTarget} 90 degrees...`);
            if (gbrTarget.endsWith('DRL')) {
                await gTrans.transformDrl(tempFile, gbrTarget);
            }
            else {
               await gTrans.transformGbr(tempFile, gbrTarget);
            }
            await fs.remove(tempFile);
        };

        // Finally, swap all of the bounding boxes...
        gData.boundingBoxes.master.rotate();
        gData.boundingBoxes.drill.rotate();
        gData.boundingBoxes.corners.rotate();
        gData.boundingBoxes.copper.top.rotate();
        gData.boundingBoxes.copper.bottom.rotate();
        gData.boundingBoxes.copper.both.rotate();

        let oldSize = this.gbrjob.GeneralSpecs.Size;
        this.gbrjob.GeneralSpecs.Size = { X: oldSize.Y, Y: oldSize.X };
    }


    /**
     * Creates a mock gerber job structure (or adds to the existing one)
     * whatever information can be gleaned from the specified gerber file.
     * @param {string} gerberFileName 
     */
    fromGerber(gerberFileName, gType) {

        if (!gType) {
            // TODO Is whatsThatGerber() the best approach to identifying
            // the file type?  Actual Gerber X2 files have a header such as
            // %TF.FileFunction,Copper,L2,Bot*%
            // With whatsThatGerber(), files named strangely can have a type 
            // incorrectly resolved as 'drawing'
            //
            // See UCamCo Gerber specification section 5.6.3:
            //
            // %TF.FileFunction,Copper,L<n>,(Top|Inr|Bot)
            // where
            //   <n> = Layer number. Top layer is "1". Highest number is bottom.
            // or
            // %TF.FileFunction,Profile,(P|NP)
            // or
            // %TF.FileFunction,Soldermask,(Top|Bot)
            // or
            // %TF.FileFunction,Legend,(Top|Bot)
            //
            let typeByFile = whatsThatGerber([gerberFileName]);
            gType = typeByFile[gerberFileName];
            if (!gerbValid(gType)) {
                gType = null;
            }
        }

        if (gType) {

            // We now have a valid gerber file...
            let baseName = path.basename(gerberFileName);

            if (!this.gbrjob.hasOwnProperty('GeneralSpecs')) {
                this.gbrjob.GeneralSpecs = {};
            }
            if (!this.gbrjob.GeneralSpecs.hasOwnProperty('ProjectId')) {
                this.gbrjob.GeneralSpecs.ProjectId = {};
            }


            // Derive the project Id from file name...
            if (!this.gbrjob.GeneralSpecs.ProjectId.Name) {

                let searchChar;
                if (gType.type === 'drill') {
                    searchChar = '.';
                }
                else {
                    searchChar = "-";
                }
                let ndx = baseName.indexOf(searchChar);
                if (ndx > 0) {
                    this.gbrjob.GeneralSpecs.ProjectId.Name = baseName.substr(0, ndx);
                }
            }

            if (!this.gbrjob.hasOwnProperty('FilesAttributes')) {
                this.gbrjob.FilesAttributes = [];
            }

            let fileFunc;
            if (gType.type === 'copper') {
                if (gType.side === 'top') {
                    fileFunc = 'Copper,L1,Top';
                }
                else if (gType.side === 'bottom') {
                    fileFunc = 'Copper,L2,Bot';
                }
            }
            else if (gType.type === 'drill') {
                this.drillFile = baseName;
            }
            else if (gType.type === 'outline') {
                fileFunc = 'Profile'
            }
            else {
                console.log(`File ${gerberFileName} is an unhandled type (gtype is ${gType.type})`);
            }

            if (fileFunc) {
                this.gbrjob.FilesAttributes.push({ "Path": baseName, "FileFunction": fileFunc });
            }

            this.dirName = path.dirname(gerberFileName);

        }
        else {
            console.log(`WARNING: ${gerberFileName} is not a valid gerber file. Ignoring`)
        }
    }

}

module.exports = PCBProject