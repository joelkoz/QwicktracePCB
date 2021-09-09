"use strict"
import { AlignmentController } from './AlignmentController.js';
import { RenderMQ } from './RenderMQ.js'


class DrillController extends AlignmentController {

    constructor() {

        super('drill');

        let thiz = this;
        
        // Tell UI controller to call to our start method
        // when dispatching to a process action.
        window.uiDispatch.drill = (profile) => {
            thiz.startDrillWizard(profile);
        }        

        // Tell UI controller to call our cancel
        // method if a request to cancel the active
        // process comes in
        window.uiCancelProcess.drill = () => {
            thiz.cancelWizard();
        }

        RenderMQ.on('render.cnc.drillCount', (probeCount) => {
           thiz.setDrillCount(probeCount);
        });      

        RenderMQ.on('render.cnc.drillNum', (probeNum) => {
          thiz.setDrillNum(probeNum);
       });         
    }


    startDrillWizard(profile) {
        this.activeProfile = profile;

        let thiz = this;
        let ui = window.uiController;
    }

    
    updateUiDrillStatus() {
        window.setWizardStatusText(`Probing ${this.probeNum} of ${this.probeCount}`)
     }
 
     setDrillCount(probeCount) {
       this.probeCount = probeCount;
       this.probeNum = 1;
       this.updateUiDrillStatus()
     }
 
     setDrillNum(probeNum) {
       this.probeNum = probeNum
       this.updateUiDrillStatus();
     }
 
     cancelWizard() {
         this.rpCall('cnc.cancelProcesses');
         this.rpcClearAll();
         window.uiController.cancelWizard();
         delete this.activeProfile;
     }
 
     finishWizard() {
         this.rpCall('cnc.cancelProcesses');
         this.rpcClearAll();
         window.uiController.finishWizard();
     }
}

export  { DrillController };
