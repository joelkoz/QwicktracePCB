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
const { untilEvent } = require('../common/promise-utils/index.js');

class FileLoader extends MainSubProcess {

    constructor(win) {

      super(win, 'files');

      let thiz = this;
      this.rpcAPI( {

         async loadSVG(profile) {
            let results = await ProjectLoader.prepareForWork(profile);
            let svgObj = await thiz.loadGerberAsSvg(results.gbr, profile);
            return svgObj;
         },


         async loadDrillInfo(profile) {
            let results = await ProjectLoader.prepareForWork(profile);
            let drillObj = await thiz.loadDrillFile(results.drl, profile);
            return drillObj;
         }

      });
    }


    async loadGerberAsSvg(fileName, profile) {

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
            await untilEvent(converter, 'end', 8000);

            let obj = {
               "width": converter.width,
               "height": converter.height,
               "viewBox": converter.viewBox,
               "units": converter.units,
               "svg": buffer,
               "profile": profile
            };

            console.log('SVG render complete');
            return obj;
      }
      catch (err) {
         console.error(`Error loading GBR file ${fileName}`, err);
         return new Error(`Error loading GBR file ${fileName}`, { cause: err });
      }      
    }
     

    async loadDrillFile(fileName, profile, callbackEvt) {
         this.drillData = new GerberData([fileName]);
         let thiz = this;
         await untilEvent(this.drillData, 'ready', 8000);
         let drillLoadInfo = { "holes": thiz.drillData.holes, 
                               "boundingBox": thiz.drillData.boundingBox, 
                               "units": thiz.drillData.units,
                               "drillSide": profile.state.side };
         return drillLoadInfo;
   }
    
}

module.exports = FileLoader;

