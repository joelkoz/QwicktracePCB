const MainSubProcess = require('./MainSubProcess.js')
const MainMQ = require('./MainMQ.js');
const ProjectLoader = require('./ProjectLoader.js');
const { untilTrue, untilEvent, untilDelay } = require('promise-utils');
const Config = require('./Config.js');
const { setIntervalAsync, SetIntervalAsyncError } = require('set-interval-async/fixed')
const { clearIntervalAsync } = require('set-interval-async')


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

    constructor(win) {
        super(win, 'cnc');

        console.log('Initializing CNC mill...');

        const Joystick = require('./Joystick');
        const ZProbe = require('./cnc/ZProbe');
        CNC = require('./cnc/CNC');
        const LaserPointer = require('./cnc/LaserPointer');
        const Kefir = require('kefir');
        
        this.cnc = new CNC();
        this.pointer = new LaserPointer();
        this.zprobe = new ZProbe();
        Joystick.init();

        const thiz = this;

        const msStickCheck = 100;
        this.stick = Kefir.fromPoll(msStickCheck, Joystick.stickVal).filter(hasChanged());
        this.stickBtn = Kefir.fromPoll(msStickCheck, Joystick.btnVal).filter(hasChanged());
        
        this.__jogZ = false;
        this.jogMode = false;

        // Pass on some configuration values...
        CNC.travel.x = Math.abs(Config.cnc.locations.maxLL.x)
        CNC.travel.y = Math.abs(Config.cnc.locations.maxLL.y)
        CNC.travel.z = Math.abs(Config.cnc.zheight.maxJog)

        this.stick.onValue(stick => {
            if (thiz.jogMode) {
                thiz.cnc.jog(stick.x, stick.y, thiz.jogZ);
            }
            else {
                MainMQ.emit('global.cnc.joystick', stick);
            }
        });
        
        
        this.stickBtn.onValue(pressed => {
            if (thiz.stickBtnDebounceDelay) {
                clearInterval(thiz.stickBtnDebounceDelay)
            }
            thiz.stickBtnDebounceDelay = setTimeout(() => {
                thiz.stickBtnDebounceDelay = null;
                if (pressed) {
                     MainMQ.emit('global.cnc.joystickPress', thiz.jogMode);
                    if (thiz.jogMode) {
                        thiz.jogZ = !thiz.jogZ;
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

            MainMQ.emit('render.cnc.state', state);
        });

        this.__lastSpindle = -1

        this.cnc.on('pos', (data) => {
            // For debugging spindle status...
            let spindle = data.spindle
            if (spindle != thiz.__lastSpindle) {
                console.log('Spindle rpm: ', spindle)
                thiz.__lastSpindle = spindle;
            }
            // ------------------------------

            MainMQ.emit('render.cnc.pos', data);
        });

        this.zprobe.on(ZProbe.EVT_PRESSED, (state) => {
            MainMQ.emit('render.cnc.zprobe', state);
        });

        this.pointer.on('state', (state) => {
            MainMQ.emit('render.cnc.laser', state);
        });

        this.cnc.on('sent', (data) => {
            
            if (thiz.autolevelInProgress) {
                if (data.startsWith('(AL: start probe:')) {
                    // `(AL: start probe: ${this.planedPointCount} points)`
                    let endNdx = data.indexOf(' points')
                    let probeCount = parseInt(data.slice(18, endNdx));
                    console.log(`Autolevel starting on ${probeCount} points`);
                    MainMQ.emit('render.cnc.autolevelProbeCount', probeCount);
                }
                else if (data.startsWith('(AL: probing point')) {
                    // (AL: probing point ${this.planedPointCount + 1})
                    let endNdx = data.indexOf(')')
                    let probeNum = parseInt(data.slice(19, endNdx));
                    console.log(`Autolevel probing point`, probeNum);
                    MainMQ.emit('render.cnc.autolevelProbeNum', probeNum);
                }
                else if (data.startsWith('(AL: done')) {
                    thiz.autolevelInProgress = false;
                    console.log('Autolevel completed');
                    this.gotoSafeZ();
                    MainMQ.emit('cnc-autolevel-complete');
                }
            }
            else if (thiz.autolevelReapplyInProgress) {
                if (data.startsWith('(AL: finished')) {
                    thiz.autolevelReapplyInProgress = false;
                    console.log('Autolevel apply completed');
                    MainMQ.emit('cnc-autolevel-apply-complete');
                }
                else if (data.startsWith('(AL: error occurred')) {
                    thiz.autolevelReapplyInProgress = false;
                    console.log('Autolevel apply ended in error')
                    // (AL: error occurred ${x})
                    let endNdx = data.indexOf(')')
                    let msg = data.slice(20, endNdx);
                    MainMQ.emit('render.ui.popupMessage', `Autolevel failed: ${msg}`);
                }
            }
        });

        this.cnc.on('alarm', (msg) => {
            MainMQ.emit('render.ui.popupMessage', `ALARM: ${msg}`);
        });

        this.cnc.on('error', (msg) => {
            MainMQ.emit('render.ui.popupMessage', `ERROR: ${msg}`);
        });

        // Define the RPC API that this object serves...
        this.rpcAPI( {
            async home() {
                thiz.cnc.home();
                await untilEvent(MainMQ.getInstance(), 'cnc-homed', 60000);
                return thiz.cnc.mpos;
            },

            async zPadPosition() {
                let result = await thiz.zPadPosition();
                return result;
            },

            async zProbePad(saveXY = false) {
                let result = await thiz.findZPadSurface(saveXY);
                return result;
            },


            async zProbePCB() {
                let result = await thiz.findPCBSurface();
                return result;
            },


            async zProbeGeneric(probeSurfaceName = 'generic') {
                let result = await thiz.genericZProbe(probeSurfaceName)
                return result;
            },


            async moveXY(mmX, mmY) {
                let mpos = thiz.cnc.mpos;
                let x = mpos.x + mmX;
                let y = mpos.y + mmY;
                await thiz.cnc.untilGoto({ x, y }, wcsMACHINE_WORK);
                return thiz.cnc.mpos;
            },

            async getMPos() {
                return thiz.cnc.mpos;
            },

            async getWPos() {
                return thiz.cnc.wpos;
            },

            async goto(pos, wcsNum = wcsMACHINE_WORK, feedRate = null) {
                await thiz.cnc.untilGoto(pos, wcsNum, feedRate);
                return thiz.cnc.mpos;
            },

            async setWorkCoord(pos = { x: 0, y: 0}, wcsNum = wcsPCB_WORK) {
                thiz.cnc.setWorkCoord(pos, wcsNum);
                await thiz.cnc.untilOk();
                return thiz.getPos(wcsNum);
            },


            async zeroPCBWorkPos() {
                return await thiz.api.setWorkCoord({ x: 0, y: 0}, wcsPCB_WORK);
            },

            async jogMode(modeOn) {
                let oldMode = thiz.jogMode;
                thiz.jogMode = modeOn;
                thiz.jogZ = false;
                return oldMode;
            },

            async cancelProcesses() {
                await thiz.cancelProcesses();
                return true;
            },

            async reset() {
                await thiz.resetCNC();
                return true;
            },

            async loadStock() {
                let load = Config.cnc.locations.load;
                await thiz.cnc.untilGoto({ z: -1 }, wcsMACHINE_WORK);
                await thiz.cnc.untilGoto({ x: load.x, y: load.y }, wcsMACHINE_WORK);
                return thiz.cnc.mpos;
            },


            async locatePoint(startingPos, wcsNum = wcsMACHINE_WORK) {
                return thiz.locatePoint(startingPos, wcsNum);
            },

            async setPointer(newVal, newCoord, wcsNum = wcsMACHINE_WORK) {
                if (newVal === undefined) {
                    newVal = !this.pointer.laser;
                }
                return await thiz.setPointer(newVal, newCoord, wcsNum);
            },

            async setLaserOnly(newVal) {
                thiz.pointer.laser = newVal;
            },

            async findPCBOrigin(stock) {
                return thiz.findPCBOrigin(stock);
            },

            async autolevelPCB(stock) {
                await thiz.autolevelPCB(stock);
                return true;
            },

            async gotoSafeZ() {
                await thiz.gotoSafeZ();
                return thiz.cnc.mpos;
            },

            async autolevelPCB(stock) {
                return await thiz.autolevelPCB(stock);
            },

            async millPCB(profile) {
                return await thiz.millPCB(profile)
            },

            async drillPCB(profile) {
                return await thiz.drillPCB(profile)
            },

            async enableHardLimits(enabled) {
                return await thiz.cnc.setHardLimit(enabled)
            },

            async getPinReport() {
                return await thiz.getPinReport()
            },

            async streamPinReport(eventName, msInterval = 1000) {
                return thiz.streamPinReport(eventName, msInterval)
            },

            async setRpm(newRpm) {
                return await thiz.setRpm(newRpm)
            },

            async calibratePointer(calibration) {
                let s = calibration.spindle;
                let l = calibration.laser;
                let pointer = Config.cnc.pointer || {}
                let offset = pointer.offset || {}
                offset.x = s.x - l.x;
                offset.y = s.y - l.y;
                Config.cnc.pointer = pointer;
                Config.cnc.pointer.offset = offset;
                thiz.pointer.setCalibration(offset);
                Config.save();
                return offset;
            }
        });

        const server = Config.cnc.server;
        this.cnc.connect(server.host, server.port, server.serialPort, server.baudRate);
    }

    get jogMode() {
        return this.__jogMode;
    }

    set jogMode(newMode) {
        if (this.__jogMode != newMode) {
           this.__jogMode = newMode;
           MainMQ.emit('render.cnc.jog', { jogMode: this.__jogMode, jogZ: this.__jogZ })
        }
    }

    get jogZ() {
        return this.__jogZ;
    }

    set jogZ(newMode) {
        if (this.__jogZ != newMode) {
           this.__jogZ = newMode;
           MainMQ.emit('render.cnc.jog', { jogMode: this.__jogMode, jogZ: this.__jogZ })
        }
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


    async resetCNC() {
        console.log('CNC reset: UI requested reset...');

        this.cancelProcesses();
        this.cnc.reset();

        console.log('CNC reset: waiting for home state...');
        await this.cnc.untilState(CNC.CTRL_STATE_HOME)
        console.log('CNC reset: waiting for idle state...');
        await this.cnc.untilState(CNC.CTRL_STATE_IDLE)
        console.log('CNC reset: request completed.');
    }

    async killFeeder() {
        console.log("Killing feeder queue...");
        await this.cnc.feederReset();
        await this.gotoSafeZ();
    }


    async gotoSafeZ() {
        console.log("Move to safe Z height...");
        await this.cnc.untilGoto({z: Config.cnc.zheight.safe }, wcsMACHINE_WORK);
    }


    async getPinReport() {
        this.cnc.report();

        let rpt = { xLimit: false, yLimit: false, zLimit: false, probe: false }

        await this.cnc.untilData((data) => {
            if (data.startsWith('<')) {
                // Report data. Example:
                // <Idle|MPos:-1.000,-1.000,-1.000|FS:0,0|Pn:PXZ>
                let vals = data.split('|');
                for (let val of vals) {
                    if (val.startsWith('Pn:')) {
                        // This is pin report...
                        rpt.xLimit = (val.indexOf('X', 3) > 0)
                        rpt.yLimit = (val.indexOf('Y', 3) > 0)
                        rpt.zLimit = (val.indexOf('Z'), 3 > 0)
                        rpt.probe = (val.indexOf('P', 3) > 0)
                    }
                    else if (val.startsWith('FS:')) {
                        let strSpindle = val.slice(3)
                        let parts = strSpindle.split(',');
                        rpt.feedRate = parseInt(parts[0], 10)
                        rpt.spindle = parseInt(parts[1], 10);
                    }
                }
                return true;
            }
            else {
                // Not the data we are looking for...
                return false;
            }
        });

        // Return the results...
        return rpt;
    }


    streamPinReport(eventName, msInterval = 1000) {
        if (eventName) {
            // A request to turn ON report streaming...
            this._streamPinReportOff();
            let fnChanged = hasChanged();
            this.autoReportId = setIntervalAsync(async () => {
                let rpt = await this.getPinReport();
                if (fnChanged(rpt)) {
                    MainMQ.emit(eventName, rpt);
                }
            }, msInterval);
        }
        else {
            // A request to end report streaming...
            this._streamPinReportOff();
        }
    }

    _streamPinReportOff() {
        if (this.autoReportId) {
            clearIntervalAsync(this.autoReportId);
            delete this.autoReportId;
        }
    }


    async cancelProcesses() {

        this.streamPinReport(false);

        if (this.genericZProbeInProgress) {
            console.log("Canceling active zprobe")
            this.genericZProbeInProgress = false;
            await this.killFeeder();
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
             this.cnc.rawWriteLn('!');
             this.cnc.rpm = 0;
             this.cnc.senderStop();
             await this.cnc.untilSent();
             await this.gotoSafeZ();
             await this.cnc.untilState(CNC.CTRL_STATE_IDLE);
        }


        if (this.drillPCBInProgress) {
            console.log("Canceling PCB drilling");
            this.drillPCBInProgress = false;
            this.cnc.rpm = 0;
            await this.gotoSafeZ();
        }


        if (this.jogMode) {
            this.jogMode = false;
            this.jogZ = false;
        }

        this.pointer.laser = false;

        if (this.cnc.rpm > 0) {
            this.cnc.rpm = 0;
        }
    }
    

    getPos(wcsNum = wcsMACHINE_WORK) {
        if (wcsNum == wcsMACHINE_WORK) {
            return this.cnc.mpos;
        }
        else {
            return this.cnc.wpos;
        }
    }


    async setRpm(newRpm) {

        this.cnc.rpm = newRpm;

        let spindle = -1

        let rptInterval = setIntervalAsync(async () => {
            let rpt = await this.getPinReport();
            spindle = rpt.spindle;
        }, 500);

        await untilTrue(700, () => { return spindle === newRpm || this.cnc.rpm === newRpm })

        clearIntervalAsync(rptInterval);
    }

    
    async setPointer(newVal, newCoord, wcsNum = wcsMACHINE_WORK) {

        if (!newCoord) {
            // No coordinate specified, so use the current position...
            newCoord = this.getPos(wcsNum);
            delete newCoord.z;
        }

        if (newVal) {
            // Turning the laser on...
            this.pointer.laser = true;
            let laserCoord = newCoord;
            let spindleCoord  = this.pointer.toSpindlePos(laserCoord);
            await this.cnc.untilGoto(spindleCoord, wcsNum);
        }
        else if (this.pointer.laser) {
           // Turning the laser off...
           this.pointer.laser = false;
           let spindleCoord = newCoord;
           let laserCoord = this.pointer.toLaserPos(spindleCoord);
           await this.cnc.untilGoto(laserCoord, wcsNum);
        }
        return this.pointer.laser;
    }


    async locatePoint(startingPos, wcsNum = wcsMACHINE_WORK) {
        // Turn laser on...
        await this.setPointer(true, startingPos, wcsNum);
        this.jogMode = true;
        let thiz = this;
        await untilEvent(MainMQ.getInstance(), 'global.cnc.joystickPress', () => { return thiz.jogMode === false })
        this.jogMode = false;
        if (this.cnc.state !== CNC.CTRL_STATE_IDLE) {
            // Wait for the jog to finish...
            await this.cnc.untilState(CNC.CTRL_STATE_IDLE);
        }
        await this.setPointer(false);
        return this.getPos(wcsNum);
    }


    async findPCBOrigin(stock) {
        console.log(`Starting findPCBOrigin()...`)

        // Calculate the estimated position of the stock's lower
        // left corner, in machine coordinates.  Start at 
        // upper right corner...
        let ur = Config.cnc.locations.ur;
        let mpos = { x: ur.x, y: ur.y }

        // Now, estimate the lower left position...
        mpos.x -= stock.width;
        mpos.y -= stock.height;

        // Have end user select the starting point...
        let origin = await this.locatePoint(mpos);

        // Zero that out as the PCB word coordinate
        await this.api.zeroPCBWorkPos();

        let actualWidth = -(origin.x - ur.x);
        let actualHeight = -(origin.y - ur.y);
        let stockActual = { width: actualWidth, height: actualHeight }; 
        return stockActual;
    }

    async zPadPosition() {

        let zheight = Config.cnc.zheight;
        let zpad = Config.cnc.locations.zpad;

        await this.gotoSafeZ();

        let zpos = zheight.zpad.lastZ ? zheight.zpad.lastZ + 5 : zheight.zpad.startZ;

        await this.cnc.untilGoto({ x: zpad.x, y: zpad.y, z: zpos }, wcsMACHINE_WORK);

        this.jogMode = true;
        this.jogZ = true;
    }


    async zPadPositionSet() {
        let zpad = Config.cnc.locations.zpad;
        zpad.x = this.cnc.mpos.x;
        zpad.y = this.cnc.mpos.y;
        Config.save();
    }


    async findZPadSurface(saveNewXY = false) {

        this.findZPadInProgress = true;

        let zheight = Config.cnc.zheight;

        // Start to probe...      
        await this.cnc.feedGCode(['(Start zPad probe)', 'G91']);

        this.cnc.sendGCode('G38.2 Z-14 F20');
        let probeVal = await untilEvent(this.cnc, 'probe');

        await this.cnc.feedGCode(['G90', '(End zPad probe)'])

        if (!this.findZPadInProgress) {
            this.gotoSafeZ();
            return null;
        }

        this.findZPadInProgress = false;

        if (probeVal.ok) {
            // Set the primary work coordinate Z height to the probe value
            this.cnc.sendGCode(`G10 L20 P${wcsPCB_WORK} Z0`);
            await this.cnc.untilOk();

            // This delay seems to be necessary to prevent 'Unsupported Command'
            // errors from the Gbrl controller following the coordinate reset.
            await untilDelay(1500);

            // Then retract 4 mm
            await this.cnc.feedGCode(['G91', 'G0 Z4', 'G90'])

            if (this.cnc.wpos.z != 4) {
                console.log('Post probe zPad Z position unexpected. Repositioning...');
                await this.cnc.untilGoto({z: 4}, wcsPCB_WORK);
            }

            let zpad = Config.cnc.locations.zpad;
            if (saveNewXY) {
                zpad.x = probeVal.x;
                zpad.y = probeVal.y;
            }
            zheight.zpad.lastZ = probeVal.z;
            Config.save();

            console.log(`Zprobe of pad found at ${probeVal.z}`)
            return probeVal.z;
        }
        else {
            MainMQ.emit('render.ui.popupMessage', `ERROR: Z probe failed`);
            return null;
        }

    }


    async findPCBSurface() {
        this.findPCBSurfaceInProgress = true;

        let zheight = Config.cnc.zheight;

        // Move to 2 mm above the PCB surface...
        let zpadZ = zheight.zpad.lastZ;
        let estZ = zpadZ + zheight.zpad.pcbOffset + 2

        await this.cnc.untilGoto({z: estZ}, wcsMACHINE_WORK);


        // Now start another Z probe...
        await this.cnc.feedGCode(['(Start pcb probe)', 'G91']);            
        this.cnc.sendGCode('G38.2 Z-10 F20');
        let probeVal = await untilEvent(this.cnc, 'probe');

        await this.cnc.feedGCode(['G90', '(End pcb probe)']);

        if (!this.findPCBSurfaceInProgress) {
            this.gotoSafeZ();
            return null;
        }

        this.findPCBSurfaceInProgress = false;

        if (probeVal.ok) {
            // Set the primary work coordinate Z height to the probe value
            await this.cnc.feedGCode(`G10 L20 P${wcsPCB_WORK} Z0`);

            // This delay seems to be necessary to prevent 'Unsupported Command'
            // errors from the Gbrl controller following the coordinate reset.
            await untilDelay(1500);

            // Retract 4mm
            await this.cnc.feedGCode(['G91', 'G0 Z4', 'G90'])

            let probedOffset = zpadZ - probeVal.z;
            zheight.zpad.pcbOffsetProbed = probedOffset;
            zheight.pcb = { lastZ: probeVal.z }
            Config.save();
            
            console.log(`Zprobe of pcb found at ${probeVal.z}`)
            return probeVal.z;
        }
        else {
            MainMQ.emit('render.ui.popupMessage', `ERROR: Z probe failed`);
            return null;
        }
    }


    async genericZProbe(probeSurfaceName = 'generic') {

        this.genericZProbeInProgress = true;

        // Start to probe...      
        await this.cnc.feedGCode([`(Start ${probeSurfaceName} zprobe)`, 'G91']);

        this.cnc.sendGCode('G38.2 Z-14 F20');
        let probeVal = await untilEvent(this.cnc, 'probe');

        await this.cnc.feedGCode(['G90', `(End ${probeSurfaceName} zprobe)`])

        if (!this.genericZProbeInProgress) {
            this.gotoSafeZ();
            return null;
        }

        this.genericZProbeInProgress = false;

        if (probeVal.ok) {
            // Set the primary work coordinate Z height to the probe value
            this.cnc.sendGCode(`G10 L20 P${wcsPCB_WORK} Z0`);
            await this.cnc.untilOk();

            // This delay seems to be necessary to prevent 'Unsupported Command'
            // errors from the Gbrl controller following the coordinate reset.
            await untilDelay(1500);

            // Then retract 4 mm
            await this.cnc.feedGCode(['G91', 'G0 Z4', 'G90'])

            if (this.cnc.wpos.z != 4) {
                console.log('Post probe zPad Z position unexpected. Repositioning...');
                await this.cnc.untilGoto({z: 4}, wcsPCB_WORK);
            }

            console.log(`Zprobe found at ${probeVal.z}`)
            return probeVal;
        }
        else {
            MainMQ.emit('render.ui.popupMessage', `ERROR: Z probe failed`);
            return null;
        }

    }




    async autolevelPCB(stock) {

        this.cnc.selectWCS(wcsPCB_WORK);
        this.cnc.goto({x: 0, y: 0}, wcsPCB_WORK);
        let probeFeedRate = 50;
        let margin = 7;
        let stockWidth = stock.width;
        let stockHeight = stock.height;
        let probeHeight = 1;
        let gridSize = 7.5;
        let gcode = `(#autolevel D${gridSize} H${probeHeight} F${probeFeedRate} M${margin} P1 X${stockWidth} Y${stockHeight})`;

        this.autolevelInProgress = true;
        console.log('Starting autolevel');
        this.cnc.sendGCode(gcode);

        await untilEvent(MainMQ.getInstance(), 'cnc-autolevel-complete', () => { return this.autolevelInProgress === false })        
    }


    async millPCB(profile) {
        let thiz = this;
        this.millPCBInProgress = true;

        let fnRejectIfCanceled = () => {
            return (!thiz.millPCBInProgress);
        };

        try {
            console.log(`Starting PCB mill of ${profile.state.projectId}`, profile)
       
            this.cnc.senderUnload();

            await untilTrue(1000, () => { return thiz.cnc.getSenderStatus() === CNC.SENDER_EMPTY}, fnRejectIfCanceled);

            let workFile = await ProjectLoader.getWorkAsGcode(profile);

            this.cnc.senderLoad(workFile.name, workFile.contents);

            await untilTrue(1000, () => { return thiz.cnc.getSenderStatus() === CNC.SENDER_LOADED}, fnRejectIfCanceled);

            this.autolevelReapplyInProgress = true;
            this.cnc.sendGCode('(#autolevel_reapply)');

            await untilEvent(MainMQ.getInstance(), 'cnc-autolevel-apply-complete', 30000)

            this.cnc.senderStart();

            await this.cnc.untilState(CNC.CTRL_STATE_RUN);

            await untilTrue(1000, () => { return thiz.cnc.getSenderStatus() === CNC.SENDER_DONE}, fnRejectIfCanceled);

            await this.gotoSafeZ();

            this.millPCBInProgress = false;

            console.log(`Completed PCB mill of ${profile.state.projectId}`)
            return thiz.cnc.getSenderState().elapsedTime;
        }
        catch (err) {
            this.millPCBInProgress = false;
            console.log('Error during milling...');
            console.log(err)
            return new Error('Error during milling.', { cause: err} );
        }
    }


    async drillPCB(profile) {
        let thiz = this;
        this.drillPCBInProgress = true;

        let fnRejectIfCanceled = () => {
            return (!thiz.drillPCBInProgress);
        };

        try {
            console.log(`Starting drilling of ${profile.state.projectId}`, profile)
       
            let gbrData = await ProjectLoader.getWorkAsGerberData(profile);

            let holes = gbrData.holes;
            let holeCount = holes.length;
            let drillConfig = Config.cnc.drill;

            MainMQ.emit('render.cnc.drillCount', holeCount);
            let holeNum = 0;

            await this.gotoSafeZ();

            // Turn the drill on...
            this.cnc.rpm = drillConfig.rpm;
            await untilDelay(drillConfig.msStartupDelay)
            
            // Now, drill all of the holes...
            while (this.drillPCBInProgress && holeNum < holeCount) {

                  MainMQ.emit('render.cnc.drillNum', holeNum);
                  
                  let hole = holes[holeNum];
                  await this.cnc.untilGoto( hole.coord, wcsPCB_WORK );
                  await this.cnc.untilGoto({ z: drillConfig.startHeight }, wcsPCB_WORK)
                  await this.cnc.untilGoto({ z: drillConfig.drillDepth }, wcsPCB_WORK, drillConfig.plungeRate)
                  await this.cnc.untilGoto({ z: drillConfig.startHeight }, wcsPCB_WORK)

                  holeNum++;

            } // while

            this.cnc.rpm = 0

            await this.gotoSafeZ();

            this.drillPCBInProgress = false;

            console.log(`Completed PCB drill of ${profile.state.projectId}`)
            return true
        }
        catch (err) {
            this.drillPCBInProgress = false;
            console.log('Error during drilling');
            return new Error('Error during drilling.', { cause: err} );
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
