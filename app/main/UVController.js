const { ipcMain } = require('electron')
const MainSubProcess = require('./MainSubProcess.js')
const GPIO = require('./GPIO.js');

class UVController  extends MainSubProcess {

    constructor(win) {
        super(win);

        this.timer = null;
        this.pigpio = new GPIO();

        let thiz = this;
        ipcMain.handle('uv-expose', (event, exposure) => {
            thiz.expose(exposure);
        });
  
        ipcMain.handle('uv-cancel', (event) => {
            thiz.cancel();
        });
  
        ipcMain.handle('uv-peek', (event) => {
            thiz.peek();
        });

        this.pigpio.whenReady(() => {
            thiz.uv = thiz.pigpio.gpio(14);
            thiz.uv.modeSet('output');
            console.log('UV control successfully initialized');
            thiz.uv.analogWrite(0);
        });

        this.pigpio.once('error', (error) => {
            thiz.failed = true;
            console.log(`Failed to initialize UV control pin. Is pigpiod daemon running?: ${error.name}, code ${error.code}, ${error.message}`);
        });
    }


    expose(exposure) {
        if (this.uv) {
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
                    thiz.cancel();
                }
                thiz.exposureUpdate();
            }, 1000);

            this.exposureUpdate();
        }
        else {
            console.log('ERROR - Exposure UV control unavailable.');
        }
    }


    exposureUpdate() {
        this.ipcSend('ui-exposure-update', this.exposure);
    }


    cancel() {
        if (this.uv) {
            console.log('uv OFF');
            this.uv.analogWrite(0);

            if (this.timer) {
            clearInterval(this.timer);
            }
            this.timer = null;
        }
    }

    peek() {
        if (this.uv) {
            console.log('uv ON');
            this.uv.analogWrite(200);

            let thiz = this;
            this.timer = setTimeout(() => { thiz.cancel(); }, 2000);
        }
        else {
            console.log('ERROR - Exposure UV control unavailable for peek.');
        }
    }

}

module.exports = UVController;