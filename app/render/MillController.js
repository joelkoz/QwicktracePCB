"use strict"

const { ipcRenderer } = require('electron')

import { AlignmentController } from './AlignmentController.js';



class MillController extends AlignmentController {

    constructor(config) {

        super('mill');

        let thiz = this;
        this.config = config;

        // Tell UI controller to call to our start method
        // when dispatching to a process action.
        window.uiDispatch.mill = (profile) => {
            thiz.startMillWizard(profile);
        }        

        // Tell UI controller to call our cancel
        // method if a request to cancel the active
        // process comes in
        window.uiCancelProcess.mill = () => {
            thiz.cancelProcesses();
        }

        // Define 'callback dispatch' code that receives messages
        // from the main process
        ipcRenderer.on('mill-origin-set', (event, actualStock) => {
            thiz.setMillOrigin(actualStock);
        });


        ipcRenderer.on('mill-zprobe-set', (event, mpos) => {
            thiz.setZProbeResult(mpos);
        });        

        ipcRenderer.on('mill-autolevel-probe-count', (event, probeCount) => {
           thiz.setAutolevelProbeCount(probeCount);
        });      

        ipcRenderer.on('mill-autolevel-probe-num', (event, probeNum) => {
          thiz.setAutolevelProbeNum(probeNum);
       });           
    }



    startMillWizard(profile) {
        this.activeProfile = profile;

        let thiz = this;
        let ui = window.uiController;

        let wizard = {
            title: "Mill PCB",
            cancelLandingPage: "actionPage",
            steps: [

                { id: "loadMill",
                  subtitle: "Load Mill",
                  instructions: "Load mill with PCB stock and bit used for milling.  Press Continue when done",
                  buttonDefs: [
                     { label: "Continue", next: true },
                     { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wizStep) => {
                      if (thiz.activeProfile.state.stockIsBlank || 
                         !thiz.activeProfile.state.alignStock) {
                         ui.publish('cnc-load-pcb')
                      }
                      else {
                          ui.wizardNext();
                      }
                  }
                },
        
        
       
                { id: "connectZProbe",
                  subtitle: "Z Probe",
                  instructions: "Load milling bit and connect zprobe to it. Press Continue when ready",
                  buttonDefs: [
                     { label: "Continue", next: true, btnClass: 'zProbeContinue' },
                     { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wizStep) => {
                    function updateBtnContinue() {
                        if (window.cncZProbe) {
                           // We can not continue if ZProbe is currently "pressed"
                           $('#wizardPage .zProbeContinue').css("display", "none");
                        }
                        else {
                            // Enable continue button
                            $('#wizardPage .zProbeContinue').css("display", "block");
                        }
                    }
                    wizStep.timerId = setInterval(updateBtnContinue, 1000);
                    updateBtnContinue();
                  },
                  onDeactivate: (wizStep) => {
                    clearInterval(wizStep.timerId);
                  }
                },
        

                { id: "posZProbe",
                  subtitle: "Z Probe",
                  instructions: "Use joystick to position spindle approx 2 to 3 mm over ZPad and press Continue",
                  buttonDefs: [
                     { label: "Continue", next: true },
                     { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wizStep) => {
                     ui.publish('cnc-zpad-position')
                  },
                  onDeactivate: (wizStep) => {
                    thiz.clearJog()
                  }                  
                },                
        
                { id: "zprobe",
                  subtitle: "Z Probe",
                  instructions: "Searching for PCB surface. Standby...",
                  buttonDefs: [
                    { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wizStep) => {
                    ui.publish('cnc-probe-z', { callbackName: 'mill-zprobe-set', profile })
                  }
                },

                

                { id: "findLL",
                  subtitle: "Locate Lower Left Corner",
                  instructions: "Position the laser at the lower left corner of the board then click joystick",
                  buttonDefs: [
                     { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wizStep) => {
                      ui.publish('cnc-find-work-origin', { callbackName: 'mill-origin-set', profile } )
                  }
                },
        
                { id: "autolevel-start",
                  subtitle: "Autolevel",
                  instructions: "Ready to start autolevel",
                  buttonDefs: [
                     { label: "Start", fnAction: () => { ui.wizardNext() } },
                     { label: "Skip", fnAction: () => { ui.gotoWizardPage('removeProbe') } },                  
                     { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ]
                },
        
                { id: "autolevel",
                  subtitle: "Autolevel",
                  instructions: "Gathering surface data for auto leveling...",
                  buttonDefs: [
                    { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wizStep) => {
                      ui.publish('cnc-autolevel', { callbackName: 'ui-wizard-next', profile })
                  }
                },
        
        
                { id: "removeProbe",
                  subtitle: "Ready to mill",
                  instructions: "Remove probe from bit and return to its original mount.",
                  buttonDefs: [
                    { label: "Start mill", next: true, btnClass: 'removeProbeContinue' },
                    { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wizStep) => {

                    function updateBtnContinue() {
                      if (window.cncZProbe) {
                          // We can not continue if ZProbe is currently "pressed"
                          $('#wizardPage .removeProbeContinue').show();
                       }
                       else {
                          // Enable continue button
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
        
                { id: "mill",
                  subtitle: "Milling",
                  instructions: "Milling PCB",
                  buttonDefs: [
                    { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }
                  ],
                  onActivate: (wizStep) => {
                    ui.publish('cnc-mill-pcb', { callbackName: 'ui-process-done', profile })
                  }
                }
            ]
        }
        
        window.uiController.startWizard(wizard);
    }

    setMillOrigin(actualStock) {
        this.activeProfile.stock.actual = actualStock;
        console.log('Mill origin set. Actual stock: ', actualStock);
        window.uiController.wizardNext();
    }


    setZProbeResult(mpos) {
        this.mposZprobe = mpos;
        window.uiController.wizardNext();
    }

    updateUiProbeStatus() {
       window.setWizardStatusText(`Probing ${this.probeNum} of ${this.probeCount}`)
    }

    setAutolevelProbeCount(probeCount) {
      this.probeCount = probeCount;
      this.probeNum = 1;
      this.updateUiProbeStatus()
    }

    setAutolevelProbeNum(probeNum) {
      this.probeNum = probeNum
      this.updateUiProbeStatus();
    }

    clearJog() {
      ipcRenderer.invoke('cnc-cancel', this.activeProfile);
    }

    cancelProcesses() {
        ipcRenderer.invoke('cnc-cancel', this.activeProfile);
        window.uiController.cancelWizard();
        delete this.activeProfile;
    }
}

export  { MillController };
