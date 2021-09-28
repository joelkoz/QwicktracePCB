"use strict"
const { untilDelay } = require('promise-utils');
import { RPCClient } from './RPCClient.js'

const wcsMACHINE_WORK = 0;
const wcsPCB_WORK = 1;

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



               { id: "calibrateLaser",
                 wizard: {
                    title: "Calibrate Laser Pointer",
                    finishLandingPage: "settingsPage",
                    steps: [

                        { id: "loadMill",
                            subtitle: "Load Mill with scrap stock",
                            instructions: "Load the mill with scrap PCB stock and a milling bit. If you need to zProbe, "+
                                          "connect the zprobe clip to the bit and place the probe arm on the PCB.",
                            buttonDefs: [
                                { label: "Continue", next: true },
                                { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                            ],
                            onActivate: (wizStep) => {
                                thiz.rpCall('cnc.loadStock')
                            }
                        },
              

                        { id: "posBit",
                            subtitle: "Position bit",
                            instructions: "Use joystick to position spindle approx 2 to 3 mm over desired test area and press Continue",
                            buttonDefs: [
                               { label: "Continue", next: true, btnClass: 'zProbeContinue' },
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
              

                        { id: "prepareBit",
                            subtitle: "Prepare to zProbe PCB",
                            instructions: "Connect zprobe clip to milling bit, and place " +
                                          "probe arm on the PCB",
                            buttonDefs: [
                                { label: "Start ZProbe", next: true, btnClass: 'zProbeContinue' },
                                { label: "Skip zprobe", fnAction: () => { thiz.gotoWizardPage('readyToCalibrate') } },
                                { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                            ],
                            onActivate: (wizStep) => {
                                function updateBtnContinue() {
                                    if (window.cncZProbe) {
                                        // We can not continue if ZProbe is currently "pressed"
                                        thiz.setWizardInstructions(wizStep.instructions)
                                        $('#wizardPage .zProbeContinue').css("display", "none");
                                    }
                                    else {
                                        // Enable continue button
                                        thiz.setWizardInstructions('')
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
              
            
                        { id: "zprobe",
                            subtitle: "Z Probe PCB",
                            instructions: "Searching for surface. Standby...",
                            buttonDefs: [
                                { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                            ],
                            onActivate: async (wizStep) => {
                               await thiz.rpCall('cnc.zProbeGeneric', 'laser calibrate');
                               thiz.wizardNext();
                            }
                        },

                        { id: "readyToCalibrate",
                            subtitle: "Ready to calibrate",
                            instructions: "Remove probe from bit and the probe arm from the PCB and return them to their original positions.",
                            buttonDefs: [
                                { label: "Start calibration", next: true, btnClass: 'removeProbeContinue' },
                                { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                            ],
                            onActivate: (wizStep) => {
        
                                function updateBtnContinue() {
                                    if (window.cncZProbe) {
                                        // We can only continue if ZProbe is currently "pressed"
                                        thiz.setWizardInstructions('')
                                        $('#wizardPage .removeProbeContinue').show();
                                    }
                                    else {
                                        // Hide the continue button
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


                        { id: "drillTestHole",
                            subtitle: "Drill test hole",
                            instructions: "Drilling test hole for laser calibration...",
                            buttonDefs: [
                                { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                            ],
                            onActivate: async (wizStep) => {
                                let mpos = await thiz.rpCall('cnc.getMPos')
                                console.log('Drilling laser calibration hole at ', mpos)
                                thiz.laserCalibration = { spindle: mpos }
                                await thiz.rpCall('cnc.setRpm', 9500)
                                await thiz.rpCall('cnc.goto', { z: 0.3 }, wcsPCB_WORK)
                                await thiz.rpCall('cnc.goto', { z: -0.2 }, wcsPCB_WORK, 15)
                                await untilDelay(1500)
                                await thiz.rpCall('cnc.setRpm', 0)
                                await thiz.rpCall('cnc.goto', { z: 4 }, wcsPCB_WORK)
                                if (ui.wizardActive) {
                                    thiz.wizardNext()
                                }
                            }
                        },

                        { id: "alignLaser",
                            subtitle: "Align with test hole",
                            instructions: "Use the joystick to align the laser with the test hole. Press Done " +
                                          "when finished",
                            buttonDefs: [
                                { label: "Done", next: true },
                                { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                            ],
                            onActivate: async (wizStep) => {
                                await thiz.rpCall('cnc.setLaserOnly', true)
                                await thiz.rpCall('cnc.jogMode', true)
                            },
                            onDeactivate: async (wizStep) => {
                                await thiz.rpCall('cnc.setLaserOnly', false)
                                await thiz.rpCall('cnc.jogMode', false)
                            }
                        },
                        
                        { id: "done",
                            subtitle: "Calibration complete",
                            instructions: "Saving results... ",
                            buttonDefs: [
                                { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                            ],
                            onActivate: async (wizStep) => {
                                let mpos = await thiz.rpCall('cnc.getMPos')
                                console.log('Laser calibration positioned hole at ', mpos)
                                thiz.laserCalibration.laser = mpos;
                                await thiz.rpCall('cnc.calibratePointer', thiz.laserCalibration)
                                thiz.startWizard('jog');
                            }
                        },
                        
                    ]
                 }
               },


               { id: "testCNCPins",
                 wizard: {
                    title: "Test CNC Pins",
                    cancelLandingPage: "settingsPage",
                    steps: [
                            { id: "start",
                                subtitle: "Test CNC pins",
                                instructions: "Press various limit switches",
                                buttonDefs: [
                                    { label: "Done", fnAction: () => { thiz.cancelWizard() } }                      
                                ],
                                onActivate: async (wizStep) => {
                                    function bVal(b) {
                                        return b ? 'On ' : 'Off'
                                    }
                                    await thiz.rpCall('cnc.enableHardLimits', false);
                                    const RPT_EVENT_NAME = 'render.settings.pinrpt';
                                    wizStep.rptListener = RenderMQ.on(RPT_EVENT_NAME, (rpt) => {
                                        let status = `Limits: X=${bVal(rpt.xLimit)} Y=${bVal(rpt.yLimit)} Z=${bVal(rpt.zLimit)}, Probe=${bVal(rpt.probe)}`
                                        thiz.setWizardStatusText(status)
                                    });
                                    await thiz.rpCall('cnc.streamPinReport', RPT_EVENT_NAME);
                                },
                                onDeactivate: async (wizStep) => {
                                    wizStep.rptListener.off();
                                    await thiz.rpCall('cnc.enableHardLimits', true)
                                    await thiz.rpCall('cnc.streamPinReport', false)
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


    setWizardStatusText(status) {
        window.setWizardStatusText(status)
    }


    setWizardInstructions(status) {
        window.setWizardInstructions(status)
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

    gotoWizardPage(wizardStepId) {
        window.uiController.gotoWizardPage(wizardStepId)
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
