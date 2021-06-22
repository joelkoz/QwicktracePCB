"use strict"

const { ipcRenderer } = require('electron')
import { UVMask } from './UVMask.js'
import { UIController } from './UIController.js'
import { DrillController } from './DrillController.js';


var uvMask = null;
var uiController = null;
var drillController = null;
var appConfig = null;

document.addEventListener('keydown', (event) => {

    if (event.code == "KeyD") {
      ipcRenderer.invoke('toggle-debugger');
    }
 
 
    if (event.code == "KeyR") {
       uiController.showPage(appConfig.ui.startPageId);
    }

    if (event.code == "KeyX") {
      ipcRenderer.invoke('exit');
   }
   
});

 
ipcRenderer.on('render-start', (event, config) => {
   appConfig = config;
   uvMask = new UVMask(config);
   uiController = new UIController(appConfig);
   drillController = new DrillController(config);
   ipcRenderer.invoke('render-start-done');
});


ipcRenderer.invoke('render-ready');
