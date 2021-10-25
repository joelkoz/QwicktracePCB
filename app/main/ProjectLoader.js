const fse = require('fs-extra');
const path = require('path');
const fsprReadFile = require('fs').promises.readFile;
const fsprWriteFile = require('fs').promises.writeFile;

const dropDir = "./pcb-files/";
const workDir = "./temp/";

const MainSubProcess = require('./MainSubProcess.js');
const PCBProject = require('./pcb/PCBProject.js');
const GcodeUtils = require('./cnc/GcodeUtils.js');
const GerberData = require('./pcb/GerberData.js');
const GerberTransforms = require('./pcb/GerberTransforms.js');
const MainMQ = require('./MainMQ.js');

// _projectCache is an object that maps a projectId to one or 
// more PCBProject() objects.
let _projectCache = {};

// _filesToProject is an object that maps a gerber or drill
// file name back to the PCBProject it is part of.
let _filesToProject = {};

// _currentProfile holds the latest information concerning
// the most recent project prepared by prepareForWork().
let _currentProfile = {};

class ProjectLoader  extends MainSubProcess {

    constructor(win) {

      super(win, 'projects');

      this.lastFileSyncMs = 0;

       // Do a file list refresh now...
      this.refreshFileList();

       // And every 5 seconds after this...
      let thiz = this;
      setInterval(() => { thiz.refreshFileList(); }, 5000);

      this.rpcAPI( {
        async prepareForWork(profile) {
           let updatedProfile = await ProjectLoader.prepareForWork(profile);
           return updatedProfile;
        },

        async getOriginalSize(projectId) {
            let project = _projectCache[projectId];
            let originalSize = await project.getSize();
            return originalSize
        }

      });


    }


    get projectCache() {
        return _projectCache;
    }

    get filesToProject() {
        return _filesToProject;
    }


    /**
     * Retrieves the fully qualified path and file name for the
     * specified projectId and side
     * @param {string} projectId A project Id previously read by the project laoder
     * @param {string} side  one of "top", "bottom", or "drill"
     * @returns The fully qualified path, or undefined if the definition does not exist.
     */
    static getFileName(projectId, side) {
        let project = _projectCache[projectId];
        if (project) {
            let sideFile = project.getSideFile(side);
            if (sideFile) {
                let res = project.dirName + "/" + sideFile;
                return res;
            }
        }

        return undefined;
    }


    /**
     * Initializes the project work directory by creating transformed files ready
     * for use by the system. Two files are created: side.gbr and side.drl. If
     * the side is bottom, it is mirrored.
     * @param {object} profile 
     */
    static async prepareForWork(profile) {
        let state = profile.state;
        let projectId = state.projectId;
        console.log('Preparing for work on project id ', projectId);
        let project = _projectCache[projectId];

        try {
            let originalSize = await project.getSize();

            // Make sure board is wider than it is taller...
            let rotateBoard = (originalSize.y > originalSize.x);
            const clockwise = true;

            if (_currentProfile?.state?.projectId != projectId) {
                // Start work on a new project...
                console.log('Emptying work dir for new project id ', projectId);
                await fse.emptyDir(workDir);
            }

            _currentProfile = profile;
            _currentProfile.state.originalSize = originalSize;
            _currentProfile.state.rotateBoard = rotateBoard;
            if (rotateBoard) {
                _currentProfile.state.size = { "x": originalSize.y, "y": originalSize.x };
            }
            else {
                _currentProfile.state.size = { "x": originalSize.x, "y": originalSize.y };
            }
            
            // Place a copy of gbr and drill files in the work directory.
            let side = state.side;
            let mirror = (side === 'bottom');
            _currentProfile.state.mirror = mirror;
            let gbrTarget = workDir + side + ".gbr";

            // Create the transformations necessary to position the board
            // for fabrication. Note that the order of these transformations
            // are important, so don't change them. 
            let gTrans = new GerberTransforms(project);
            if (rotateBoard) {
                await gTrans.rotate90();
                if (mirror) {
                   await gTrans.mirror(false, true);
                }
            }
            else {
                if (mirror) {
                   await gTrans.mirror(true, false);
                }
            }

            if (!fse.existsSync(gbrTarget)) {
               let fileName = project.getSideFile(side);
               if (fileName) {
                    let gbrSource = project.dirName + "/" + fileName;
                    console.log('Prepare for work creating base file ', gbrTarget)
                    await gTrans.transformGbr(gbrSource, gbrTarget);
               }
               else {
                   gbrTarget = undefined;
               }
            }


            let drlTarget = workDir + side + ".drl";
            if (!fse.existsSync(drlTarget)) {
               if (project.drillFile) {
                    let drlSource = project.dirName + "/" + project.drillFile;
                    console.log('Prepare for work creating base file ', drlTarget)
                    await gTrans.transformDrl(drlSource, drlTarget);
               }
               else {
                   drlTarget = undefined;
               }
            }

            _currentProfile.baseFiles = { gbr: gbrTarget, drl: drlTarget }

            if (state.positionBoard) {
                // Create intermediate gbr and drl files with board positioned at user selected
                // spot...
                let gbrPositioned = workDir + side + "-pos.gbr";
                let drlPositioned = workDir + side + "-pos.drl";
                let gTrans2 = new GerberTransforms(project);
                let stock;
                if (profile.stock.actual) {
                    stock = profile.stock.actual;
                }
                else {
                    stock = profile.stock;
                }
                await gTrans2.positionCopper(state.positionBoard, stock);

                if (!fse.existsSync(gbrPositioned)) {
                    if (gbrTarget) {
                         console.log('Prepare for work creating work file ', gbrPositioned)
                         await gTrans2.transformGbr(gbrTarget, gbrPositioned);
                     }
                 }

                 if (!fse.existsSync(drlPositioned)) {
                    if (drlTarget) {
                         console.log('Prepare for work creating work file ', drlPositioned)
                         await gTrans2.transformDrl(drlTarget, drlPositioned);
                    }
                    else {
                        drlPositioned = undefined;
                    }
                 }
                 
                 _currentProfile.workFiles = { gbr: gbrPositioned, drl: drlPositioned }
     
            }
            else {
                console.log('PrepareForWork using base files for work files (no position specified)')
                _currentProfile.workFiles = { gbr: gbrTarget, drl: drlTarget }
            }
            
            console.log('Prepare for work - base files: ', _currentProfile.baseFiles)
            console.log('Prepare for work -  work files: ', _currentProfile.workFiles)

            return  _currentProfile;

        }
        catch (err) {
            console.error(err);
        }
    }



    static async getFinalGerber(profile) {

        let workProfile = await ProjectLoader.prepareForWork(profile);

        let state = workProfile.state;

        // Load up the work files into a new project object to
        // capture all of the current transforms...
        let workProject = new PCBProject();
        let gbrSource;
        let gType = { side: state.side };
        if (state.action === 'mill') {
            gbrSource = workProfile.workFiles.gbr;
            gType.type = 'copper'
        }
        else {
            gbrSource = workProfile.workFiles.drl;
            gType.type = 'drill'
        }
        workProject.fromGerber(gbrSource, gType);


        // Determine final file to use in milling/drilling
        let gbrFinal;

        if (state.deskew) {
            // We have one last deskew transformation to do...
            let gTrans = new GerberTransforms(workProject);
            gTrans.deskew(state.deskew);

            gbrFinal = workDir + state.side + '-deskew';

            if (state.action === 'mill') {
               gbrFinal += '.gbr';
               await gTrans.transformGbr(gbrSource, gbrFinal);
            }
            else {
                gbrFinal += '.drl';
                await gTrans.transformDrl(gbrSource, gbrFinal);  
            }
        }
        else {
            // No additional transformations: use the work files created by prepareForWork()...
            if (state.action === 'mill') {
                gbrFinal = workProfile.workFiles.gbr;
             }
             else {
                 gbrFinal = workProfile.workFiles.drl;
             }
 
        }

        return gbrFinal;

    }
 

    static async getWorkAsGcode(profile) {

        let gbrFinal = await ProjectLoader.getFinalGerber(profile);

        let state = profile.state;
        let gcTarget = workDir + state.side + "-" + state.action + ".nc"

        if (state.action === 'mill') {
           await GcodeUtils.gbrToMill(gbrFinal, gcTarget);
        }
        else {
            await GcodeUtils.drlToDrill(gbrFinal, gcTarget); 
        }

        // Read in the contents of the gcode file...
        let rawContents = await fsprReadFile(gcTarget);
        let contents = rawContents.toString();

        // Strip out tool change commands, as we have already taken care of that stuff...
        if (state.action === 'mill') {
            let ndxRemoveStart = contents.indexOf('(Retract');
            let ndxRemoveEnd = contents.indexOf('( retract )');
            contents = contents.substring(0, ndxRemoveStart) + 
                       '\nM3\n' +
                       contents.substring(ndxRemoveEnd+11)


            // Write out file contents for testing purposes...
            let gcFinalContents = workDir + state.side + "-" + state.action + "-final.nc"
            await fsprWriteFile(gcFinalContents, contents);

        }

        return { name: `${state.projectId}-${state.side}`, contents };
    }




    static async getWorkAsGerberData(profile) {

        let gbrFinal = await ProjectLoader.getFinalGerber(profile);
        let gData = new GerberData();
        await gData.loadFilesAsync([ gbrFinal ]);
        return gData;
    }


    
    checkProjectFile(gbrJobFileName) {
        let project = new PCBProject(gbrJobFileName);
        let projId = project.projectId;
        if (projId) {
            // See if we have this project in the cache already...
            let existingProject = this.projectCache[projId];
            if (existingProject) {
                // This is a pre-existing project. Just
                // update the gbrjob data...
                let newGbrjob = project.gbrjob;
                existingProject.gbrjob = newGbrjob;
                project = existingProject;
            }
            else {
                // A new project altogether
                this.projectCache[projId] = project;
            }

            this.updateFileMap(project);
        }
    }


    // Add all of the files in the project to the file
    // translation table...
    updateFileMap(project, drillWasUpdated) {
        let thiz = this;
        let modified = false;
        project.fileList.forEach(file => {
            if (!thiz.filesToProject.hasOwnProperty(file)) {
               thiz.filesToProject[file] = project;
               modified = true;
            }
        });

        if (modified || drillWasUpdated) {
            let uiObj = project.getUiObj();
            MainMQ.emit('render.ui.projectUpdate', uiObj);

            if (project.projectId === _currentProfile.projectId) {
                // Time to re-create the project work files...
                console.log('ProjectLoader.updateFileMap() cleared current profile')
                _currentProfile = {};
            }
        }
    }


    checkGerberFile(gbrFileName) {
        let baseName = path.basename(gbrFileName);
        if (!this.filesToProject[baseName]) {
            // We do not yet have this file as
            // part of a project. Create a
            // psuedo project for it...
            let project = new PCBProject();
            project.fromGerber(gbrFileName);
            let projId = project.projectId;
            if (projId) {
                // This is a legit gerber file as a
                // projectId was determined...
                let existingProject = this.projectCache[projId];
                let drillWasUpdated = false;
                if (existingProject) {
                    // We already have an entry for this.
                    // merge the two...
                    if (!project.drillFile) {
                        let fattr = project.gbrjob.FilesAttributes;
                        if (fattr.length == 1) {
                            existingProject.addFilesAttributes(fattr[0]);
                        }
                    }
                    else if (!existingProject.drillFile) {
                        existingProject.drillFile = project.drillFile;
                        drillWasUpdated = true;
                    }
                    project = existingProject;
                }
                else {
                    this.projectCache[projId] = project;
                }

                this.updateFileMap(project, drillWasUpdated);
            }
        }
    }

    refreshFileList() {
      let thiz = this;
      fse.readdir(dropDir, (err, files) => {
          let msLastSync = this.lastFileSyncMs;
          let jobList = [];
          let gbrList = [];
          files.forEach(file => {
            let fileName = dropDir + file;
            let fstat = fse.statSync(fileName, false);
            if (fstat.mtimeMs > msLastSync) {
                let ext = path.extname(fileName);
                if (ext === '.gbrjob') {
                    jobList.push(fileName);
                }
                else {
                    gbrList.push(fileName);
                }
            }
          });

          jobList.forEach(file => {
             thiz.checkProjectFile(file);
          });

          gbrList.forEach(file => {
            thiz.checkGerberFile(file);
          });

          this.lastFileSyncMs = Date.now();
      });  
    }     
}

ProjectLoader.workDir = workDir;

module.exports = ProjectLoader;
