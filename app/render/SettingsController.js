"use strict"
import { RPCClient } from './RPCClient.js'


class SettingsController extends RPCClient {

    constructor(config) {
        super('settings');

        let thiz = this;
        this.config = config;

        this.settingsWizards = [
        
               { id: "home",
                 wizard: {
                    title: "Home mill",
                    cancelLandingPage: "settingsPage",
                    steps: [
                            { id: "home",
                                subtitle: "Home",
                                instructions: "Homing mill. Standby...",
                                buttonDefs: [
                                { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                                ],
                                onActivate: async (wizStep) => {
                                    await thiz.rpCall('cnc.home')
                                    thiz.finishWizard();
                                }
                            }                       
                    ]
                 }
               },

               { id: "jog",
                 wizard: {
                    title: "Jog Spindle",
                    finishLandingPage: "settingsPage",
                    steps: [
                            { id: "jog",
                                subtitle: "Jog Spindle",
                                instructions: "Use Joystick to jog the machine. Press the button to switch from " +
                                              "Up/Down controlling the Y axis or Z axis.  Press Done when " +
                                              "you have completed.",
                                buttonDefs: [
                                   { label: "Toggle Laser", call: { name: 'cnc.setPointer', data: [] } },
                                   { label: "Done", fnAction: () => { thiz.finishWizard() } }                      
                                ],
                                onActivate: (wizStep) => {
                                    thiz.rpCall('cnc.jogMode', true)
                                    wizStep.cncPosDisplay = uiAddPosDisplay('#wizardPage .status-area')
                                },
                                onDeactivate: (wizStep) => {
                                    thiz.rpCall('cnc.jogMode', false)
                                    uiRemovePosDisplay(wizStep.cncPosDisplay);
                                }                                   
                            }
                    ]
                 }
               },


               { id: "zprobe",
                 wizard: {
                    title: "ZProbe",
                    finishLandingPage: "settingsPage",
                    steps: [
                        { id: "posZProbe",
                        subtitle: "Z Probe",
                        instructions: "Use joystick to position spindle approx 2 to 3 mm over desired area and press Continue",
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
              
                      { id: "zprobe",
                        subtitle: "Z Probe",
                        instructions: "Searching for surface. Standby...",
                        buttonDefs: [
                          { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                        ],
                        onActivate: async (wizStep) => {
                           await thiz.rpCall('cnc.zProbePad', false);
                           thiz.finishWizard();
                        }
                      }
      
                    ]
                 }
               },


               { id: "millReset",
                 wizard: {
                    title: "Reset mill",
                    cancelLandingPage: "settingsPage",
                    steps: [
                            { id: "reset",
                                subtitle: "Reset mill",
                                instructions: "Resetting mill. Standby...",
                                buttonDefs: [
                                { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                                ],
                                onActivate: async (wizStep) => {
                                    await thiz.rpCall('cnc.reset');
                                    thiz.finishWizard()
                                }
                            }                              
                    ]
                 }
               }

        ];
    }


    getSettingsList() {
        let list = [];

        this.settingsWizards.forEach(wiz => {
            list.push({"name": wiz.wizard.title, "value": wiz.id });
        });
        return list;
    }


    getWizard(wizardId) {
        let wiz = this.settingsWizards.find((w) => { 
            return (w.id === wizardId);
        });
        return wiz;
    }

    startWizard(wizardId) {
        let wiz = this.getWizard(wizardId);
        if (wiz) {
            window.uiController.startWizard(wiz.wizard);
        }
        else {
            console.log(`Could not find wizard entry for ${wizardId} to start`);
        }
    }

    wizardNext() {
        window.uiController.wizardNext();
    }

    cancelWizard() {
        this.rpCall('cnc.cancelProcesses');
        window.uiController.cancelWizard();
    }

    finishWizard() {
        this.rpCall('cnc.cancelProcesses');
        window.uiController.finishWizard();
    }

}

export  { SettingsController };
