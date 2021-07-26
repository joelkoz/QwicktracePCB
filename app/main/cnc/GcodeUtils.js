const util = require('util');
const exec = util.promisify(require("child_process").exec);

class GcodeUtils {

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

}


module.exports = GcodeUtils;