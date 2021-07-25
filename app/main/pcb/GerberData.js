const EventEmitter = require('events')
const fs = require('fs')
const gerberParser = require('gerber-parser')
const whatsThatGerber = require('whats-that-gerber')

const BoundingBox = require('./BoundingBox.js');

// Example of what parsing gerber drill file looks like:
// {"type":"tool","line":8,"code":"1","tool":{"shape":"circle","params":[0.4],"hole":[]}}
// repeat:
//    {"type":"set","line":17,"prop":"tool","value":"1"}
//    repeat:
//      {"type":"op","line":18,"op":"flash","coord":{"x":28,"y":27.75}}
// {"type":"set","line":114,"prop":"tool","value":"0"}
// {"type":"done","line":115}


class GerberData extends EventEmitter {

    constructor(fileNames) {
        super();
        this.tools = new Map();
        this.boundingBoxes = {
            master: new BoundingBox(),
            drill: new BoundingBox(),
            corners: new BoundingBox(),
            copper: {
                top: new BoundingBox(),
                bottom: new BoundingBox(),
                both: new BoundingBox()
            }
        }
        this.fileList = [];
        if (fileNames) {
            this.loadFiles(fileNames);
        }
    }

    get size() {
        return this.boundingBoxes.master.size();
    }

    get copperSize() {
        return this.boundingBoxes.copper.both.size();
    }

    mirror() {
        let min = this.boundingBox.master.min;
        let max = this.boundingBox.master.max;
        let shiftX = min.x + max.x;
        if (this.holes) {
           this._mirror(this.holes, shiftX);
        }
        if (this.corners) {
            this._mirror(this.corners, shiftX);
        }
    }

    _mirror(list, shiftX) {
        list.forEach(entry => {
            entry.coord.x = -entry.coord.x + shiftX;
        });
    }


    loadDrillFile(fileName) {

        console.log(`Processing drill file ${fileName}`);
        let parser = gerberParser()

        parser.on('warning', function(w) {
          // console.warn('warning at line ' + w.line + ': ' + w.message)
        })

        this.holes = [];
        this.currentTool = null;
        const toolPrefix = "drl-";
        this.bbLocal = this.boundingBoxes.drill;

        let thiz = this;
        fs.createReadStream(fileName)
           .pipe(parser)
           .on('data', function(data) {

            let dType = data.type;

            switch (dType) {
                case "tool":
                   let toolCode = toolPrefix + data.code;
                   let toolDef = data.tool;
                   toolDef.code = toolCode;
                   thiz.tools.set(toolCode, toolDef); 
                   break;

                case "set":
                   if (data.prop === 'tool') {
                        let toolCode = toolPrefix + data.value;
                        thiz.currentTool = thiz.tools.get(toolCode);
                   }
                   else if (data.prop === 'units') {
                       thiz.units = data.value;
                   }

                   break;

                case "op":
                   if (data.op === 'flash') {
                       let coord = data.coord;
                       thiz.holes.push({ tool: thiz.currentTool, coord });
                       thiz.checkCoord(coord);
                   }
                   break;

                case "done":
                    thiz.nextFile();
                    break;

            }

           })
    }

    loadEdgeCuts(fileName) {

        console.log(`Processing edge file ${fileName}`);
        let parser = gerberParser()

        parser.on('warning', function(w) {
          // console.warn('warning at line ' + w.line + ': ' + w.message)
        })

        this.corners = [];
        this.currentTool = null;
        const toolPrefix = "edg-";
        this.bbLocal = this.boundingBoxes.corners;

        let thiz = this;
        fs.createReadStream(fileName)
           .pipe(parser)
           .on('data', function(data) {

            let dType = data.type;

            switch (dType) {
                case "tool":
                   let toolCode = toolPrefix + data.code;
                   let toolDef = data.tool;
                   toolDef.code = toolCode;
                   thiz.tools.set(toolCode, toolDef); 
                   break;

                case "set":
                   if (data.prop === 'tool') {
                        let toolCode = toolPrefix + data.value;
                        thiz.currentTool = thiz.tools.get(toolCode);
                   }
                   else if (data.prop === 'units') {
                       thiz.units = data.value;
                   }

                   break;

                case "op":
                   if (data.op === 'move') {
                       let coord = data.coord;
                       thiz.corners.push({ tool: thiz.currentTool, coord });
                       thiz.checkCoord(coord)
                   }
                   break;

                case "done":
                    thiz.nextFile();
                    break;
            }

        })

    }


    loadTraces(fileName, side) {

        console.log(`Processing copper side ${side} in file ${fileName}`)
        let parser = gerberParser()

        parser.on('warning', function(w) {
          // console.warn('warning at line ' + w.line + ': ' + w.message)
        })

        let thiz = this;
        this.bbLocal = this.boundingBoxes.copper[side];
        fs.createReadStream(fileName)
           .pipe(parser)
           .on('data', function(data) {

            let dType = data.type;
            switch (dType) {
                case "set":
                   if (data.prop === 'units') {
                       thiz.units = data.value;
                   }

                   break;
                case "op":
                   if (data.coord) {
                       let coord = data.coord;
                       thiz.checkCoord(coord)
                   }
                   break;

                case "done":
                    thiz.nextFile();
                    break;
            }

        })

    }

    nextFile() {
       if (this.fileList.length > 0) {
          let fileName = this.fileList.pop();
          let aType = whatsThatGerber([fileName]);
          let gType = aType[fileName];
          switch (gType.type) {
              case 'drill':
                  this.loadDrillFile(fileName);
                  break;
              case 'outline':
                  this.loadEdgeCuts(fileName);
                  break;
              case 'copper':
                  this.loadTraces(fileName, gType.side);
                  break;
          }
       }
       else {
           console.log('Done loading Gerber data')

            this.calcFinalSizes()

           this.emit('ready');
       }
    }


    calcFinalSizes() {
        let bb = this.boundingBoxes;

        if (!bb.corners.valid()) {
            // Edge cuts were not found.  Simulate
            // a rectangle by assuming the margin from (0,0)
            // to actual LL is the same from actual UR to missing max corner.
            let marginX = bb.master.min.x;
            let marginY = bb.master.min.y;
            let urCornerX = bb.master.max.x + marginX;
            let urCornerY = bb.master.max.x + marginY;
            bb.corners.min.x = 0;
            bb.corners.min.y = 0;
            bb.corners.max.x = urCornerX;
            bb.corners.max.y = urCornerY;
            bb.master.checkCoord(bb.corners.min);
            bb.master.checkCoord(bb.corners.max);
        }

        let copper = this.boundingBoxes.copper;

        if (copper.bottom.valid()) {
            copper.both.checkCoord(copper.bottom.min);
            copper.both.checkCoord(copper.bottom.max);
        }

        if (copper.top.valid()) {
            copper.both.checkCoord(copper.top.min);
            copper.both.checkCoord(copper.top.max);
        }
    }

    addFile(fileName) {
        this.fileList.push(fileName);
    }

    addFiles(fileNames) {
        let thiz = this;
        fileNames.forEach(fileName => {
            thiz.fileList.push(fileName);
        });
    }

    loadFiles(fileNames) {
        if (fileNames) {
           this.addFiles(fileNames);
        }
        this.nextFile();
    }

    async loadFilesAsync(fileNames) {
        await new Promise((resolve, reject) => {
            this.once('ready', resolve);
            this.loadFiles(fileNames);
        });
    }

    checkCoord(coord) {
        this.boundingBoxes.master.checkCoord(coord);
        this.bbLocal.checkCoord(coord);
    }
}

module.exports = GerberData;