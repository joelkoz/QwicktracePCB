"use strict"

const { ipcRenderer } = require('electron')
import { UVMask } from './UVMask.js'
import { UIController } from './UIController.js'


var uvMask = null;
var uiController = null;
var appConfig = null;

document.addEventListener('keydown', (event) => {

    if (event.code == "KeyD") {
      ipcRenderer.invoke('toggle-debugger');
    }
 
 
    if (event.code == "KeyX") {
       uiController.showPage("page1");
    }
 
});

 
ipcRenderer.on('render-start', (event, config) => {
   appConfig = config;
   uvMask = new UVMask(config);
   uiController = new UIController(appConfig);
   ipcRenderer.invoke('render-start-done');
});


ipcRenderer.invoke('render-ready');
