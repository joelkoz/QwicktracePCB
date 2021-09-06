"use strict"

const { ipcRenderer } = require('electron')

class SettingsController {

    constructor(config) {

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
                                    ui.publish('cnc-home', { callbackName: 'ui-wizard-next' });
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
                                    ui.publish('cnc-jog-mode');
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
                                    ui.publish('cnc-reset', { callbackName: 'ui-wizard-next' });
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

    cancelWizard() {
        window.uiController.cancelWizard();
    }

    finishWizard() {
        window.uiController.finishWizard();
    }

}

export  { SettingsController };
