const { ipcMain } = require('electron')

const fse = require('fs-extra');
const whatsThatGerber = require('whats-that-gerber')
const gerbValid = require('whats-that-gerber').validate;
const path = require('path');


const dropDir = "./pcb-files/";
const workDir = "./temp/";


const MainSubProcess = require('./MainSubProcess.js');
const PCBProject = require('./pcb/PCBProject.js');
const GerberUtils = require('./pcb/GerberUtils.js');

let _projectCache = {};
let _filesToProject = {};
let _currentProject = {};

class ProjectLoader  extends MainSubProcess {

    constructor(win) {

      super(win);

      this.lastFileSyncMs = 0;

       // Do a file list refresh now...
      this.refreshFileList();

       // And every 5 seconds after this...
       let thiz = this;
      setInterval(() => { thiz.refreshFileList(); }, 5000);
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
        let project = _projectCache[projectId];

        try {
            let originalSize = await project.getSize();

            // Make sure board is wider than it is taller...
            let rotateBoard = (originalSize.y > originalSize.x);
            const clockwise = true;

            if (_currentProject.projectId != projectId) {
                // Start work on a new project...
                await fse.emptyDir(workDir);

                _currentProject = { projectId };
                if (rotateBoard) {
                    _currentProject.originalSize = { "x": originalSize.y, "y": originalSize.x };
                }
                else {
                    _currentProject.originalSize = { "x": originalSize.x, "y": originalSize.y };
                }
            }

            // Place a copy of gbr and drill files in the work directory.
            let side = state.side;
            let mirror = (side === 'bottom');
            let gbrTarget = workDir + side + ".gbr";
            let results = {};

            if (!fse.existsSync(gbrTarget)) {
               let fileName = project.getSideFile(side);
               if (fileName) {
                    let gbrSource = project.dirName + "/" + fileName;
                    if (rotateBoard) {
                        // Copy and rotate the files
                        await GerberUtils.rotateGbr90(gbrSource, gbrTarget, originalSize.x, originalSize.y, clockwise, mirror);
                    }
                    else {
                        // Copy the files as is...
                        await GerberUtils.transGbr(gbrSource, gbrTarget, 0, 0, 0, mirror);
                    }
                    results.gbr = gbrTarget;
                }
            }
            else {
                results.gbr = gbrTarget;
            }


            let drlTarget = workDir + side + ".drl";
            if (!fse.existsSync(drlTarget)) {
               if (project.drillFile) {
                    let drlSource = project.dirName + "/" + project.drillFile;
                    if (rotateBoard) {
                        // Copy and rotate the files
                        await GerberUtils.rotateGbr90(drlSource, drlTarget, originalSize.x, originalSize.y, clockwise, mirror);
                    }
                    else {
                        // Copy the files as is...
                        await GerberUtils.transGbr(drlSource, drlTarget, 0, 0, 0, mirror);
                    }
                    results.drl = drlTarget;
                }
            }
            else {
                results.drl = drlTarget;
            }

            return results;

        }
        catch (err) {
            console.error(err);
        }
    }


    checkProjectFile(fileName) {
        let project = new PCBProject(fileName);
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
            thiz.ipcSend('ui-project-update', uiObj);

            if (project.projectId === _currentProject.projectId) {
                // Time to re-create the project work files...
                _currentProject = {};
            }
        }
    }


    checkGerberFile(fileName) {
        let baseName = path.basename(fileName);
        if (!this.filesToProject[baseName]) {
            // We do not yet have this file as
            // part of a project. Create a
            // psuedo project for it...
            let project = new PCBProject();
            project.fromGerber(fileName);
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
