"use strict"

const { ipcRenderer } = require('electron')

import { GerberCanvas } from './GerberCanvas.js';


class AlignmentController {

    constructor(actionPrefix) {

        this.actionPrefix = actionPrefix;

        this.gerberCanvas = new GerberCanvas(`${actionPrefix}-canvas`, `${actionPrefix}-align-instructions`);

        let thiz = this;
        ipcRenderer.on(`${this.actionPrefix}-svg-loaded`, (event, renderObj) => {
            thiz.gerberCanvas.reset();
            thiz.gerberCanvas.setSVG(renderObj);
            ui.showPage(`${thiz.actionPrefix}AlignPage`, false);

            // Request the holes also...
            thiz.loadHoles(thiz.profile);
        });

        ipcRenderer.on(`${this.actionPrefix}-holes-loaded`, (event, drillObj) => {
            thiz.gerberCanvas.setHoles(drillObj);
            if (thiz.profile.state.initStock) {
                thiz.gerberCanvas.initAlignment(this.fnAlignmentComplete);
            }
        });

    }

    startAlignment(profile, fnAlignmentComplete) {
        this.fnAlignmentComplete = fnAlignmentComplete;
        this.profile = profile;
        let callbackEvt = `${this.actionPrefix}-svg-loaded`;
        Object.assign(profile, { traceColor: GerberCanvas.TRACE_COLOR });
        ipcRenderer.invoke('fileloader-load-svg', { profile, callbackEvt })
    }


    loadHoles(profile) {
        let callbackEvt = `${this.actionPrefix}-holes-loaded`;
        ipcRenderer.invoke('fileloader-load-holes', { profile, callbackEvt })
    }

    mouseDown(mouseCoord) {
        this.gerberCanvas.mouseDown(mouseCoord);
    }

}

export  { AlignmentController };
