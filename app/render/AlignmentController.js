"use strict"

const { ipcRenderer } = require('electron')

import { GerberCanvas } from './GerberCanvas.js';
import { RPCClient } from './RPCClient.js'

class AlignmentController extends RPCClient {

    constructor(rpcPrefix) {

        super(rpcPrefix)

        this.gerberCanvas = new GerberCanvas(rpcPrefix);

        let thiz = this;
        ipcRenderer.on(`${this.rpcPrefix}-svg-loaded`, (event, renderObj) => {
            thiz.gerberCanvas.reset();
            thiz.gerberCanvas.setSVG(renderObj, thiz.profile);
            ui.showPage(`alignPage`, false);

            // Request the holes also...
            thiz.loadHoles(thiz.profile);
        });

        ipcRenderer.on(`${this.rpcPrefix}-holes-loaded`, (event, drillObj) => {
            thiz.gerberCanvas.setHoles(drillObj, thiz.profile);
            if (thiz.profile.state.alignStock) {
                thiz.gerberCanvas.initAlignment(thiz.fnAlignmentComplete);
            }
        });

    }

    startAlignment(profile, fnAlignmentComplete) {
        window.uiMouseHandler = this;
        this.fnAlignmentComplete = fnAlignmentComplete;
        this.profile = profile;
        let callbackEvt = `${this.rpcPrefix}-svg-loaded`;
        Object.assign(profile, { traceColor: GerberCanvas.TRACE_COLOR });
        ipcRenderer.invoke('fileloader-load-svg', { profile, callbackEvt })
    }


    loadHoles(profile) {
        let callbackEvt = `${this.rpcPrefix}-holes-loaded`;
        ipcRenderer.invoke('fileloader-load-holes', { profile, callbackEvt })
    }

    mouseDown(mouseCoord) {
        this.gerberCanvas.mouseDown(mouseCoord);
    }

}

export  { AlignmentController };
