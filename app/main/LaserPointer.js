const GPIO = require('./GPIO.js');

class LaserPointer {

    constructor() {
        this.pigpio = new GPIO();

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
        }
    }
}

LaserPointer.brightness = 15;

// What is laser's position relative to spindle position?
// "wpos":{"x":"20.850","y":"11.263"
LaserPointer.offsetX = 20.850;
LaserPointer.offsetY = 11.263;

module.exports = LaserPointer;
