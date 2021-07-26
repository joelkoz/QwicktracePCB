const fs = require('fs');
const readline = require('readline');
const { identity, rotateDEG, scale, translate, compose, applyToPoint } = require('transformation-matrix');
const BoundingBox = require('./BoundingBox.js');


class GerberTransforms {

    constructor(pcbProject) {
        this.pcbProject = pcbProject;
        this.matrixXY = identity();
        this.invertArc = false;
    }

    async _checkBBs() {
        if (!this.bb) {
            let gerberData = await this.pcbProject.getGerberData();
            this.bb = {};
            this.bb.master = new BoundingBox(gerberData.boundingBoxes.master);
            this.bb.copper = new BoundingBox(gerberData.boundingBoxes.copper.both);
        }
    }

    async getSize() {
        await this._checkBBs();
        return this.bb.master.size();
    }


    async getCopperSize() {
        await this._checkBBs();
        return this.bb.copper.size();
    }


    async mirror(mirrorX = false, mirrorY = true) {

        this.invertArc = (mirrorX && !mirrorY) || (mirrorY && !mirrorX)
        let size = await this.getSize();    
        let newTransform = compose(
            scale(mirrorY ? -1 : 1, mirrorX ? -1 : 1),
            translate(mirrorY ? -size.x : 0, mirrorX ? -size.y : 0)
         );

         this.addTransform(newTransform);
    }


    async rotate90(clockwise = true) {

        let size = await this.getSize();

        let newTransform = compose(
            rotateDEG(clockwise ? 270 : 90),
            translate(clockwise ? -size.x : 0, !clockwise ? -size.y : 0)
         );

         this.addTransform(newTransform);

    }


    setOrigin(oldX, oldY) {
        let newTransform = compose(
            translate(-oldX, -oldY)
         );
         this.addTransform(newTransform);
    }


    deskew(data) {
        // Convert deskew's radians to degrees...
        let degRotation = data.rotation * 180 / Math.PI;
        
        let tx = data.offset.x;
        let ty = data.offset.y;

        let newTransform = compose(
            translate(tx, ty),
            rotateDEG(degRotation)
         );

         this.addTransform(newTransform);
    }


    addTransform(newTransform) {
        this.matrixXY = compose(this.matrixXY, newTransform );
    }


    /**
     * Centers the copper traces on the specified stock. Note that this
     * will fail if rotate90() has been called following 
     * 
     * @param {*} stockWidth 
     * @param {*} stockHeight 
     */
    async centerCopper(stockWidth, stockHeight) {

        await this._checkBBs();
        let copper = this.bb.copper;
        let oldMarginX = copper.min.x;
        let oldMarginY = copper.min.y
        let copperSize = copper.size();
        let newMarginX = (stockWidth - copperSize.x) / 2;
        let newMarginY = (stockHeight - copperSize.y) / 2;

        let newTransform = compose(
            translate(-oldMarginX, -oldMarginY),
            translate(newMarginX, newMarginY)
         );

         this.addTransform(newTransform);
    }



    async transformGbr(inputFileName, outputFileName) {
        await GerberTransforms._transformGbr(inputFileName, outputFileName, this.matrixXY, this.invertArc)
    }

    async transformDrl(inputFileName, outputFileName) {
        await GerberTransforms._transformDrl(inputFileName, outputFileName, this.matrixXY);
    }


    static async _transformGbr(inputFileName, outputFileName, matrixXY, invertArc = false) {

        let fmt = {};
        
        function parsePoint(line, ndxStart, ndxEnd) {
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

            let x = parsePoint(line, 0, ndxY)
            let y = parsePoint(line, ndxY, (ndxI > 0) ? ndxI : ndxD)
            let point = applyToPoint(matrixXY, {x, y});

            let offset = {}
            offset.x = parsePoint(line, ndxI, ndxJ);
            offset.y = parsePoint(line, ndxJ, ndxD);
            if (offset.x != null) {
                let absI = x + offset.x;
                let absJ = y + offset.y;
                let absOffset = applyToPoint(matrixXY, { x: absI, y: absJ});
                offset.x = absOffset.x - point.x;
                offset.y = absOffset.y - point.y;
            }

            return fmtCoord('X', point.x) + fmtCoord('Y', point.y) + fmtCoord('I', offset.x) + fmtCoord('J', offset.y) + line.substring(ndxD);
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

}

module.exports = GerberTransforms;