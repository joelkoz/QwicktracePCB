const GPIO = require('../GPIO.js');
const EventEmitter = require('events')


class ZProbe extends EventEmitter {

    constructor(config) {
        super();

        if (config.cnc) {
            if (config.cnc.locations && config.cnc.locations.zpad) {
                ZProbe.padX = config.cnc.locations.zpad.x;
                ZProbe.padY = config.cnc.locations.zpad.y;
            } 
    
            if (config.cnc.zheight && config.cnc.zheight.zpad) {
                ZProbe.startZ = config.cnc.zheight.zpad.startZ;
                ZProbe.padZ = config.cnc.zheight.zpad.lastZ;
            }
        }

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
                if (thiz.debounceDelay) {
                    clearInterval(thiz.debounceDelay);
                }
                thiz.probeVal = val;
                thiz.debounceDelay = setTimeout(() => {
                    thiz.debounceDelay = null;
                    thiz.emit(ZProbe.EVT_PRESSED, thiz.value) 
                }, 750);

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
