const GPIO = require('../GPIO.js');
const EventEmitter = require('events')


class ZProbe extends EventEmitter {

    constructor() {
        super();
        
        this.pigpio = new GPIO();

        ZProbe.msZPROBE_SAMPLE_INTERVAL

        this.pigpio.whenReady(() => {
            this.pin = this.pigpio.gpio(19);
            this.pin.modeSet('input');
            this.pin.pullUpDown(0);
            console.log('ZProbe successfully initialized');
            this.probeVal = 0;
            this.ready = true;

            let thiz = this;
            this.pin.read().then((val) => {
                thiz.probeVal = val;
                console.log(`Initial zprobe value: ${val}`);
            })

            this.pin.notify((val) => {
                thiz.probeVal = val;
                thiz.emit(ZProbe.EVT_PRESSED, thiz.value);
            });

        });
    }
 
    get value() {
      if (this.ready) {
         return (this.probeVal == 0);
      }
      else {
        return false;
      }
    }
 
}
 
// Probe pad location (relative to Home set to (0,0,0):
// "wpos":{"x":"15.677","y":"4.122","z":"-15.135"}
ZProbe.padX = 15.677;
ZProbe.padY = 4.122;
ZProbe.padZ = -15.135;



ZProbe.EVT_PRESSED = 'pressed';

module.exports = ZProbe;
