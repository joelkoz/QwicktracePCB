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
                this.pin.write(1);
                this.laserOn = true;
            }
            else {
                this.pin.write(0);
                this.laserOn = false;
            }
        }
    }
}

module.exports = LaserPointer;
