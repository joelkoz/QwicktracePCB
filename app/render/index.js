"use strict"
import { ExposeController } from './ExposeController.js'
import { UIController } from './UIController.js'
import { DrillController } from './DrillController.js';
import { MillController } from './MillController.js';
import { PositionController } from './PositionController.js';
import { SettingsController } from './SettingsController.js';
import { RenderMQ } from './RenderMQ.js';

document.addEventListener('keydown', (event) => {

    if (event.code == "KeyD") {
      RenderMQ.emit('main.app.toggleDebugger');
    }
 
 
    if (event.code == "KeyR") {
       uiController.showPage(appConfig.ui.startPageId);
    }

    if (event.code == "KeyX") {
      RenderMQ.emit('main.app.exit');
   }
   
});

 
RenderMQ.on('render.startup.initialize', (config) => {
   window.appConfig = config;
   window.Config = config;
   window.uiDispatch = {};
   window.uiController = new UIController(config);
   window.uiExpose = new ExposeController(config);
   window.uiDrill = new DrillController(config);
   window.uiMill = new MillController(config);
   window.uiPos = new PositionController(config)
   window.uiSettings = new SettingsController(config);
   window.RenderMQ = RenderMQ;
   window.wcsMACHINE_WORK = 0;
   window.wcsPCB_WORK = 1;
   window.wcsPCB_RELATIVE_UR = 99;
   RenderMQ.emit('main.startup.initializeDone');
});


window.cncAvailable = false;
RenderMQ.on('render.cnc.state', (state) => {
   window.cncAvailable = (state === 'Idle');
});


RenderMQ.on('render.cnc.zprobe', (state) => {
   window.cncZProbe = state;
});

RenderMQ.on('render.cnc.pos', (pos) => {
   window.cncPos = pos;
})

RenderMQ.on('render.cnc.laser', (state) => {
   window.cncLaser = state;
});


RenderMQ.on('render.cnc.jog', (jog) => {
   window.cncJog = jog;
})


RenderMQ.on('global.config.load', (config) => {
   window.appConfig = config;
   window.Config = config;
   console.log('New configuration loaded: ', config)
});

RenderMQ.emit('main.startup.renderReady');
