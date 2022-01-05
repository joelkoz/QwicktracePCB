const MainSubProcess = require('./MainSubProcess.js')
const GPIO = require('./GPIO.js');
const MainMQ = require('./MainMQ.js');

const SAFELIGHT_MAX_BRIGHTNESS = 250;

class UVController  extends MainSubProcess {

    constructor(win) {
        super(win, 'uv');

        this.timer = null;
        this.pigpio = new GPIO();

        let thiz = this;
        this.pigpio.whenReady(() => {
            thiz.uv = thiz.pigpio.gpio(6);
            thiz.uv.modeSet('output');
            console.log('UV control successfully initialized');
            thiz.uv.analogWrite(0);

            thiz.safe = thiz.pigpio.gpio(13);
            thiz.safe.modeSet('output');
            console.log('Safelight control successfully initialized');
            thiz.safe.analogWrite(0);

        });

        this.pigpio.once('error', (error) => {
            thiz.failed = true;
            console.log(`Failed to initialize UV control pin. Is pigpiod daemon running?: ${error.name}, code ${error.code}, ${error.message}`);
        });

        // Define the RPC API that this object serves...
        this.rpcAPI( {
            async expose(profile) {
                thiz.expose(profile);
            },

            async peek() {
                thiz.peek();
            },
            
            async cancel() {
                thiz.cancel();
            },
            
            async safelight(val) {
                thiz.setSafelight(val);
            }

        });
    }


    expose(profile) {
        if (this.uv) {
            console.log(`Starting PCB exposure of ${profile.state.projectId}\n`, JSON.stringify(profile,null,2))

            let exposure = profile.exposure;
            this.cancel();

            this.exposure = Object.assign({}, exposure);
            this.exposure.remain = exposure.time;

            console.log('uv ON');
            let duty = Math.round(255 * exposure.power);
            this.uv.analogWrite(duty);

            let thiz = this;
            this.timer = setInterval(() => {
                thiz.exposure.remain--;
                if (this.exposure.remain <= 0) {
                    thiz.exposureComplete();
                }
                thiz.exposureUpdate();
            }, 1000);

            this.exposureUpdate();
        }
        else {
            console.log('ERROR - Exposure UV control unavailable.');
        }
    }

    exposureComplete() {
        this.cancel();
        MainMQ.emit('render.ui.exposureComplete', this.exposure)
    }

    
    exposureUpdate() {
        MainMQ.emit('render.ui.exposureUpdate', this.exposure);
    }


    cancel() {
        if (this.uv) {
            console.log('uv OFF');
            this.uv.analogWrite(0);
        }

        if (this.timer) {
            clearInterval(this.timer);
         }
         this.timer = null;

        this.cancelSafe();
    }


    cancelSafe() {
        if (this.timer) {
            clearInterval(this.timer);
         }
         this.timer = null;

        if (this.safe) {
            console.log('safelight OFF');
            this.safe.analogWrite(0);
        }
    }


    setSafelight(on) {
        if (this.safe) {
            if (on) {
                console.log('safelight ON');
                this.safe.analogWrite(SAFELIGHT_MAX_BRIGHTNESS);
            }
            else {
                console.log('safelight OFF');
                this.safe.analogWrite(0);
            }
        }
    }

    
    peek() {
        if (this.safe) {
            console.log('safelight ON');
            this.safe.analogWrite(SAFELIGHT_MAX_BRIGHTNESS);

            let thiz = this;
            this.timer = setTimeout(() => { thiz.cancelSafe(); }, 2000);
        }
        else {
            console.log('ERROR - Exposure UV control unavailable for peek.');
        }
    }

}

module.exports = UVController;
