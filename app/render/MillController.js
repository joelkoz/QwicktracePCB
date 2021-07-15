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
        ipcRenderer.on('mill-origin-set', (event, mpos) => {
            thiz.setMillOrigin(mpos);
        });


        ipcRenderer.on('mill-zprobe-set', (event, mpos) => {
            thiz.setZProbeResult(mpos);
        });        

    }



    startMillWizard(profile) {
        this.activeProfile = profile;

        let thiz = this;
        let ui = window.uiController;

        let wizard = {
            "title": "Mill PCB",
        
            "steps": [
        
                { id: "home",
                  subtitle: "Home",
                  instructions: "Homing mill. Standby...",
                  buttonDefs: [
                    { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wiz) => {
                     ui.publish('cnc-home', { callbackName: 'ui-wizard-next' });
                  }
                },
        
                { id: "loadMill",
                  subtitle: "Load Mill",
                  instructions: "Load mill with PCB stock and bit used for milling.  Press Continue when done",
                  buttonDefs: [
                     { label: "Continue", next: true },
                     { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wiz) => {
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
                  instructions: "Connect zprobe to milling bit then press Continue",
                  buttonDefs: [
                     { label: "Continue", next: true, btnClass: 'zProbeContinue' },
                     { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wiz) => {
                    wiz.timerId = setInterval(() => {
                        if (window.cncZProbe) {
                            // We can not continue if ZProbe is currently "pressed"
                            $('#wizardPage .zProbeContinue').hide();
                        }
                        else {
                            // Enable continue button
                            $('#wizardPage .zProbeContinue').show();
                        }
                    }, 1000);
                  },
                  onDeactivate: (wiz) => {
                    clearInterval(wiz.timerId);
                  }
                },
        
        
                { id: "zprobe",
                  subtitle: "Z Probe",
                  instructions: "Searching for PCB surface. Standby...",
                  buttonDefs: [
                    { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wiz) => {
                    ui.publish('cnc-probe-z', { callbackName: 'mill-zprobe-set', profile })
                  }
                },

                

                { id: "findLL",
                  subtitle: "Locate Lower Left Corner",
                  instructions: "Position the laser at the lower left corner of the board then click joystick",
                  buttonDefs: [
                     { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wiz) => {
                      ui.publish('cnc-find-work-origin', { callbackName: 'mill-origin-set', profile } )
                  }
                },
        

        
                { id: "autolevel",
                  subtitle: "Autolevel",
                  instructions: "Gathering surface data for auto leveling. Standby...",
                  buttonDefs: [
                    { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wiz) => {
                      ui.publish('cnc-autolevel', { callbackName: 'ui-wizard-next', profile })
                  }
                },
        
        
                { id: "removeProbe",
                  subtitle: "Autolevel",
                  instructions: "Autolevel complete. Remove probe from bit and return to its original mount.",
                  buttonDefs: [
                    { label: "Continue", next: true, btnClass: 'removeProbeContinue' },
                    { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ],
                  onActivate: (wiz) => {
                    wiz.timerId = setInterval(() => {
                        if (window.cncZProbe) {
                            // We can not continue if ZProbe is currently "pressed"
                            $('#wizardPage .removeProbeContinue').show();
                        }
                        else {
                            // Enable continue button
                            $('#wizardPage .removeProbeContinue').hide();
                        }
                    }, 1000);
                  },
                  onDeactivate: (wiz) => {
                    clearInterval(wiz.timerId);
                  }

                },
        
                { id: "millReady",
                  subtitle: "Ready to mill",
                  instructions: "Ready to mill. Press Start to begin",
                  buttonDefs: [
                    { label: "Start", next: true },
                    { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }                      
                  ]
                },
        
                { id: "mill",
                  subtitle: "Milling",
                  instructions: "Milling PCB",
                  buttonDefs: [
                    { label: "Cancel", fnAction: () => { thiz.cancelProcesses() } }
                  ],
                  onActivate: (wiz) => {
                    ui.publish('cnc-mill-pcb', { callbackName: 'ui-process-done', profile })
                  }
                }
            ]
        }
        
        window.uiController.startWizard(wizard);
    }

    setMillOrigin(mpos) {
        this.mposWorkOrigin = mpos;
        this.activeProfile.mill.workOriginM = mpos;
        window.uiController.wizardNext();
    }


    setZProbeResult(mpos) {
        this.mposZprobe = mpos;
        window.uiController.wizardNext();
    }


    cancelProcesses() {
        ipcRenderer.invoke('cnc-cancel', this.activeProfile);
        window.uiController.cancelWizard();
        delete this.activeProfile;
    }
}

export  { MillController };
