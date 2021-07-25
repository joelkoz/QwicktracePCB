const util = require('util');
const exec = util.promisify(require("child_process").exec);
const fs = require('fs');
const readline = require('readline');

const { rotate, scale, translate, compose, applyToPoint } = require('transformation-matrix');

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
     */
    static async transGbr(inputFileName, outputFileName, degRotate=0, tx=0, ty=0) {

        let isDrill = (inputFileName.indexOf('.drl') > 0);
        let absRot = (degRotate >= 0) ? degRotate : 360 + degRotate;

        let exportType = isDrill ? "drill" : "rs274x";

        let cmd = `gerbv -u mm -x ${exportType} -T "${tx}x${ty}r${absRot}" -o "${outputFileName}" "${inputFileName}"`;
        console.log(`transGbr() ran ${cmd}`);
        await exec(cmd);
    }


    static async rotateGbr90(inputFileName, outputFileName, inputWidth, inputHeight, clockwise=true) {

        let degRotate = clockwise ? -90 : 90;
        let tx = 0;
        let ty = 0;
        if (clockwise) {
            ty = inputWidth;
        }
        else {
            tx = inputHeight;
        }
        await this.transGbr(inputFileName, outputFileName, degRotate, tx, ty);
    }

    static async _transformGbr(inputFileName, outputFileName, matrixXY, matrixIJ, invertArc = false) {

        let fmt = {};
        
        function parseCoord(line, ndxStart, ndxEnd) {
            if (ndxStart >= 0) {
                let str = line.substring(ndxStart+1, ndxEnd);
                let n = parseFloat(str);             
                let val = n * Math.pow(10, -fmt.decimals);
                return val;
            }
            else {
                return null;
            }
        }

        function fmtCoord(prefix, val) {
            if (val != null) {
                return prefix + Math.round(val * Math.pow(10, fmt.decimals)).toString();
            }
            else {
                return '';
            }
        }

        function transformLine(line) {
            let ndxY = line.indexOf('Y');
            let ndxI = line.indexOf('I');
            let ndxJ = line.indexOf('J');
            let ndxD = line.indexOf('D');

            let x = parseCoord(line, 0, ndxY)
            let y = parseCoord(line, ndxY, (ndxI > 0) ? ndxI : ndxD)
            let point = applyToPoint(matrixXY, {x, y});

            let offset = {}
            offset.i = parseCoord(line, ndxI, ndxJ);
            offset.j = parseCoord(line, ndxJ, ndxD);
            if (offset.i != null) {
                offset = applyToPoint(matrixIJ, offset);
            }

            return fmtCoord('X', point.x) + fmtCoord('Y', point.y) + fmtCoord('I', offset.i) + fmtCoord('J', offset.j) + line.substring(ndxD);
        }


        try {
            const fileStream = fs.createReadStream(inputFileName);

            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            let out = fs.createWriteStream(outputFileName);

            for await (const line of rl) {
                
                let outLine = line;
                if (line.startsWith('%FS')) {
                    // Format specs
                    let ndxX = line.indexOf('X');
                    fmt.leading = parseInt(line.substring(ndxX+1, ndxX+2));
                    fmt.decimals = parseInt(line.substring(ndxX+2, ndxX+3));                
                }
                else if (line.startsWith('X')) {
                    outLine = transformLine(line);
                }
                else if (line == 'G02*' && invertArc) {
                    outLine = 'G03*';
                }
                else if (line == 'G03*' && invertArc) {
                    outLine = 'G02*';
                }
                out.write(outLine, 'utf8');
                out.write('\n');
            }

            out.end();
        }
        catch (err) {
            console.log('Error during _transformGbr: ', err)
        }
    }

    static async mirrorGbr(inputFileName, outputFileName, sizeX, sizeY, mirrorX, mirrorY) {

        let invertArc = (mirrorX && !mirrorY) || (mirrorY && !mirrorX)
        
        let matrixXY = compose(
           scale(mirrorY ? -1 : 1, mirrorX ? -1 : 1),
           translate(mirrorY ? -sizeX : 0, mirrorX ? -sizeY : 0)
        );

        let matrixIJ = compose(
            scale(mirrorY ? -1 : 1, mirrorX ? -1 : 1)
        );

        await GerberUtils._transformGbr(inputFileName, outputFileName, matrixXY, matrixIJ, invertArc)
    }


    static async _transformDrl(inputFileName, outputFileName, matrixXY) {
        
        function parseCoord(line, ndxStart, ndxEnd) {
            if (ndxStart >= 0) {
                let str = line.substring(ndxStart+1, ndxEnd);
                let val = parseFloat(str);             
                return val;
            }
            else {
                return null;
            }
        }

        function fmtCoord(prefix, val) {
            if (val != null) {
                return prefix + val.toFixed(2);
            }
            else {
                return '';
            }
        }

        function transformLine(line) {
            let ndxY = line.indexOf('Y');

            let x = parseCoord(line, 0, ndxY)
            let y = parseCoord(line, ndxY, line.length)
            let point = applyToPoint(matrixXY, {x, y});

            return fmtCoord('X', point.x) + fmtCoord('Y', point.y);
        }


        try {
            const fileStream = fs.createReadStream(inputFileName);

            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            let out = fs.createWriteStream(outputFileName);

            for await (const line of rl) {
                
                let outLine = line;
                if (line.startsWith('X')) {
                    outLine = transformLine(line);
                }
                out.write(outLine, 'utf8');
                out.write('\n');
            }

            out.end();
        }
        catch (err) {
            console.log('Error during _transformDrl: ', err)
        }
    }


    static async mirrorDrl(inputFileName, outputFileName, sizeX, sizeY, mirrorX, mirrorY) {
       
        let matrixXY = compose(
           scale(mirrorY ? -1 : 1, mirrorX ? -1 : 1),
           translate(mirrorY ? -sizeX : 0, mirrorX ? -sizeY : 0)
        );

        await GerberUtils._transformDrl(inputFileName, outputFileName, matrixXY)
 
    }

}


module.exports = GerberUtils;