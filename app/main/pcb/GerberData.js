const EventEmitter = require('events')
const fs = require('fs')
const gerberParser = require('gerber-parser')
const whatsThatGerber = require('whats-that-gerber')


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
        this.boundingBox = { min: { x: 99999, y: 999999}, max: { x:-999999, y:-999999 }}
        this.fileList = [];
        if (fileNames) {
            this.loadFiles(fileNames);
        }
    }

    mirror() {
        let min = this.boundingBox.min;
        let max = this.boundingBox.max;
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
          console.warn('warning at line ' + w.line + ': ' + w.message)
        })

        this.holes = [];
        this.currentTool = null;
        const toolPrefix = "drl-";

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

                default:
                    console.log(`Unrecognized data type ${JSON.stringify(data)}`)
            }

           })
    }

    loadEdgeCuts(fileName) {

        console.log(`Processing edge file ${fileName}`);
        let parser = gerberParser()

        parser.on('warning', function(w) {
          console.warn('warning at line ' + w.line + ': ' + w.message)
        })

        this.corners = [];
        this.currentTool = null;
        const toolPrefix = "edg-";

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

                default:
                    // console.log(`Unrecognized data type ${JSON.stringify(data)}`)
                    console.log(JSON.stringify(data))
            }

        })

    }

    loadTraces(fileName, side) {

        console.log(`Processing copper side ${side} in file ${fileName}`)
        let parser = gerberParser()

        parser.on('warning', function(w) {
          console.warn('warning at line ' + w.line + ': ' + w.message)
        })

        this.traces = [];
        this.currentTool = null;
        const toolPrefix = "trc-";

        let thiz = this;
        fs.createReadStream(fileName)
           .pipe(parser)
           .on('data', function(data) {

            let dType = data.type;

            switch (dType) {
                // case "tool":
                //    let toolCode = toolPrefix + data.code;
                //    let toolDef = data.tool;
                //    toolDef.code = toolCode;
                //    thiz.tools.set(toolCode, toolDef); 
                //    break;

                // case "set":
                //    if (data.prop === 'tool') {
                //         let toolCode = toolPrefix + data.value;
                //         thiz.currentTool = thiz.tools.get(toolCode);
                //    }
                //    else if (data.prop === 'units') {
                //        thiz.units = data.value;
                //    }

                //    break;

                // case "op":
                //    if (data.op === 'move') {
                //        let coord = data.coord;
                //        thiz.corners.push({ tool: thiz.currentTool, coord });
                //        thiz.checkCoord(coord)
                //    }
                //    break;

                case "done":
                    thiz.nextFile();
                    break;

                default:
                    // console.log(`Unrecognized data type ${JSON.stringify(data)}`)
                    console.log(JSON.stringify(data))
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
                  // this.loadTraces(fileName, gType.side);
                  setTimeout(() => { this.nextFile()}, 1)
                  break;
          }
       }
       else {
           console.log('Done loading Gerber data')
           this.emit('ready');
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

    checkCoord(coord) {
        let x = coord.x;
        let y = coord.y;
        let bb = this.boundingBox;

        if (x > bb.max.x) {
            bb.max.x = x;
        }

        if (x < bb.min.x) {
            bb.min.x = x;
        }

        if (y > bb.max.y) {
            bb.max.y = y;
        }

        if (y < bb.min.y) {
            bb.min.y = y;
        }
    }

}

module.exports = GerberData;