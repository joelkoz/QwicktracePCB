const fs = require('fs');
const readline = require('readline');
const { identity, rotateDEG, scale, translate, compose, applyToPoint } = require('transformation-matrix');
const BoundingBox = require('./BoundingBox.js');

const BOARD_POSITIONS = {
    NATURAL: 0,
    CENTER_BOTTOM: 1,
    CENTER_ALL: 2,
    ROTATE_UR: 3,
    ROTATE_CENTER_RIGHT: 4,
    ROTATE_CENTER_ALL: 5
}

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


    async mirror(stock, mirrorX = false, mirrorY = true) {

        this.invertArc = (mirrorX && !mirrorY) || (mirrorY && !mirrorX)
        let newTransform = compose(
            scale(mirrorY ? -1 : 1, mirrorX ? -1 : 1),
            translate(mirrorY ? -stock.width : 0, mirrorX ? -stock.height : 0)
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
     * Positions the copper traces on the specified stock. 
     */
    async positionCopper(boardPosition, stock) {

        await this._checkBBs();
        let stockWidth = stock.width;
        let stockHeight = stock.height;
        let copper = this.bb.copper;
        let oldMarginX = copper.min.x;
        let oldMarginY = copper.min.y
        let copperSize = copper.size();

        const mmFIXED_MARGIN = 2;

        // console.log('Calculating positioning transform for stock: ', stock)
        // console.log('master bb: ', this.bb.master);
        // console.log('copper bb: ', this.bb.copper);
        // console.log('Copper size: ', copperSize);
        
        switch (boardPosition) {

           case BOARD_POSITIONS.NATURAL: {
              // No transforms necessary...
           }
           break;


           case BOARD_POSITIONS.CENTER_BOTTOM: {
                let newMarginX = (stockWidth - copperSize.x) / 2;
                let newTransform = compose(
                    translate(-oldMarginX, 0),
                    translate(newMarginX, 0)
                );

                this.addTransform(newTransform);
            }
            break;


            case BOARD_POSITIONS.CENTER_ALL: {
                let newMarginX = (stockWidth - copperSize.x) / 2;
                let newMarginY = (stockHeight - copperSize.y) / 2;

                let newTransform = compose(
                    translate(-oldMarginX, -oldMarginY),
                    translate(newMarginX, newMarginY)
                );

                this.addTransform(newTransform);
            }
            break;


            case BOARD_POSITIONS.ROTATE_UR: {

                let dx = stockWidth - copperSize.y - mmFIXED_MARGIN;
                let dy = stockHeight - copperSize.x - mmFIXED_MARGIN*2;

                let newTransform = compose(
                    translate(-oldMarginY, -oldMarginX),
                    translate(dx, dy),
                );

                this.addTransform(newTransform);

                await this.rotate90(true);
            }
            break;


            case BOARD_POSITIONS.ROTATE_CENTER_RIGHT: {

                let dx = stockWidth - copperSize.y - mmFIXED_MARGIN;
                let dy = (stockHeight - copperSize.x) / 2;

                let newTransform = compose(
                    translate(-oldMarginY, -oldMarginX),
                    translate(dx, dy),
                );

                this.addTransform(newTransform);

                await this.rotate90(true);
            }
            break;


            case BOARD_POSITIONS.ROTATE_CENTER_ALL: {

                let dx = (stockWidth - copperSize.y) / 2;
                let dy = (stockHeight - copperSize.x) / 2;

                let newTransform = compose(
                    translate(-oldMarginY, -oldMarginX),
                    translate(dx, dy),
                );

                this.addTransform(newTransform);

                await this.rotate90(true);

            }
            break;

        }
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
    
        // By default, assume explicit coordinates (numbers already include a decimal point)
        let implicitMode = false;
        let scaleFactor = 1;  // Default: no scaling
    
        function parseCoord(line, ndxStart, ndxEnd) {
            if (ndxStart >= 0) {
                let str = line.substring(ndxStart + 1, ndxEnd);
                let val;
                // If the coordinate string already includes a decimal point,
                // or if we are not in implicit mode, parse it directly.
                if (str.indexOf('.') >= 0 || !implicitMode) {
                    val = parseFloat(str);
                } else if (implicitMode) {
                    // In implicit mode the file omits the decimal point.
                    // Divide by the scaleFactor determined from the header.
                    val = parseFloat(str) / scaleFactor;
                }
                return val;
            }
            return null;
        }
    
        function fmtCoord(prefix, val) {
            return (val != null) ? (prefix + val.toFixed(2)) : '';
        }
    
        function transformLine(line) {
            const ndxY = line.indexOf('Y');
            const x = parseCoord(line, 0, ndxY);
            const y = parseCoord(line, ndxY, line.length);
            const point = applyToPoint(matrixXY, { x, y });
            return fmtCoord('X', point.x) + fmtCoord('Y', point.y);
        }
    
        try {
            const fileStream = fs.createReadStream(inputFileName);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });
            const out = fs.createWriteStream(outputFileName);
    
            for await (const line of rl) {
                // Process header lines (i.e. lines starting with METRIC)
                // Some DRL files include a suppression indicator (TZ or LZ) plus a numeric format string,
                // while others simply include "METRIC" or "METRIC,000.000".
                if (line.startsWith('METRIC')) {
                    // Split the header on commas
                    const tokens = line.split(',').map(t => t.trim());
                    // Reset default assumptions if a header is seen
                    implicitMode = false;
                    scaleFactor = 1;
                    tokens.forEach(token => {
                        if (token === 'TZ' || token === 'LZ') {
                            implicitMode = true;
                        } else if (/^\d+\.\d+$/.test(token)) {
                            // If a numeric format token is present, extract the number of decimals.
                            // For example, "000.000" implies 3 decimal places.
                            const decimals = token.split('.')[1].length;
                            scaleFactor = Math.pow(10, decimals);
                            // If no explicit suppression token was provided, we assume explicit decimals.
                            // (Most explicit DRL files already include decimals in the coordinate values.)
                        }
                    });
                }
                
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
            console.error('Error during _transformDrl: ', err);
        }
    }
}

module.exports = GerberTransforms;