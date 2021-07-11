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
      ipcMain.handle('fileloader-load-svg', (event, data) => {
         let { profile, callbackEvt } = data;
         ProjectLoader.prepareForWork(profile)
            .then(results => {
               thiz.loadGerberAsSvg(results.gbr, profile, callbackEvt);
            });
      });

      ipcMain.handle('fileloader-load-holes', (event, data) => {
         let { profile, callbackEvt } = data;
         ProjectLoader.prepareForWork(profile)
            .then(results => {
               thiz.loadDrillFile(results.drl, profile, callbackEvt);
            });
      });


    }


    loadGerberAsSvg(fileName, profile, callbackEvt) {

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
     
     

    loadDrillFile(fileName, profile, callbackEvt) {
         this.drillData = new GerberData([fileName]);
         let thiz = this;
         this.drillData.on('ready', () => {
            let drillLoadInfo = { "holes": thiz.drillData.holes, 
                                  "boundingBox": thiz.drillData.boundingBox, 
                                  "units": thiz.drillData.units,
                                  "drillSide": profile.state.side };

            thiz.ipcSend(callbackEvt, drillLoadInfo);
         });
    }
    
}

module.exports = FileLoader;

