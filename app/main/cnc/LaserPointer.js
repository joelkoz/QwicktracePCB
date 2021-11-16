const GPIO = require('../GPIO.js');
const Config = require('../Config.js');
const EventEmitter = require('events')

class LaserPointer extends EventEmitter {

    constructor() {
        super();

        this.pigpio = new GPIO();

        if (Config.cnc) {
            if (Config.cnc.pointer && Config.cnc.pointer.offset) {
                this.setCalibration(Config.cnc.pointer.offset);
            } 
        }

        this.pigpio.whenReady(() => {
            this.pin = this.pigpio.gpio(26);
            this.pin.modeSet('output');
            console.log('Laser control successfully initialized');
            this.laserOn = false;
            this.laser = false;
          });
    }

    get laser() {
        return this.laserOn;
    } 

    set laser(newVal) {
        if (this.pin) {
            if (newVal) {
                this.pin.analogWrite(LaserPointer.brightness);
                this.laserOn = true;
            }
            else {
                this.pin.analogWrite(0);
                this.laserOn = false;
            }
            this.emit('state', this.laserOn);
        }
    }

    setCalibration(offset) {
        LaserPointer.offsetX = offset.x;
        LaserPointer.offsetY = offset.y;
    }

    // Assuming the laser is on and currently pointing
    // at laserPos, this returns where the spindle is
    // actually positioned.
    toSpindlePos(laserPos) {
        return { x: parseFloat(laserPos.x) - LaserPointer.offsetX, y: parseFloat(laserPos.y) - LaserPointer.offsetY }
    }

    // Assuming the laser is on and the spindle is
    // located at spindlePos, this returns where the
    // laser is currently posistioned.
    toLaserPos(spindlePos) {
        return { x: parseFloat(spindlePos.x) + LaserPointer.offsetX, y: parseFloat(spindlePos.y) + LaserPointer.offsetY }
    }

}

LaserPointer.brightness = 15;

// What is laser's position relative to spindle position?
// "wpos":{"x":"22.073","y":"10.960",
LaserPointer.offsetX = 20.073;
LaserPointer.offsetY = 10.960;

module.exports = LaserPointer;
