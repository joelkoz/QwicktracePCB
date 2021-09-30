"use strict"
import { GerberCanvas } from './GerberCanvas.js';
import { RPCClient } from './RPCClient.js'

class AlignmentController extends RPCClient {

    constructor(rpcPrefix) {

        super(rpcPrefix)

        this.gerberCanvas = new GerberCanvas(rpcPrefix);
    }

    async startAlignment(profile, fnAlignmentComplete) {

        // We are going to get an exact location via alignment,
        // so just estimate the CNC PCB work coordinates for now...
        await this.rpCall('cnc.estimatePCBWorkPos', profile.stock)

        window.uiMouseHandler = this;
        this.fnAlignmentComplete = fnAlignmentComplete;
        this.profile = profile;
        Object.assign(profile, { traceColor: GerberCanvas.TRACE_COLOR });

        let renderObj = await this.rpCall('files.loadSVG', profile);

        this.gerberCanvas.reset();
        this.gerberCanvas.setSVG(renderObj, profile);

        ui.showPage(`alignPage`, false);

        await this.loadHoles(profile);
    }


    async loadHoles(profile) {
        let drillObj = await this.rpCall('files.loadDrillInfo', profile);
        this.gerberCanvas.setHoles(drillObj, profile);
        if (this.profile.state.alignStock) {
            this.gerberCanvas.initAlignment(this.fnAlignmentComplete);
        }
    }

    mouseDown(mouseCoord) {
        this.gerberCanvas.mouseDown(mouseCoord);
    }

}

export  { AlignmentController };
