"use strict"

const { ipcRenderer } = require('electron')
import { ExposeController } from './ExposeController.js'
import { UIController } from './UIController.js'
import { DrillController } from './DrillController.js';
import { MillController } from './MillController.js';
import { SettingsController } from './SettingsController.js';
import { RenderMQ } from './RenderMQ.js';

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
   window.uiDispatch = {};
   window.uiCancelProcess = {};
   window.uiController = new UIController(config);
   window.uiExpose = new ExposeController(config);
   window.uiDrill = new DrillController(config);
   window.uiMill = new MillController(config);
   window.uiSettings = new SettingsController(config);

   ipcRenderer.invoke('render-start-done');
});


window.cncAvailable = false;
RenderMQ.on('render.cnc.state', (state) => {
   window.cncAvailable = (state === 'Idle');
});


ipcRenderer.on('render-zprobe-state', (event, state) => {
   window.cncZProbe = state;
});


ipcRenderer.invoke('render-ready');
