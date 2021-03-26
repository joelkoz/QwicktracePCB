const { ipcMain } = require('electron')
const MainSubProcess = require('./MainSubProcess.js')
const pigpioClient = require('pigpio-client');

class LEDController  extends MainSubProcess {

    constructor(win, config) {
        super(win);

        this.timer = null;
        this.pigpio = pigpioClient.pigpio(config.pigpio);

        let thiz = this;
        ipcMain.handle('led-expose', (event, exposure) => {
            thiz.expose(exposure);
        });
  
        ipcMain.handle('led-cancel', (event) => {
            thiz.cancel();
        });
  
        ipcMain.handle('led-peek', (event) => {
            thiz.peek();
        });

        this.pigpio.once('connected', () => {
            thiz.led = thiz.pigpio.gpio(26);
            thiz.led.modeSet('output');
            console.log('LED control successfully initialized');
        });

        this.pigpio.once('error', (error) => {
            thiz.failed = true;
            console.log(`Failed to initialize LED control pin. Is pigpiod daemon running?: ${error.name}, code ${error.code}, ${error.message}`);
        });
    }


    expose(exposure) {
        if (this.led) {
            this.cancel();

            this.exposure = Object.assign({}, exposure);
            this.exposure.remain = exposure.time;

            console.log('led ON');
            let duty = Math.round(255 * exposure.power);
            this.led.analogWrite(duty);

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
            console.log('ERROR - Exposure LED control unavailable.');
        }
    }


    exposureUpdate() {
        this.ipcSend('ui-exposure-update', this.exposure);
    }


    cancel() {
        if (this.led) {
            console.log('led OFF');
            this.led.analogWrite(0);

            if (this.timer) {
            clearInterval(this.timer);
            }
            this.timer = null;
        }
    }

    peek() {
        if (this.led) {
            console.log('led ON');
            this.led.analogWrite(200);

            let thiz = this;
            this.timer = setTimeout(() => { thiz.cancel(); }, 2000);
        }
        else {
            console.log('ERROR - Exposure LED control unavailable for peek.');
        }
    }

}

module.exports = LEDController;
