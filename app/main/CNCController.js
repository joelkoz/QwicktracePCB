const { ipcMain } = require('electron');
const { rotate, translate, transform, applyToPoint } = require('transformation-matrix');
const MainSubProcess = require('./MainSubProcess.js')
const MainMQ = require('./MainMQ.js');
const ProjectLoader = require('./ProjectLoader.js');
const { untilTrue, untilEvent } = require('promise-utils');

// An "equals" function that does a "shallow" comparison
// of objects, ensuring all keys of one object exists in
// and are equal to another object.
function shallowEqual(object1, object2) {
    if (typeof object1 !== typeof object2) {
       return false;
    }
  
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);
  
    if (keys1.length !== keys2.length) {
      return false;
    }
  
    for (let key of keys1) {
      if (object1[key] !== object2[key]) {
        return false;
      }
    }
  
    return true;
}


// Kefir filter function - returns a filter function that can
// track if a value is different from the last time it was reported,
// and if so, returns TRUE.
function hasChanged() {
    let last;
    return (val) => {
      let changed;
      if (typeof val === 'object') {
         changed = !shallowEqual(val, last);
      }
      else {
         changed = (val != last);
      }
      last = val;
      return changed;
    }
 }


// Lazy require() CNC module so it will not run if no CNC is present...
let CNC = null;

const wcsMACHINE_WORK = 0;
const wcsPCB_WORK = 1;

class CNCController  extends MainSubProcess {

    constructor(win, config) {
        super(win);

        console.log('Initializing CNC mill...');
        this.config = config;

        const Joystick = require('./Joystick');
        const ZProbe = require('./cnc/ZProbe');
        CNC = require('./cnc/CNC');
        const LaserPointer = require('./cnc/LaserPointer');
        const Kefir = require('kefir');
        
        this.cnc = new CNC();
        this.pointer = new LaserPointer(config);
        this.zprobe = new ZProbe(config);
        Joystick.init(config);

        const thiz = this;

        const msStickCheck = 100;
        this.stick = Kefir.fromPoll(msStickCheck, Joystick.stickVal).filter(hasChanged());
        this.stickBtn = Kefir.fromPoll(msStickCheck, Joystick.btnVal).filter(hasChanged());
        
        this.jogMode = false;
        this.jogZ = false;

        this.stick.onValue(stick => {
            if (thiz.jogMode) {
               if (this.state != CNC.CTRL_STATE_JOG) {
                  thiz.cnc.jog(stick.x, stick.y, thiz.jogZ);
               }
            }
            else {
                thiz.ipcSend('ui-joystick', stick);
            }
        });
        
        
        this.stickBtn.onValue(pressed => {
            if (thiz.stickBtnDebounceDelay) {
                clearInterval(thiz.stickBtnDebounceDelay)
            }
            thiz.stickBtnDebounceDelay = setTimeout(() => {
                thiz.stickBtnDebounceDelay = null;
                if (pressed) {
                    if (thiz.alignmentMode) {
                        thiz.finishAlignment();
                    }
                    else if (thiz.findOriginMode) {
                        thiz.finishFindWorkOrigin();
                    }
                    else if (thiz.jogMode) {
                        thiz.jogZ = !thiz.jogZ;
                    }
                    else {
                        thiz.ipcSend('ui-joystick-press');
                    }
                }
            }, 100);
        });

        this.cncConnected = false;
        this.cnc.on('ready', () => {
            thiz.cncConnected = true;
            console.log('CNC ready for use.');
            this.initCNC();
        });

        this.cnc.on('closed', () => {
            thiz.cncConnected = false;
        });

        this.cnc.on('state', (state) => {
            
            if (this.lastState != state) {
                console.log('CNC state is ', state);
                this.lastState = state;
            }

            if (state === CNC.CTRL_STATE_HOME) {
                if (!thiz.homeInProgress) {
                    thiz.homeInProgress = true;
                    thiz.mposHome = undefined;
                    console.log('CNC home in progress...');
                }
            }

            if (state === CNC.CTRL_STATE_IDLE) {
                if (thiz.homeInProgress) {
                    // We just finished doing a home
                    // Zero out the work coordinates...
                    thiz.homeInProgress = false;
                    thiz.mposHome = thiz.cnc.mpos;
                    thiz.cnc.setWorkCoord({ x: 0, y: 0, z: 0 }, wcsPCB_WORK);
                    thiz.cnc.once('pos', data => {
                        console.log('Home completed: ', data);
                    });
                    MainMQ.emit('cnc-homed');
                }
            }

            if (state === CNC.CTRL_STATE_RESET) {
                console.log('CNC was reset');
                setTimeout(() => {thiz.initCNC() }, 10);
            }

            thiz.ipcSend('render-cnc-state', state);
        });

        this.zprobe.on(ZProbe.EVT_PRESSED, (state) => {
            thiz.ipcSend('render-zprobe-state', state);
        });

        this.cnc.on('sent', (data) => {
            if (thiz.autolevelInProgress) {

                if (data.startsWith('(AL: start probe:')) {
                    // `(AL: start probe: ${this.planedPointCount} points)`
                    let endNdx = data.indexOf(' points')
                    let probeCount = parseInt(data.slice(18, endNdx));
                    console.log(`Autolevel starting on ${probeCount} points`);
                    thiz.ipcSend('mill-autolevel-probe-count', probeCount);
                }
                else if (data.startsWith('(AL: probing point')) {
                    // (AL: probing point ${this.planedPointCount + 1})
                    let endNdx = data.indexOf(')')
                    let probeNum = parseInt(data.slice(19, endNdx));
                    console.log(`Autolevel probing point`);
                    thiz.ipcSend('mill-autolevel-probe-num', probeNum);
                }
                else if (data === '(AL: done)') {
                    thiz.autolevelInProgress = false;
                    console.log('Autolevel completed');
                    MainMQ.emit('cnc-autolevel-complete');
                }
            }
        });

        this.cnc.on('alarm', (msg) => {
            thiz.ipcSend('ui-popup-message', `ALARM: ${msg}`);
        });

        this.cnc.on('error', (msg) => {
            thiz.ipcSend('ui-popup-message', `ERROR: ${msg}`);
        });

        //
        // Define commands to the cnc from the render process...
        //
        ipcMain.handle('cnc-cancel', (event, paramObj) => {
            thiz.cancelProcesses();
        });


        ipcMain.handle('cnc-get-align', (event, paramObj) => {
            thiz.getAlignmentHole(paramObj.callbackName, paramObj.sampleCoord, paramObj.profile);
        });


        ipcMain.handle('cnc-find-work-origin', (event, paramObj) => {
            thiz.findWorkOrigin(paramObj.callbackName, paramObj.profile);
        });


        ipcMain.handle('cnc-set-deskew', (event, deskew) => {
            thiz.setDeskew(deskew);
        });


        ipcMain.handle('cnc-home', (event, data) => {
            thiz.cnc.home();
            if (data && data.callbackName) {
                MainMQ.once('cnc-homed', () => { thiz.ipcSend(data.callbackName, thiz.cnc.mpos) });
            }
        });

        ipcMain.handle('cnc-probe-z', (event, data) => {
            let callbackName = data.callbackName;
            let profile = data.profile;
            MainMQ.once('pcb-surface-found', () => { thiz.ipcSend(callbackName, thiz.cnc.mpos)})
            thiz.findPCBSurface();
        });

        ipcMain.handle('cnc-load-pcb', () => {
            thiz.loadStock();
        });

        ipcMain.handle('cnc-autolevel', (event, data) => {
            let callbackName = data.callbackName;
            let profile = data.profile;
            MainMQ.once('cnc-autolevel-complete', () => { thiz.ipcSend(callbackName)})
            thiz.autolevelPCB(profile);
        });


        ipcMain.handle('cnc-mill-pcb', (event, data) => {
            thiz.millPCB(data.profile, data.callbackName);
        });


        ipcMain.handle('cnc-jog-mode', (event) => {
            thiz.jogMode = true;
        });


        ipcMain.handle('cnc-reset', (event, paramObj) => {
            this.resetCNC(paramObj.callbackName);
        });


        this.cnc.connect();
    }


    initCNC() {
        console.log('Initializing CNC');
        this.cnc.sendGCode('G21');
        this.cnc.unlock();
        this.cancelProcesses();

        untilEvent(this.cnc, 'state').then(async () => {
            this.cnc.senderStop();
            await this.cnc.untilSent();
            this.cnc.feederStop();
            await this.cnc.untilSent();
            this.cnc.home();
            await this.cnc.untilSent();
            console.log('Completed initCNC()')
        })
    }


    async resetCNC(callbackName) {
        console.log('CNC reset: UI requested reset...');

        this.cancelProcesses();
        this.cnc.reset();

        console.log('CNC reset: waiting for home state...');
        await this.cnc.untilState(CNC.CTRL_STATE_HOME)
        console.log('CNC reset: waiting for idle state...');
        await this.cnc.untilState(CNC.CTRL_STATE_IDLE)
        console.log('CNC reset: request completed.');
        this.ipcSend(callbackName)
    }


    setProfile(profile) {
        this.profile = profile;
        console.log(`setting current profile: ${JSON.stringify(profile, undefined, 3)}`);
    }

    setDeskew(deskew) {
        this.profile.state.deskew = deskew;
    }


    async killFeeder() {
        console.log("Killing feeder queue...");
        await this.cnc.feederReset();
        await this.gotoSafeZ();
    }


    async gotoSafeZ() {
        console.log("Move to safe Z height...");
        this.cnc.goto({z: this.config.cnc.zheight.safe }, wcsMACHINE_WORK);
        await this.cnc.untilSent();
    }


    async cancelProcesses() {

        if (this.alignmentMode) {
           console.log("Canceling active CNC alignment.");
           this.alignmentMode = false;
        }

        if (this.findOriginMode) {
           console.log("Canceling active find origin mode")
           this.findOriginMode = false;
        }


        if (this.findZPadInProgress) {
            console.log("Canceling active zpad zprobe")
            this.findZPadInProgress = false;
            await this.killFeeder();
        }
 

        if (this.findPCBSurfaceInProgress) {
            console.log("Canceling active pcb zprobe")
            this.findPCBSurfaceInProgress = false;
            await this.killFeeder();
        }

         
        if (this.autolevelInProgress) {
            console.log("Canceling autolevel")
            this.autolevelInProgress = false;
            await this.killFeeder();
            this.cnc.sendGCode('(#autolevel_cancel)');
            await this.cnc.untilSent();
        }


        if (this.millPCBInProgress) {
             console.log("Canceling PCB milling");
             this.millPCBInProgress = false;
             this.cnc.senderStop();
             await this.cnc.untilState(CNC.CTRL_STATE_IDLE);
             await this.gotoSafeZ();
        }


        if (this.jogMode) {
            this.jogMode = false;
        }

        this.pointer.laser = false;
    }
    
    getAlignmentHole(callbackName, sampleCoord, profile) {
        console.log(`Starting getAlignmentHole().  Callback event is ${callbackName}`)
        this.setProfile(profile);
        this.alignmentMode = true;
        this.jogMode = true;
        this.pointer.laser = true;
        this.alignmentCallbackName = callbackName;

        // Set the laser to point to the sample hole...
        let laserCoord = this.toCNC(sampleCoord);
        let spindleCoord  = this.pointer.toSpindlePos(laserCoord);
        this.cnc.goto(spindleCoord, wcsPCB_WORK);
    }


    finishAlignment() {
        this.alignmentMode = false;
        this.jogMode = false;
        this.pointer.laser = false;
        let spindleCoord = this.cnc.wpos;
        let laserCoord = this.pointer.toLaserPos(spindleCoord);
        let pcbCoord = this.toPCB(laserCoord);
        let callbackName = this.alignmentCallbackName;
        console.log(`Finished getAlignmentHole().  Calling ${callbackName} with ${JSON.stringify(pcbCoord)}`)
        this.ipcSend(callbackName, pcbCoord);
    }


    findWorkOrigin(callbackName, profile) {
        console.log(`Starting findWorkOrigin().  Callback event is ${callbackName}`)
        this.boardOriginM = undefined;
        this.setProfile(profile);

        this.findOriginMode = true;
        this.jogMode = true;
        this.pointer.laser = true;
        this.findOriginCallbackName = callbackName;

        // Calculate the estimated position of the stock's lower
        // left corner, in machine coordinates;
        let cncConfig = this.config.cnc;
        // Start at home pos...
        let mpos = { x: 0, y: 0};
        // Move to upper right of frame
        let frameMargin = cncConfig.pcbFrame.margin;
        mpos.x += cncConfig.locations.ur.x - frameMargin; 
        mpos.y += cncConfig.locations.ur.y - frameMargin;
        // Now, estimate the lower left position...
        mpos.x -= profile.stock.width;
        mpos.y -= profile.stock.height;

        let laserCoord = mpos;
        let spindleCoord  = this.pointer.toSpindlePos(laserCoord);
        console.log(`Goto estimated work start(${JSON.stringify(spindleCoord )})...`);
        this.cnc.goto(spindleCoord, wcsMACHINE_WORK);
    }


    finishFindWorkOrigin() {
        this.findOriginMode = false;
        this.jogMode = false;
        this.pointer.laser = false;
        let spindleCoord = this.cnc.mpos;
        let laserCoord = this.pointer.toLaserPos(spindleCoord);
        this.cnc.goto(laserCoord, wcsMACHINE_WORK);
        this.cnc.zeroWorkXY(wcsPCB_WORK);

        this.boardOriginM = laserCoord;
        let origin = this.boardOriginM;
        let ur = this.config.cnc.locations.ur;
        let margin = this.config.cnc.pcbFrame.margin;
        let actualWidth = -(origin.x - ur.x) + margin;
        let actualHeight = -(origin.y - ur.y) + margin;
        this.profile.stock.actual = { width: actualWidth, height: actualHeight }; 

        this.cnc.goto({x: 0, y: 0}, wcsPCB_WORK);

        let callbackName = this.findOriginCallbackName;
        let returnData = this.profile.stock.actual;
        console.log(`Finished findWorkOrigin().  Calling ${callbackName} with ${JSON.stringify(returnData)}`)        
        this.ipcSend(callbackName, returnData);
    }


    findZPadSurface() {
        let thiz = this;
        this.findZPadInProgress = true;
        return new Promise((resolve, reject) => {
            let zheight = thiz.config.cnc.zheight;
            let zpad = thiz.config.cnc.locations.zpad;

            thiz.gotoSafeZ();
            let zpos = zheight.zpad.lastZ ? zheight.zpad.lastZ + 2.5 : zheight.zpad.startZ;
            thiz.cnc.goto({ x: zpad.x, y: zpad.y, z: zpos }, wcsMACHINE_WORK);
            thiz.cnc.sendGCode(['G91', 'G38.2 Z-14 F20', 'G90']);

            thiz.cnc.once('probe', (probeVal) => {

                if (!thiz.findZPadInProgress) {
                    thiz.gotoSafeZ();
                    return;
                }

                thiz.findZPadInProgress = false;

                // Retract 4mm from the touch plate
                thiz.cnc.sendGCode(['G91', 'G0 Z4', 'G90']);

                if (probeVal.ok) {
                    zheight.zpad.lastZ = probeVal.z;
                    console.log(`Zprobe of pad found at ${probeVal.z}`)
                    resolve(probeVal);
                }
                else {
                    thiz.ipcSend('ui-popup-message', `ERROR: Z probe failed`);
                    reject(probeVal);
                }
            });
        });
    }


    findPCBSurface() {
        let thiz = this;
        this.findPCBSurfaceInProgress = true;
        this.findZPadSurface()
            .then(probeVal => {

                if (!thiz.findPCBSurfaceInProgress) {
                    thiz.cnc.goto({z: thiz.config.cnc.zheight.safe }, wcsMACHINE_WORK);
                    return;
                }

                return new Promise((resolve, reject) => {
                    let zheight = thiz.config.cnc.zheight;
                    let zpad = thiz.config.cnc.locations.zpad;
                    let zPadVal = probeVal;
                   
                    // Now move the probe away from the pad to over the PCB by 5mm...
                    let moveY = 0 - thiz.config.cnc.pcbFrame.width - 5;

                    // The Z probe should be lowered 4mm (the retract height from Z), and then
                    // approx 4mm above where we think the PCB surface is...
                    let moveZ = 0 - 4 - thiz.config.cnc.pcbFrame.height + 2;

                    thiz.cnc.sendGCode(['G91', `G0 Y${moveY}`, `G0 Z${moveZ}`, 'G90']);

                    // Now start another Z probe...
                    thiz.cnc.sendGCode(['G91', 'G38.2 Z-10 F20', 'G90']);
        
                    thiz.cnc.once('probe', (probeVal) => {
        
                        if (!thiz.findPCBSurfaceInProgress) {
                            thiz.gotoSafeZ();
                            return;
                        }

                        thiz.findPCBSurfaceInProgress = false;

                        // Set the primary work coordinate Z height to the probe
                        // value, then retract 4mm
                        thiz.cnc.sendGCode([`G10 L20 P${wcsPCB_WORK} X0 Y0 Z0`, 'G91', 'G0 Z4', 'G90']);
        
                        if (probeVal.ok) {
                            zheight.pcb.lastZ = probeVal.z;
                            console.log(`Zprobe of pcb found at ${probeVal.z}`)
                            resolve(probeVal);
                        }
                        else {
                            thiz.ipcSend('ui-popup-message', `ERROR: Z probe failed`);
                            reject(probeVal);
                        }
                    });
                });
            })
            .then(probeVal => {
                MainMQ.emit('pcb-surface-found', this.cnc.mpos);
            });
    }


    loadStock() {
        let load = this.config.cnc.locations.load;
        this.cnc.goto({x: load.x, y: load.y, z: -1 }, wcsMACHINE_WORK);
    }


    autolevelPCB(profile) {

        this.cnc.selectWCS(wcsPCB_WORK);
        this.cnc.goto({x: 0, y: 0}, wcsPCB_WORK);
        let probeFeedRate = 50;
        let margin = 5;
        let stockWidth = this.profile.stock.width;
        let stockHeight = this.profile.stock.height;
        let probeHeight = 1;
        let gridSize = 7.5;
        let gcode = `(#autolevel D${gridSize} H${probeHeight} F${probeFeedRate} M${margin} P1 X${stockWidth} Y${stockHeight})`;

        this.autolevelInProgress = true;
        console.log('Starting autolevel');
        this.cnc.sendGCode(gcode);
    }


    async millPCB(profile, callbackName) {
        let thiz = this;
        this.millPCBInProgress = true;

        let fnRejectIfCanceled = () => {
            return (!thiz.millPCBInProgress);
        };

        try {
            let workFile = await ProjectLoader.getWorkFileContents(profile);

            this.cnc.senderLoad(workFile.name, workFile.contents);

            await untilTrue(1000, () => { thiz.cnc.getSenderStatus() === CNC.SENDER_LOADED}, fnRejectIfCanceled);

            this.cnc.sendGCode('(#autolevel_reapply)');

            await untilTrue(1000, () => { !thiz.cnc.getFeederState().pending }, fnRejectIfCanceled);

            this.cnc.senderStart();

            await untilTrue(1000, () => { thiz.cnc.getSenderStatus() === CNC.SENDER_DONE}, fnRejectIfCanceled);

            this.ipcSend(callbackName, thiz.cnc.getSenderState().elapsedTime);            

        }
        catch (err) {
            this.millPCBInProgress = false;
            console.log('Error during milling');
            console.log(err);
        }
    }


    toCNC(pcbCoord) {
        return Object.assign({}, pcbCoord);
    }


    toPCB(cncCoord) {
        return Object.assign({}, cncCoord);
    }

}

module.exports = CNCController;
