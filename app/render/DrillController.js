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

        let wizard = {

            title: "Drill PCB",
            cancelLandingPage: "actionPage",

            steps: [

                { id: "loadMill",
                  subtitle: "Load Mill with PCB",
                  instructions: "Load mill with PCB to drill.  Press Continue when done",
                  buttonDefs: [
                    { label: "Continue", next: true },
                    { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                  ],
                  onActivate: (wizStep) => {
                      if (!ui.skipStockLoading()) {
                          thiz.rpCall('cnc.loadStock')
                      }
                      else {
                          ui.wizardNext();
                      }
                  }
                },

                { id: "alignHoles",
                  subtitle: "Preparing drill files...",
                  instructions: "",
                  buttonDefs: [
                      { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }
                  ],
                  onActivate: async (wizStep) => {
                      function completeDrillAlignment(dresult) {
                          profile.state.deskew = dresult;
                          ui.wizardNext();
                      }

                      if (thiz.activeProfile.state.alignStock) {
                          thiz.startAlignment(profile, completeDrillAlignment);
                      }
                      else {
                          ui.wizardNext();
                      }
                  }
                },


                { id: "connectZProbe",
                  subtitle: "Prepare to zprobe Zpad",
                  instructions: "Load mill with drilling bit. Connect zprobe clip to drilling bit.",
                  buttonDefs: [
                     { label: "Continue", next: true, btnClass: 'zProbeContinue' },
                     { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }
                  ],
                  onActivate: async (wizStep) => {
                    function updateBtnContinue() {
                        if (window.cncZProbe) {
                           // We can not continue if ZProbe is currently "pressed"
                           $('#wizardPage .zProbeContinue').css("display", "none");
                           thiz.setWizardInstructions(wizStep.instructions)                           
                        }
                        else {
                            // Enable continue button
                            thiz.setWizardInstructions('')
                            $('#wizardPage .zProbeContinue').css("display", "block");
                        }
                    }
                    await thiz.rpCall('cnc.goto', window.appConfig.cnc.locations.zpad);
                    wizStep.timerId = setInterval(updateBtnContinue, 1000);
                    updateBtnContinue();
                  },
                  onDeactivate: (wizStep) => {
                    clearInterval(wizStep.timerId);
                  }
                },
        

                { id: "posZProbe",
                  subtitle: "ZPad Probe",
                  instructions: "Use joystick to position spindle approx 2 to 3 mm over Zpad",
                  buttonDefs: [
                     { label: "Continue", next: true },
                     { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                  ],
                    onActivate: async (wizStep) => {
                      await thiz.rpCall('cnc.zPadPosition');
                      await thiz.rpCall('cnc.jogMode', true)
                    },
                    onDeactivate: (wizStep) => {
                      thiz.rpCall('cnc.jogMode', false)
                    }                  
                },                
        
                { id: "zProbePad",
                  subtitle: "ZPad Probe",
                  instructions: "Searching for pad surface. Standby...",
                  buttonDefs: [
                    { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                  ],
                  onActivate: async (wizStep) => {
                    await thiz.rpCall('cnc.zProbePad', false);
                    ui.wizardNext();
                  }
                },

        
                { id: "removeProbe",
                  subtitle: "Ready to drill",
                  instructions: "Remove probe from bit and return it to its original position.",
                  buttonDefs: [
                    { label: "Start drilling", next: true, btnClass: 'removeProbeContinue' },
                    { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                  ],
                  onActivate: (wizStep) => {

                    function updateBtnContinue() {
                      if (window.cncZProbe) {
                          // We can not continue until ZProbe is currently "pressed"
                          $('#wizardPage .removeProbeContinue').show();
                          thiz.setWizardInstructions('Press Continue')
                        }
                       else {
                          // Disable continue button
                          thiz.setWizardInstructions(wizStep.instructions)                           
                          $('#wizardPage .removeProbeContinue').hide();
                       }
                    }

                    wizStep.timerId = setInterval(updateBtnContinue, 1000);
                    updateBtnContinue();
                  },
                  onDeactivate: (wizStep) => {
                    clearInterval(wizStep.timerId);
                  }

                },

                
                { id: "drill",
                  subtitle: "Drilling",
                  instructions: "Drilling PCB",
                  buttonDefs: [
                    { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }
                  ],
                  onActivate: async (wizStep) => {
                      await thiz.rpCall('cnc.drillPCB', profile)
                      await thiz.rpCall('cnc.loadStock')
                      thiz.finishWizard();
                  }
                }
            ]
        }
        
        window.uiController.startWizard(wizard);        
    }

     setWizardStatusText(status) {
       window.setWizardStatusText(status)
     }

     setWizardInstructions(status) {
       window.setWizardInstructions(status)
     }
   
     updateUiDrillStatus() {
        window.setWizardStatusText(`Drilling ${this.probeNum} of ${this.probeCount}`)
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
         window.uiController.cancelWizard();
         this.gerberCanvas.cancelAlignment();
         delete this.activeProfile;
     }
 
     finishWizard() {
         this.rpCall('cnc.cancelProcesses');
         window.uiController.finishProcess();         
         window.uiController.finishWizard();
     }
}

export  { DrillController };
