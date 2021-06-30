const fs = require('fs');
const path = require('path');

const whatsThatGerber = require('whats-that-gerber')
const gerbValid = require('whats-that-gerber').validate;

class PCBProject {

    constructor(gbrjobFileName) {
        if (gbrjobFileName) {
            this.loadProject(gbrjobFileName);
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
                if (ff.indexOf(search) >= 0) {
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

        return {
            projectId: this.projectId,
            sides,
            hasDrill: (this.drillFile ? true : false),
            size: this.size
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
     * @param {string} gbrjobFileName The name of the gbrjob file to load
     */
    loadProject(gbrjobFileName) {
        let jStr = fs.readFileSync(gbrjobFileName, 'utf8');
        this.gbrjob = JSON.parse(jStr);
        this.dirName = path.dirname(gbrjobFileName);
    }

    /**
     * Creates a mock gerber job structure (or adds to the existing one)
     * whatever information can be gleaned from the specified gerber file.
     * @param {string} gerberFileName 
     */
    fromGerber(gerberFileName) {

        let typeByFile = whatsThatGerber([gerberFileName]);
        let gType = typeByFile[gerberFileName];
        if (gerbValid(gType)) {
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

            if (fileFunc) {
                this.gbrjob.FilesAttributes.push({ "Path": baseName, "FileFunction": fileFunc });
            }

            this.dirName = path.dirname(gerberFileName);

        }
    }

}

module.exports = PCBProject