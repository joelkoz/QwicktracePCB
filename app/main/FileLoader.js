const { ipcMain } = require('electron')

const fs = require('fs');
const gerberToSvg = require('gerber-to-svg');
const whatsThatGerber = require('whats-that-gerber')
const gerbValid = require('whats-that-gerber').validate;
const path = require('path');
const fastXmlParser = require("fast-xml-parser");
const unitsParser = require('units-css');
const units = require('units-css/lib');

const dropDir = "./pcb-files/";

const MainSubProcess = require('./MainSubProcess.js');
const GerberData = require('./GerberData.js');

const MainMQ = require('./MainMQ.js');

class FileLoader  extends MainSubProcess {

    constructor(win) {

      super(win);

      this.lastFileSyncMs = 0;

      let thiz = this;
      ipcMain.handle('fileloader-load', (event, data) => {
         thiz.loadFile(data.file, data.profile);
      });

       // Do a file list refresh now...
      this.refreshFileList();

       // And every 6 seconds after this...
      setInterval(() => { thiz.refreshFileList(); }, 6000);
    }



    loadGerberFile(fileName, profile) {

        console.log(`Creating SVG from Gerber file ${fileName}`);
     
        let strmGerber = fs.createReadStream(fileName);
     
        let options = {
            attributes: {
               color: 'black'
            }
        };
     
        try {
         let converter = gerberToSvg(strmGerber, options);
      
         let buffer = '';
      
         converter.on('data', (chunk) => {
            buffer += chunk;
         });
      
         let thiz = this;        
         converter.on('end', () => {
            let obj = {
               "width": converter.width,
               "height": converter.height,
               "viewBox": converter.viewBox,
               "units": converter.units,
               "svg": buffer,
               "profile": profile
            };

            console.log('SVG render complete');
            MainMQ.emit('load-svg', obj);
            thiz.ipcSend('mask-load-svg', obj);
         });
      }
      catch (err) {
         console.log(`Error loading GBR file ${fileName}`);
         console.error(err);
      }      
    }
     
    
    loadSvgFile(fileName, profile) {
     
       console.log(`Loading SVG from ${fileName}`);
     
       let thiz = this;
       fs.readFile(fileName, 'utf8', function(err, buffer) {
         if (err) throw err;
     
         var options = {
           attributeNamePrefix : "",
           attrNodeName: "attr", //default is 'false'
           textNodeName : "#text",
           ignoreAttributes : false,
           ignoreNameSpace : false,
           allowBooleanAttributes : true,
           parseNodeValue : true,
           parseAttributeValue : false,
           trimValues: true,
         };

         try {
            let jxml = fastXmlParser.parse(buffer, options);
      
            let pWidth = unitsParser.parse(jxml.svg?.attr?.width);
            let pHeight = unitsParser.parse(jxml.svg?.attr?.height);
            let sViewBox = jxml.svg?.attr?.viewBox;
      
            let obj = {
               "width": pWidth?.value,
               "height": pHeight?.value,
               "viewBox": sViewBox?.split(' '),
               "units": (pWidth?.unit ? pWidth?.unit : pHeight?.unit),
               "svg": buffer,
               "profile": profile
            };
      
            console.log('SVG loaded');
            MainMQ.emit('load-svg', obj);
            thiz.ipcSend('mask-load-svg', obj);
        }
        catch (err) {
           console.log(`Error parsing SVG file ${fileName}`);
           console.error(err);
        }
       });
    }
     
     

    loadDrillFile(fileName, profile) {
         this.drillData = new GerberData([fileName]);
         let thiz = this;
         this.drillData.on('ready', () => {

            if (profile === 'bottom') {
               thiz.drillData.mirror();
            }

            let drillLoadInfo = { "holes": thiz.drillData.holes, 
                                  "boundingBox": thiz.drillData.boundingBox, 
                                  "units": thiz.drillData.units,
                                  "drillSide": profile };

            MainMQ.emit('load-drill', drillLoadInfo);
            thiz.ipcSend('drill-load', drillLoadInfo);
         });
    }


    loadFile(file, profile) {
        let fileName = file.value;

        let ext = path.extname(fileName);
         
        if (file.gerb.type === 'drill') {
            this.loadDrillFile(dropDir + fileName, profile);
        }
        else if (file.gerb.type === 'copper') {
           this.loadGerberFile(dropDir + fileName, profile);
        }
        else if (ext.toLowerCase() == '.svg') {
           this.loadSvgFile(dropDir + fileName, profile);
        }
        else {
           console.log(`Unknown file type (${ext}) for file ${fileName}`);
        }
    }
     

    refreshFileList() {
      let thiz = this;
      fs.readdir(dropDir, (err, files) => {
          let msLastSync = this.lastFileSyncMs;
          files.forEach(file => {
            let fileName = dropDir + file;
            fs.stat(fileName, false, (err, fstat) => {
               if (fstat.mtimeMs > msLastSync) {
                  let fileObj = {};
                  fileObj.value = path.basename(file);
                  fileObj.mtimeMs = fstat.mtimeMs;

                  let aType = whatsThatGerber([fileName]);
                  let gType = aType[fileName];
                  if (gerbValid(gType)) {
                     fileObj.gerb = gType;
                  }

                  thiz.ipcSend('ui-file-update', fileObj);
               }
            });
          });
          this.lastFileSyncMs = Date.now();
      });  
    }     
}

module.exports = FileLoader;

