"use strict"
import { AlignmentController } from './AlignmentController.js';
import { RenderMQ } from './RenderMQ.js'


class MillController extends AlignmentController {

    constructor() {

        super('mill');

        let thiz = this;

        // Tell UI controller to call to our start method
        // when dispatching to a process action.
        window.uiDispatch.mill = (profile) => {
            thiz.startMillWizard(profile);
        }        

        RenderMQ.on('render.cnc.autolevelProbeCount', (probeCount) => {
           thiz.setAutolevelProbeCount(probeCount);
        });      

        RenderMQ.on('render.cnc.autolevelProbeNum', (probeNum) => {
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
                  subtitle: "Load Mill with Stock",
                  instructions: "Load mill with PCB stock used for milling.  Press Continue when done",
                  buttonDefs: [
                     { label: "Continue", next: true },
                     { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                  ],
                  onActivate: (wizStep) => {
                      if (thiz.activeProfile.state.stockIsBlank || 
                         !thiz.activeProfile.state.alignStock) {
                          thiz.rpCall('cnc.loadStock')
                      }
                      else {
                          ui.wizardNext();
                      }
                  }
                },
        
        
       
                { id: "connectZProbe",
                  subtitle: "Prepare to zprobe Zpad",
                  instructions: "Load mill with milling bit. Connect zprobe clip to milling bit.",
                  buttonDefs: [
                     { label: "Continue", next: true, btnClass: 'zProbeContinue' },
                     { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
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
                  subtitle: "ZPad Probe",
                  instructions: "Use joystick to position spindle approx 2 to 3 mm over Zpad",
                  buttonDefs: [
                     { label: "Continue", next: true },
                     { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                  ],
                    onActivate: async (wizStep) => {
                      if (profile.state.stockIsBlank) {
                        // Skip zpad probing and go straight to copper board...
                        ui.gotoWizardPage('posProbeArmPCB')
                        return;
                      }
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


                { id: "posProbeArmPCB",
                  subtitle: "Move Probe Arm to PCB",
                  instructions: "Position the zprobe arm on the copper board.",
                  buttonDefs: [
                     { label: "Continue", next: true },
                     { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                  ],
                    onActivate: async (wizStep) => {
                      if (!profile.state.stockIsBlank) {
                        // Skip zpad probing and go straight to copper board...
                        ui.gotoWizardPage('findLL')
                        return;
                      }
                      await thiz.rpCall('cnc.gotoSafeZ');
                    }
                },                
        

                { id: "posZProbePCB",
                  subtitle: "PCB Probe",
                  instructions: "Use joystick to position spindle approx 2 to 3 mm over PCB.",
                  buttonDefs: [
                     { label: "Continue", next: true },
                     { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                  ],
                    onActivate: async (wizStep) => {
                      await thiz.rpCall('cnc.zPadPosition');
                      await thiz.rpCall('cnc.moveXY', -9, 0)
                      await thiz.rpCall('cnc.jogMode', true)
                    },
                    onDeactivate: (wizStep) => {
                      thiz.rpCall('cnc.jogMode', false)
                    }                  
                },                
        
                { id: "zProbePCB",
                  subtitle: "PCB Probe",
                  instructions: "Searching for PCB surface. Standby...",
                  buttonDefs: [
                    { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                  ],
                  onActivate: async (wizStep) => {
                    await thiz.rpCall('cnc.zProbePCB', false);
                    ui.wizardNext();
                  }
                },


                { id: "findLL",
                  subtitle: "Locate Lower Left Corner",
                  instructions: "Position the laser at the lower left corner of the board then click joystick",
                  buttonDefs: [
                     { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                  ],
                  onActivate: async (wizStep) => {
                     profile.stock.actual = await thiz.rpCall('cnc.findPCBOrigin', profile.stock)
                     ui.wizardNext();
                  }
                },
        
                { id: "autolevel-start",
                  subtitle: "Autolevel",
                  instructions: "Ready to start autolevel",
                  buttonDefs: [
                     { label: "Start", fnAction: () => { ui.wizardNext() } },
                     { label: "Skip", fnAction: () => { ui.gotoWizardPage('removeProbe') } },                  
                     { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                  ]
                },
        
                { id: "autolevel",
                  subtitle: "Autolevel",
                  instructions: "Gathering surface data for auto leveling...",
                  buttonDefs: [
                    { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                  ],
                  onActivate: async (wizStep) => {
                      await thiz.rpCall('cnc.autolevelPCB', profile.stock.actual)
                      ui.wizardNext();
                  }
                },
        
        
                { id: "removeProbe",
                  subtitle: "Ready to mill",
                  instructions: "Remove probe from bit and the probe arm from the PCB and return them to their original positions.",
                  buttonDefs: [
                    { label: "Start mill", next: true, btnClass: 'removeProbeContinue' },
                    { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
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
                    { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }
                  ],
                  onActivate: async (wizStep) => {
                      await thiz.rpCall('cnc.millPCB', profile)
                      await thiz.rpCall('cnc.loadStock')
                      thiz.finishWizard();
                  }
                }
            ]
        }
        
        window.uiController.startWizard(wizard);
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

    cancelWizard() {
        this.rpCall('cnc.cancelProcesses');
        window.uiController.cancelWizard();
        delete this.activeProfile;
    }

    finishWizard() {
        this.rpCall('cnc.cancelProcesses');
        window.uiController.finishProcess();
        window.uiController.finishWizard();
    }

}

export  { MillController };
