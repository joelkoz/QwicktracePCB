const pigpioClient = require('pigpio-client');


/**
 * A singleton wrapper to the to the pigpio-client object.  
 * Multiple calls to "new GPIO()" will yield a single instance
 * of the pigpioClient object. The object will have an
 * additional method named "whenReady()", which will be called
 * either once the initial connection is established, or
 * immediately if the connection is already established.
 */
class GPIO {
    constructor() {
        if (!GPIO.instance) {
            GPIO.instance = this;
            this.pigpio = pigpioClient.pigpio(GPIO.config);
            this.pigpio.connected = false

            this.pigpio.once('connected', () => {
                GPIO.instance.pigpio.connected = true;
            });

            this.pigpio.once('disconnected', () => {
                GPIO.instance.pigpio.connected = false;
            });

            this.pigpio.whenReady = function(fnHandler) {
                if (GPIO.instance.pigpio.connected) {
                    fnHandler();
                }
                else {
                    GPIO.instance.pigpio.once('connected', fnHandler);
                }
            }
        }
        return GPIO.instance.pigpio;
    }


    static setConfiguration(config) {
        GPIO.config = config;
    }
}

// Our default configuration...
GPIO.config = {host: '127.0.0.1'};

module.exports = GPIO;
