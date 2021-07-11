"use strict"

const { ipcRenderer } = require('electron')

import { AlignmentController } from './AlignmentController.js';


class DrillController extends AlignmentController {

    constructor(config) {

        super('drill');

        let thiz = this;
        window.uiDispatch.drill = (profile) => {
            thiz.prepareDrill(profile);
        }        

        window.uiCancelProcess.drill = () => {
            thiz.cancelProcesses();
        }        
    }

    prepareDrill(profile) {
        this.startAlignment(profile, (deskew) => { 
            profile.deskew = deskew;
            window.uiController.showPage('drillStartPage');
        });
    }

    
    cancelProcesses() {
        ipcRenderer.invoke('cnc-cancel');
    }
}

export  { DrillController };
