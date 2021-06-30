"use strict"

const { ipcRenderer } = require('electron')
import { ExposeController } from './ExposeController.js'
import { UIController } from './UIController.js'
import { DrillController } from './DrillController.js';
import { MillController } from './MillController.js';

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
   window.appConfig = config;
   window.uiExpose = new ExposeController(config);
   window.uiController = new UIController(config);
   window.uiDrill = new DrillController(config);
   window.uiMill = new MillController(config);
   ipcRenderer.invoke('render-start-done');
});


window.cncAvailable = false;
ipcRenderer.on('render-cnc-state', (event, state) => {
   window.cncAvailable = (state === 'Idle');
});


ipcRenderer.invoke('render-ready');
