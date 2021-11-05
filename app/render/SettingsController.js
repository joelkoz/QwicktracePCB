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
                { id: "cutPCB",
                  menuCategory: 'mill',
                    wizard: {
                    title: "Cut PCB - Vertical",
                    finishLandingPage: "settingsPage",
                    steps: [
                           { id: "cutType",
                                subtitle: "Cut PCB Vertically",
                                instructions: "How do you want to cut the board",
                                buttonDefs: [
                                    { label: "Half width", gotoStepId: 'cutHalfStart' },
                                    { label: "Variable width", gotoStepId: 'cutVariableStart' },
                                    { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }
                                ]
                            },

                            { id: "cutVariableStart",
                                subtitle: "Jog spindle to cut line",
                                instructions: "Use Joystick to jog the machine to bottom left of cut. Press the button to switch from " +
                                                "Up/Down controlling the Y axis or Z axis.  Press Cut to start " +
                                                "cutting.",
                                buttonDefs: [
                                    { label: "Goto", fnAction: async () => {  
                                            let x = await ui.getNumber('Goto X');
                                            let y = await ui.getNumber('Goto Y');
                                            if (x || y) {
                                                let mpos = {};
                                                if (x) {
                                                    mpos.x = thiz.config.cnc.locations.ur.x - x;
                                                }
                                                if (y) {
                                                    mpos.y = thiz.config.cnc.locations.ur.y - y;
                                                }
                                                await thiz.rpCall('cnc.goto', mpos);
                                            }
                                       } },
                                    { label: "Cut", next: true },
                                    { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }
                                ],
                                onActivate: (wizStep) => {
                                    thiz.rpCall('cnc.jogMode', true)
                                    wizStep.cncPosDisplay = uiAddPosDisplay('#wizardPage .status-area', window.wcsPCB_RELATIVE_UR)
                                },
                                onDeactivate: (wizStep) => {
                                    thiz.rpCall('cnc.jogMode', false)
                                    uiRemovePosDisplay(wizStep.cncPosDisplay);
                                }                                
                            },

                            { id: "cutVariable",
                                subtitle: "Cutting",
                                instructions: "Cutting stock vertically",
                                buttonDefs: [
                                    { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }
                                ],
                                onActivate: async (wizStep) => {
                                    try {
                                        await thiz.rpCall('cnc.setPointer', false)
                                        let mpos = await thiz.rpCall('cnc.getMPos');
                                        let cutConfig = thiz.config.cnc.cut;
                                        let halfBit = cutConfig.bitWidth / 2;
                                        let cutData = {
                                            start: { mx: mpos.x, my: mpos.y },
                                            end: { mx: mpos.x, my: thiz.config.cnc.locations.ur.y + halfBit }
                                        }
                                        let completed = await thiz.rpCall('cnc.multiPassCut', cutData);
                                        thiz.rpCall('cnc.loadStock')
                                        if (completed) {
                                           thiz.finishWizard();
                                        }
                                    }
                                    catch (err) {
                                        console.trace();
                                    }
                                }
                            },

                            { id: "cutHalfStart",
                                subtitle: "Specify lower left of board",
                                instructions: "Use Joystick to jog the to bottom left of board. Press the button to switch from " +
                                                "Up/Down controlling the Y axis or Z axis.  Press Cut to start " +
                                                "cutting.",
                                buttonDefs: [
                                    { label: "Toggle Laser", call: { name: 'cnc.setPointer', data: [] } },
                                    { label: "Cut", next: true },
                                    { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }
                                ],
                                onActivate: (wizStep) => {
                                    thiz.rpCall('cnc.jogMode', true)
                                    wizStep.cncPosDisplay = uiAddPosDisplay('#wizardPage .status-area', window.wcsPCB_RELATIVE_UR)
                                },
                                onDeactivate: (wizStep) => {
                                    thiz.rpCall('cnc.jogMode', false)
                                    uiRemovePosDisplay(wizStep.cncPosDisplay);
                                }                                
                            },

                            { id: "cutHalf",
                                subtitle: "Cutting",
                                instructions: "Cutting stock vertically in half",
                                buttonDefs: [
                                    { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }
                                ],
                                onActivate: async (wizStep) => {
                                    try {
                                        await thiz.rpCall('cnc.setPointer', false)
                                        let mpos = await thiz.rpCall('cnc.getMPos');
                                        let cutConfig = thiz.config.cnc.cut;
                                        let halfBit = cutConfig.bitWidth / 2;
                                        let boardWidth = mpos.x - thiz.config.cnc.locations.ur.x;
                                        let halfWidth = boardWidth / 2;
                                        let xpos = thiz.config.cnc.locations.ur.x - halfWidth;
                                        let cutData = {
                                            start: { mx: xpos, my: mpos.y },
                                            end: { mx: xpos, my: thiz.config.cnc.locations.ur.y + halfBit }
                                        }
                                        let completed = await thiz.rpCall('cnc.multiPassCut', cutData);
                                        thiz.rpCall('cnc.loadStock')
                                        if (completed) {
                                           thiz.finishWizard();
                                        }
                                    }
                                    catch (err) {
                                        console.trace();
                                    }
                                }
                            }


                    ]
                    }
                },


   
               { id: "home",
                 menuCategory: 'mill',
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
                 menuCategory: 'mill',
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


               { id: "zprobePad",
                 menuCategory: 'mill',
                 wizard: {
                    title: "ZProbe Pad",
                    finishLandingPage: "settingsPage",
                    steps: [
                        { id: "connectZProbe",
                            subtitle: "ZProbe Clip",
                            instructions: "Connect zprobe clip to whichever bit is in the mill.",
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
                        subtitle: "Z Probe",
                        instructions: "Use joystick to position spindle approx 2 to 3 mm over the probe strip and press Continue",
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
                           // Save x/y pos for future use...
                           let mpos = await thiz.rpCall('cnc.getMPos');
                           let padPos = { x: mpos.x, y: mpos.y }
                           thiz.rpCall('config.setAndSave', 'cnc.locations.zpad', padPos)

                           // Now do the actual probe...
                           await thiz.rpCall('cnc.zProbePad', false);
                           thiz.wizardNext();
                        }
                      },

                      { id: "removeProbe",
                        subtitle: "ZProbe Complete",
                        instructions: "Remove probe from bit and return to the clip screw.",
                        buttonDefs: [
                            { label: "Done", next: true, btnClass: 'removeProbeContinue' },
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
        
                        }
      
                    ]
                 }
               },

               { id: "zprobePCB",
                 menuCategory: 'mill',
                 wizard: {
                    title: "ZProbe PCB",
                    finishLandingPage: "settingsPage",
                    steps: [
                        { id: "connectZProbe",
                            subtitle: "ZProbe Clip",
                            instructions: "Connect zprobe clip to whichever bit is in the mill and " +
                                          "place the ZProbe arm onto the PCB.",
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
                        subtitle: "Z Probe",
                        instructions: "Use joystick to position spindle approx 2 to 3 mm over the PCB and press Continue",
                        buttonDefs: [
                           { label: "Continue", next: true },
                           { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                        ],
                        onActivate: async (wizStep) => {
                           await thiz.rpCall('cnc.gotoSafeZ');
                           await thiz.rpCall('cnc.zPadPosition', false);
                           await thiz.rpCall('cnc.moveXY', -9, 0)
                           await thiz.rpCall('cnc.jogMode', true)
                        },
                        onDeactivate: (wizStep) => {
                            thiz.rpCall('cnc.jogMode', false)
                        }                  
                      },                
              
                      { id: "zprobe",
                        subtitle: "Z Probe",
                        instructions: "Searching for PCB surface. Standby...",
                        buttonDefs: [
                          { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                        ],
                        onActivate: async (wizStep) => {
                           // Now do the actual probe...
                           await thiz.rpCall('cnc.zProbePCB');
                           thiz.wizardNext();
                        }
                      },

                      { id: "removeProbe",
                        subtitle: "ZProbe Complete",
                        instructions: "Remove probe from bit and return to the clip screw. Put the " +
                                      "ZProbe arm back to its original spot.",
                        buttonDefs: [
                            { label: "Done", next: true, btnClass: 'removeProbeContinue' },
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
        
                        }
      
                    ]
                 }
               },

               { id: "calibrateProbeArea",
                 menuCategory: 'calibrate:mill',
                 wizard: {
                    title: "Calibrate Probe Area Offsets",
                    finishLandingPage: "settingsPage",
                    steps: [
                        { id: "connectZProbe",
                            subtitle: "Prepare to zprobe Zpad",
                            instructions: "Load mill with a blank PCB and connect zprobe clip to whichever bit is in the mill.",
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
                                // Save x/y pos for future use...
                                let mpos = await thiz.rpCall('cnc.getMPos');
                                let padPos = { x: mpos.x, y: mpos.y }
                                thiz.rpCall('config.setAndSave', 'cnc.locations.zpad', padPos)

                                // Now do the actual probe...

                                thiz.calZPadZ = await thiz.rpCall('cnc.zProbePad', false);
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
                                await thiz.rpCall('cnc.gotoSafeZ');
                                await thiz.rpCall('cnc.moveXY', -9, 0)
                            }
                        },                
                
                        { id: "zProbePCB",
                            subtitle: "PCB Probe",
                            instructions: "Searching for PCB surface. Standby...",
                            buttonDefs: [
                            { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                            ],
                            onActivate: async (wizStep) => {
                                await thiz.rpCall('cnc.goto', { z: thiz.calZPadZ + 3})
                                thiz.calPCBZ = await thiz.rpCall('cnc.zProbePCB', false);
                                thiz.rpCall('cnc.gotoSafeZ');
                                ui.wizardNext();
                            }
                        },
              
                        { id: "done",
                            subtitle: "Complete",
                            instructions: "Calibration successful",
                            buttonDefs: [
                            { label: "Done", fnAction: () => { thiz.finishWizard() } }                      
                            ],
                            onActivate: async (wizStep) => {
                                let pcbProbeOffset = thiz.calZPadZ - thiz.calPCBZ
                                if (pcbProbeOffset < 0) {
                                    thiz.rpCall('config.setAndSave', 'cnc.zheight.zpad.pcbProbeOffset', pcbProbeOffset)
                                }
                                else {
                                    console.log('Calibration fail: results of pcb calibrate are positive!?')
                                    thiz.setWizardInstructions('Calibration failed. Calculated offset was positive')
                                }
                            }
                        }
      
                    ]
                 }
               },



               { id: "calibrateLaser",
                 menuCategory: 'calibrate:mill',
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
                                await thiz.rpCall('cnc.gotoSafeZ');
                                await thiz.rpCall('cnc.zPadPosition', false);
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
                 menuCategory: 'calibrate:mill',
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


               { id: "reloadConfig",
                 menuCategory: 'calibrate',
                 wizard: {
                    title: "Reload configuration file",
                    cancelLandingPage: "settingsPage",
                    steps: [
                            { id: "reload",
                                subtitle: "Reload config",
                                instructions: "Reloading configuration Standby...",
                                buttonDefs: [
                                { label: "Cancel", fnAction: () => { thiz.cancelWizard() } }                      
                                ],
                                onActivate: async (wizStep) => {
                                    await thiz.rpCall('config.load');
                                    thiz.wizardNext()
                                }
                            },
                          { id: "done",
                            subtitle: "Configuration Reload",
                            instructions: "Configuration load complete",
                            buttonDefs: [
                               { label: "Done", fnAction: () => { thiz.finishWizard() } }
                            ],
                        }                              
                    ]
                 }
               },

               { id: "millReset",
                 menuCategory: 'mill',
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
               },


               { id: "calibrateExposureMask",
                 menuCategory: 'calibrate:expose',
                 wizard: {
                    title: "Calibrate exposure mask",
                    cancelLandingPage: "settingsPage",
                    steps: [
                            { id: "reset",
                                subtitle: "Locate corners",
                                instructions: "Resetting mill. Standby...",
                                buttonDefs: [
                                   { label: "Ok", fnAction: () => { uiExpose.exposureCanvas.activateCursor(false) } },
                                   { label: "Cancel", fnAction: () => { thiz.cancelWizard(); uiExpose.exposureCanvas.activateCursor(false) } }
                                ],
                                onActivate: async (wizStep) => {
                                     let area = thiz.config.mask.area;
                                     thiz.resetMaskCorners();
                                     // Since the "cursor box" is an inverted
                                     // rectangle, make the canvas "white", so
                                     // the inverted box is mostly black...
                                     uiExpose.exposureCanvas.reset('white');
                                     try {
                                        await thiz.getMaskCorner('pxLL', 'lower left', 'pxUR');
                                        await thiz.getMaskCorner('pxUL', 'upper left', 'pxLR');
                                        await thiz.getMaskCorner('pxUR', 'upper right', 'pxLL');
                                        await thiz.getMaskCorner('pxLR', 'lower right', 'pxUL');
                                        thiz.rpCall('config.setAndSave', 'mask.area', thiz.config.mask.area);
                                        thiz.finishWizard();
                                     }
                                     catch (err) {
                                        // Throw away any changes and reload old config...
                                        console.log(err)
                                        await thiz.rpCall('config.load');
                                    }
                                }
                            }                              
                    ]
                 }
               }


        ];
    }


    resetMaskCorners() {
        let canvasWidth = this.config.window.height;
        let canvasHeight = this.config.window.width - this.config.ui.width;
        let area = this.config.mask.area;

        area.pxUL = {
            x: 0,
            y: canvasHeight
        };
        area.pxLL = {
            x: 0,
            y: 0
        };
        area.pxUR = {
            x: canvasWidth,
            y: canvasHeight
        };
        area.pxLR = {
            x: canvasWidth,
            y: 0
        }

    }


    async getMaskCorner(propertyName, cornerName, anchorPropertyName) {
        let area = this.config.mask.area;
        let pxCoords = area[propertyName];
        let anchorPoint = area[anchorPropertyName]
        this.setWizardInstructions(`Use joystick to move cursor to the ${cornerName} corner. Press OK when done.`)
        pxCoords = await uiExpose.exposureCanvas.getPixelLocation(pxCoords, anchorPoint);
        if (!this.settingsWizardCanceled) {
            area[propertyName] = pxCoords;
        }
        else {
            throw new Error('Calibrate mask corners canceled by user')
        }
    }

    hasCNC() {
        return this.config.app.hasCNC && window.cncAvailable;
    }


    hasPCB() {
        return this.config.app.hasPCB;
    }


    showMenu(menuCategory) {
        this.menuCategory = menuCategory;
        window.uiController.showPage('settingsPage')
    }


    setWizardStatusText(status) {
        window.setWizardStatusText(status)
    }


    setWizardInstructions(status) {
        window.setWizardInstructions(status)
    }


    getSettingsList() {
        let list = [];

        let validCategories = [ this.menuCategory ];
        if (this.menuCategory === 'calibrate') {
            if (this.config.app.hasCNC && window.cncAvailable) {
                validCategories.push('calibrate:mill')
            }
            if (this.config.app.hasPCB) {
                validCategories.push('calibrate:expose')
            }
        }

        this.settingsWizards.forEach(wiz => {
            if (validCategories.includes(wiz.menuCategory)) {
               list.push({"name": wiz.wizard.title, "value": wiz.id });
            }
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
        this.settingsWizardCanceled = false;
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
        this.settingsWizardCanceled = true;
        if (this.hasCNC()) { 
           this.rpCall('cnc.cancelProcesses');
        }
        if (this.hasPCB()) {
           this.rpCall('uv.safelight', false);
           uiExpose.exposureCanvas.reset('black');
        }
        window.uiController.cancelWizard();
    }

    finishWizard() {
        if (this.hasCNC()) {
           this.rpCall('cnc.cancelProcesses');
        }
        if (this.hasPCB()) {
           this.rpCall('uv.safelight', false);        
           uiExpose.exposureCanvas.reset('black');
        }
        window.uiController.finishWizard();
    }

}

export  { SettingsController };
