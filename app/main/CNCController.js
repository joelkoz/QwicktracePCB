const { ipcMain } = require('electron');
const LaserPointer = require('./LaserPointer');
const MainSubProcess = require('./MainSubProcess.js')


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

class CNCController  extends MainSubProcess {

    constructor(win) {
        super(win);

        console.log('Initializing CNC mill...');

        const Joystick = require('./Joystick');
        const ZProbe = require('./ZProbe');
        CNC = require('./CNC');
        const LaserPointer = require('./LaserPointer');
        const Kefir = require('kefir');
        
        this.cnc = new CNC();
        this.pointer = new LaserPointer();

        const thiz = this;

        const msStickCheck = 100;
        this.stick = Kefir.fromPoll(msStickCheck, Joystick.stickVal).filter(hasChanged());
        this.stickBtn = Kefir.fromPoll(msStickCheck, Joystick.btnVal).filter(hasChanged());
        
        this.jogMode = false;
        this.jogZ = false;

        stick.onValue(stick => {
            if (thiz.jogMode) {
               thiz.cnc.jog(-stick.x, stick.y, jogZ);
            }
            else {
                ipcMain.invoke('ui-joystick', stick);
            }
        });
        
        
        stickBtn.onValue(pressed => {
            if (pressed) {
              if (thiz.alignmentMode) {
                 thiz.finishAlignment();
              }
              else if (thiz.jogMode) {
                 thiz.jogZ = !thiz.jogZ;
              }
              else {
                  ipcMain.invoke('ui-joystick-press');
              }
            }
        });

        ipcMain.handle('cnc-align', (event, paramObj) => {
            thiz.getAlignmentHole(paramObj.callbackName, paramObj.sampleCoord);
        });

        ipcMain.handle('cnc-cancel', (event, paramObj) => {
            thiz.cancelProcesses();
        });

        this.cncConnected = false;
        this.cnc.on('ready', () => {
            thiz.cncConnected = true;
            console.log('CNC ready for use.');
            thiz.cnc.sendGCode('G21');
            thiz.cnc.unlock();
            thiz.cnc.home();
        });

        this.cnc.on('closed', () => {
            thiz.cncConnected = false;
        });

        this.cnc.on('state', (state) => {

            if (state === CNC.CTRL_STATE_HOME) {
                if (!thiz.homeInProgress) {
                    thiz.homeInProgress = true;
                    console.log('CNC home in progress...');
                }
            }

            if (state === CNC.CTRL_STATE_IDLE) {
                if (thiz.homeInProgress) {
                    // We just finished doing a home
                    // Zero out the work coordinates...
                    thiz.homeInProgress = false;
                    cnc.sendGCode('G10 L20 P1 X0 Y0');
                }
            }

            ipcMain.invoke('render-cnc-state', state);
        });

        this.cnc.connect();


    }

    cancelProcesses() {
        if (this.alignmentMode) {
           console.log("Canceling active CNC alignment.");
           this.alignmentMode = false;
        }

        if (this.jogMode) {
            this.jogMode = false;
        }

        this.pointer.laser = false;
    }
    
    getAlignmentHole(callbackName, sampleCoord) {
        this.alignmentMode = true;
        this.jogMode = true;
        this.pointer.laser = true;

        // Set the laser to point to the sample hole...
        let cncCoord = toCNC(sampleCoord);
        cncCoord.x += LaserPointer.offsetX;
        cncCoord.y += LaserPointer.offsetY;
        this.cnc.goto(cncCoord)
    }


    finishAlignment() {
        this.alignmentMode = false;
        this.jogMode = false;
        this.pointer.laser = false;
        let cncCoord = Object.assign({}, this.cnc.wpos);
        cncCoord.x -= LaserPointer.offsetX;
        cncCoord.y -= LaserPointer.offsetY;
        let pcbCoord = this.toPCB(cncCoord);
        ipcMain.invoke(callbackName, pcbCoord);
    }

    toCNC(pcbCoord) {
    }


    toPCB(cncCoord) {
    }
}

module.exports = CNCController;
