const GPIO = require('../GPIO.js');

class LaserPointer {

    constructor(config) {
        this.pigpio = new GPIO();

        if (config?.cnc?.pointer?.offset) {
            LaserPointer.offsetX = config.cnc.pointer.offset.x;
            LaserPointer.offsetY = config.cnc.pointer.offset.y;
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
        }
    }

    // Assuming the laser is on and currently pointing
    // at the target, this returns where the spindle is
    // currently posistioned.
    toSpindlePos(laserPos) {
        return { x: laserPos.x + LaserPointer.offsetX, y: laserPos.y + LaserPointer.offsetY }
    }

    // Assuming the laser is on and the spindle is
    // located at spindlePos, this returns where the
    // laser is currently posistioned. Another way
    // to use this method: given the desired position
    // spindlePos, this returns the position
    // necessary to point the laser at the target.
    toLaserPos(spindlePos) {
        return { x: laserPos.x - LaserPointer.offsetX, y: laserPos.y - LaserPointer.offsetY }
    }

}

LaserPointer.brightness = 15;

// What is laser's position relative to spindle position?
// "wpos":{"x":"22.073","y":"10.960",
LaserPointer.offsetX = 20.073;
LaserPointer.offsetY = 10.960;

module.exports = LaserPointer;
