//const ADS1115 = require('ads1115')
const ADS1115 = require('./ads1115-client.js')
const fs = require('fs');
const { setIntervalAsync } = require('set-interval-async/fixed')
const { clearIntervalAsync } = require('set-interval-async')

class Joystick {

    constructor() {
 
       if (!Joystick.instance) {
         Joystick.instance = this;
 
         this.sampX = 13000;
         this.sampY = 13000;
         this.sampBtn = 9999;
 
         Joystick.msJOYSTICK_SAMPLE_INTERVAL = 100;
 
         Joystick.i2cJoystick = [1, 0x48, 'i2c-bus']
      
         Joystick.CAL_FILE = "joystick.json";
      
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
       
         Joystick.readJoystickCalibration();
       
         this.sampIntervalId = setIntervalAsync(async () => {
            thiz.sampX = await ads1115.measure('0+GND');
            thiz.sampY = await ads1115.measure('1+GND');
            thiz.sampBtn = await ads1115.measure('2+GND');
 
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
         return thiz.stickVal(Joystick.xCal, thiz.sampX);
      }
      else {
        return 0;
      }
    }
 
 
    static yVal() {
      if (Joystick.ready) {
         let thiz = Joystick.instance;
         return thiz.stickVal(Joystick.yCal, thiz.sampY);
      }
      else {
        return 0;
      }
    }
 
    
    static stickVal() {
       return { x: Joystick.xVal(), y: Joystick.yVal() };
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
 
 
    calibrate(cal, val) {
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
     
     
    static readJoystickCalibration() {
         if (fs.existsSync(Joystick.CAL_FILE)) {
           let json = fs.readFileSync(Joystick.CAL_FILE);
           let joystick = JSON.parse(json);
           Joystick.xCal = joystick.xCal;
           Joystick.yCal = joystick.yCal;
         }
    }
 
    
    static writeJoystickCalibration() {
       let joystick = { xCal: Joystick.xCal, yCal: Joystick.yCal };
       let json = JSON.stringify(joystick);
       fs.writeFileSync(Joystick.CAL_FILE, json + '\n');
    }
 
 }
 
Joystick.btnPressThreshold = 500;

module.exports = Joystick;
