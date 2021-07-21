const util = require('util');
const exec = util.promisify(require("child_process").exec);

class GerberUtils {

    static async gbrToMill(inputFileName, outputFileName) {

        let cmd = `pcb2gcode --front ${inputFileName} --front-output ${outputFileName}`;
        console.log(`gbrToMill() ran ${cmd}`);
        await exec(cmd);
    }


    static async drlToDrill(inputFileName, outputFileName) {

        let cmd = `pcb2gcode --drill-side front --drill ${inputFileName} --drill-output ${outputFileName}`;
        console.log(`drlToDrill() ran ${cmd}`);
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
    static async transGbr(inputFileName, outputFileName, degRotate=0, tx=0, ty=0, mirror=false) {

        let isDrill = (inputFileName.indexOf('.drl') > 0);
        let absRot = (degRotate >= 0) ? degRotate : 360 + degRotate;

mirror = false;        
        let mirrorParam = mirror ? "-m Y" : ""
        let exportType = isDrill ? "drill" : "rs274x";

        let cmd = `gerbv -u mm -x ${exportType} ${mirrorParam} -T "${tx}x${ty}r${absRot}" -o "${outputFileName}" "${inputFileName}"`;
        console.log(`transGbr() ran ${cmd}`);
        await exec(cmd);
    }


    static async rotateGbr90(inputFileName, outputFileName, inputWidth, inputHeight, margin = 0, clockwise=true, mirror=false) {

        let degRotate = clockwise ? -90 : 90;
        let tx = 0;
        let ty = 0;
        if (clockwise) {
            ty = inputWidth + margin;
        }
        else {
            tx = inputHeight + margin;
        }
        await this.transGbr(inputFileName, outputFileName, degRotate, tx, ty, mirror);
    }


}


module.exports = GerberUtils;