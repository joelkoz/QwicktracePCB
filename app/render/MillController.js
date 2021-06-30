"use strict"

const { ipcRenderer } = require('electron')

import { GerberCanvas } from './GerberCanvas.js';


class MillController {

    constructor(config) {

        this.gerberCanvas = new GerberCanvas('mill-canvas', 'mill-align-instructions');

        let thiz = this;
        ipcRenderer.on('mill-load-svg', (event, renderObj) => {
            thiz.gerberCanvas.reset();
            thiz.gerberCanvas.setSVG(renderObj);
            ui.showPage('millAlignPage', false);

            // Request the holes also...
            thiz.loadHoles();
        });

        ipcRenderer.on('mill-hole-load', (event, drillObj) => {
            thiz.gerberCanvas.setHoles(drillObj);
        });

    }



    prepareMill() {
        let state = window.uiController.state;
        let projectId = state.projectId;
        let fileDef = { projectId, "side": state.side };
        let callbackEvt = "mill-load-svg";
        let profile = { traceColor: GerberCanvas.TRACE_COLOR };
        ipcRenderer.invoke('fileloader-load', { fileDef, profile, callbackEvt })
    }


    loadHoles() {
        let state = window.uiController.state;
        let projectId = state.projectId;
        let fileDef = { projectId, "side": 'drill' };
        let callbackEvt = "mill-hole-load";
        let profile = { "drillSide": state.side };
        ipcRenderer.invoke('fileloader-load', { fileDef, profile, callbackEvt })
    }

    mouseDown(mouseCoord) {
        this.gerberCanvas.mouseDown(mouseCoord);
    }


}

export  { MillController };
