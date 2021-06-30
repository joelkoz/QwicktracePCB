const util = require('util');
const exec = util.promisify(require("child_process").exec);

class GCodeGenerator {

    constructor(jsonJob) {
        this.jsonJob = jsonJob;
        this.projectId = this.jsonJob.GeneralSpecs.ProjectId.Name;
        this.width = this.jsonJob.GeneralSpecs.Size.X;
        this.height = this.jsonJob.GeneralSpecs.Size.Y;
        this.workDir = "./";
    }

    setWorkDir(workDir) {
        this.workDir = workDir;
    }

    async gbrToMill(inputFileName, outputFileName) {

        let cmd = `pcb2gcode --front ${inputFileName} --front-output ${outputFileName}`;
        await exec(cmd);
    }


    async drlToDrill(inputFileName, outputFileName) {

        let cmd = `pcb2gcode --drill-side front --drill ${inputFileName} --drill-output ${outputFileName}`;
        await exec(cmd);
    }

    /**
     * Writes out a translated gerber file rotated by the
     * specified amount
     * @param {string} inputFileName 
     * @param {string} outputFileName 
     * @param {number} degRotate Degrees to rotate. A positive number is counter clockwise, negative is clockwise
     * @param {number} tx amount to translate X axis
     * @param {number} ty amount to translate Y axis
     * @param {boolean} mirror True if the results should be mirrored (i.e. for the back)
     */
    async transGbr(inputFileName, outputFileName, degRotate=0, tx=0, ty=0, mirror=false) {

        let isDrill = (inputFileName.indexOf('.drl') > 0);
        let absRot = (degRotate >= 0) ? degRotate : 360 + degRotate;

        let mirrorParam = mirror ? "-m Y" : ""
        let exportType = isDrill ? "drill" : "rs274x";

        let cmd = `gerbv -u mm -x ${exportType} ${mirrorParam} -T "${tx}x${ty}r${absRot}" -o "${outputFileName}" "${inputFileName}"`;
        await exec(cmd);
    }


    async rotateGbr90(inputFileName, outputFileName, clockwise=true, mirror=true) {

        let degRotage = clockwise ? -90 : 90;
        let tx = 0;
        let ty = 0;
        if (clockwise) {
            ty = this.width;
        }
        else {
            tx = this.height;
        }
        await this.transGbr(inputFileName, outputFileName, degRotate, tx, ty, mirror);
    }

}
