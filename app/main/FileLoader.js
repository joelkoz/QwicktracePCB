const { ipcMain } = require('electron')

const fs = require('fs');
const gerberToSvg = require('gerber-to-svg');
const path = require('path');
const fastXmlParser = require("fast-xml-parser");
const unitsParser = require('units-css');

const MainSubProcess = require('./MainSubProcess.js');
const GerberData = require('./pcb/GerberData.js');
const ProjectLoader = require('./ProjectLoader.js');

const MainMQ = require('./MainMQ.js');

class FileLoader  extends MainSubProcess {

    constructor(win) {

      super(win);

      let thiz = this;
      ipcMain.handle('fileloader-load', (event, data) => {
         thiz.loadFile(data);
      });

    }


    loadGerberFile(fileName, profile, callbackEvt) {

        console.log(`Creating SVG from Gerber file ${fileName}`);
     
        let strmGerber = fs.createReadStream(fileName);
     
        let options = {
            attributes: {
               color: (profile.traceColor ? profile.traceColor : 'black')
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
            thiz.ipcSend(callbackEvt, obj);
         });
      }
      catch (err) {
         console.log(`Error loading GBR file ${fileName}`);
         console.error(err);
      }      
    }
     
    
    loadSvgFile(fileName, profile, callbackEvt) {
     
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
            thiz.ipcSend(callbackEvt, obj);
        }
        catch (err) {
           console.log(`Error parsing SVG file ${fileName}`);
           console.error(err);
        }
       });
    }
     
     

    loadDrillFile(fileName, profile, callbackEvt) {
         this.drillData = new GerberData([fileName]);
         let thiz = this;
         this.drillData.on('ready', () => {

            if (profile.drillSide === 'bottom') {
               thiz.drillData.mirror();
            }

            let drillLoadInfo = { "holes": thiz.drillData.holes, 
                                  "boundingBox": thiz.drillData.boundingBox, 
                                  "units": thiz.drillData.units,
                                  "drillSide": profile.drillSide };

            thiz.ipcSend(callbackEvt, drillLoadInfo);
         });
    }


    loadFile({fileDef, profile, callbackEvt}) {

        let fileName = ProjectLoader.getFileName(fileDef.projectId, fileDef.side);

        let ext = path.extname(fileName);
         
        if (fileDef.side  === 'drill') {
            this.loadDrillFile(fileName, profile, callbackEvt);
        }
        else {
           this.loadGerberFile(fileName, profile, callbackEvt);
        }
    }

}

module.exports = FileLoader;

