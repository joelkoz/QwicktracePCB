//const ADS1115 = require('ads1115')
const ADS1115 = require('./ads1115-client.js')
const fs = require('fs');
const { setIntervalAsync } = require('set-interval-async/fixed')
const { clearIntervalAsync } = require('set-interval-async')
const Config = require('./Config.js');

class Joystick {

    constructor() {
 
       if (!Joystick.instance) {
         Joystick.instance = this;
 
         this.sampX = 13000;
         this.sampY = 13000;
         this.sampBtn = 9999;
 
         if (Config.joystick.msSampleInterval) {
            Joystick.msJOYSTICK_SAMPLE_INTERVAL = Config.joystick.msSampleInterval;
         }
         else {
            Joystick.msJOYSTICK_SAMPLE_INTERVAL = 25;
         }
 
         Joystick.i2cJoystick = [ 1, 0x48 ]
      
         if (Config.joystick) {
            Joystick.xCal = Config.joystick.calibration.xCal;
            Joystick.yCal = Config.joystick.calibration.yCal;
            Joystick.btnPressThreshold = Config.joystick.calibration.btnPressThreshold;
            Joystick.invertY = Config.joystick.invertY;
            Joystick.invertX = Config.joystick.invertX;
         }
         else {
            Joystick.xCal = {
               min: 99999,
               max: -1,
               mid: -99,
               deadLo: 50,
               deadHi: 50
            };
            
            Joystick.yCal = {
               min: 99999,
               max: -1,
               mid: -99,
               deadLo: 50,
               deadHi: 50
            };
            Joystick.btnPressThreshold = 500;
         }
         this.start();
      }

       return Joystick.instance;
    }
 
    static init() {
       if (!Joystick.instance) {
          new Joystick();
       }
    }
 
    start() {
       let thiz = this;
       ADS1115.open(...Joystick.i2cJoystick).then((ads1115) => {
 
         ads1115.gain = 1
         let readErrorCount = 0;

         this.sampIntervalId = setIntervalAsync(async () => {
            try {
               thiz.sampX = await ads1115.measure('0+GND');
               thiz.sampY = await ads1115.measure('1+GND');
               thiz.sampBtn = await ads1115.measure('2+GND');
               readErrorCount = 0;
            }
            catch (err) {
               // It is OK to get the occasional read error due to noise. Three consecutive errors,
               // however, is a problem, and we should report it.
               readErrorCount++;
               if (readErrorCount > 2) {
                  console.log('Error taking joystick sample: ', err);
               }
            }

         }, Joystick.msJOYSTICK_SAMPLE_INTERVAL);

         Joystick.ready = true;
         
       }).catch((err) => {
          console.log(`ERROR initializing Joystick: ${JSON.stringify(err)}`);
       });
    }
 
 
    stop() {
      clearIntervalAsync(this.sampIntervalId);
    }

    
    static xVal() {
      if (Joystick.ready) {
         let thiz = Joystick.instance;
         let val = thiz.stickVal(Joystick.xCal, thiz.sampX);
         return (Joystick.invertX ? -val : val);         
      }
      else {
        return 0;
      }
    }
 
 
    static yVal() {
      if (Joystick.ready) {
         let thiz = Joystick.instance;
         let val = thiz.stickVal(Joystick.yCal, thiz.sampY);
         return (Joystick.invertY ? -val : val);
      }
      else {
        return 0;
      }
    }
 
    
    static stickVal() {
       return { x: Joystick.xVal(), y: Joystick.yVal() };
    }
 

    static rawVal() {
      if (Joystick.instance.calibration) {
         Joystick.instance.calibrate();
      }
      return { x: Joystick.instance.sampX, y: Joystick.instance.sampY };
   }

   static rawBtn() {
      return Joystick.instance.sampBtn;
   }


   static calibrate() {
      Joystick.instance.calibration = { x: { min: 999999, max: 0, mid: -99 }, y: { min: 999999, max: 0, mid: -99  }, btn: { min: 999999, max: 0, mid: -99  } }
   }


   static btnVal() {
      if (Joystick.ready) {
         let thiz = Joystick.instance;
         return (thiz.sampBtn < Joystick.btnPressThreshold);
      }
      else {
        return false;
      }
    }
 
 
    calibrate() {
        if (this.calibration) {
           this._saveCalibrationSample(this.calibration.x, this.sampX);
           this._saveCalibrationSample(this.calibration.y, this.sampY);
           this._saveCalibrationSample(this.calibration.btn, this.sampBtn);
        }
    }

    _saveCalibrationSample(cal, val) {
       if (val < cal.min) {
          cal.min = val;
       }
       if (val > cal.max) {
          cal.max = val;
       }
       if (cal.mid == -99) {
         cal.mid = val;
       }
    }
     
 
    stickVal(cal, raw) {
     
        let mid;
        if (raw <= cal.mid) {
           mid = cal.mid - cal.deadLo;
           if (raw >= mid) {
              return 0;
           }
        }
        else {
           mid = cal.mid + cal.deadHi;
           if (raw <= mid) {
              return 0;
           }
        }
     
        let range;
        if (raw < cal.mid) {
          range = mid - cal.min;
        }
        else {
          range = cal.max - mid;
        }
     
        let val = raw - mid;
     
        return (val / range);
     
    }
 
 }

module.exports = Joystick;
