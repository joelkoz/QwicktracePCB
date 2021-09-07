"use strict"

const { ipcRenderer } = require('electron')
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
                                onActivate: (wizStep) => {
                                    thiz.rpcCall('cnc.home', [], thiz.finishWizard)
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
                                   { label: "Done", fnAction: () => { thiz.finishWizard() } }                      
                                ],
                                onActivate: (wizStep) => {
                                    thiz.rpcCall('cnc.jogMode', true)
                                },
                                onDeactivate: (wizStep) => {
                                    thiz.rpcCall('cnc.jogMode', false)
                                }                                   
                            }
                    ]
                 }
               },


               { id: "zprobe",
                 wizard: {
                    title: "ZProbe Pad",
                    finishLandingPage: "settingsPage",
                    steps: [
                        { id: "posZProbe",
                        subtitle: "Z Probe",
                        instructions: "Use joystick to position spindle approx 2 to 3 mm over ZPad and press Continue",
                        buttonDefs: [
                           { label: "Continue", next: true },
                           { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                        ],
                        onActivate: async (wizStep) => {
                           await thiz.rpcCallAsync('cnc.zPadPosition');
                           await thiz.rpcCallAsync('cnc.jogMode', true)
                        },
                        onDeactivate: (wizStep) => {
                            thiz.rpcCall('cnc.jogMode', false)
                        }                  
                      },                
              
                      { id: "zprobe",
                        subtitle: "Z Probe",
                        instructions: "Searching for surface. Standby...",
                        buttonDefs: [
                          { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                        ],
                        onActivate: async (wizStep) => {
                           await thiz.rpcCallAsync('cnc.zProbePad')
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
                                onActivate: (wizStep) => {
                                    thiz.rpcCall('cnc.reset', [], thiz.finishWizard)
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
        this.rpcCall('cnc.cancelProcesses');
        this.rpcClearAll();
        window.uiController.cancelWizard();
    }

    finishWizard() {
        this.rpcCall('cnc.cancelProcesses');
        this.rpcClearAll();
        window.uiController.finishWizard();
    }

}

export  { SettingsController };
