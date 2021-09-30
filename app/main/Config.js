const fs = require('fs');
const fsp = require('fs').promises;

const RPCServer = require('./RPCServer.js');

const FILENAME="./config.json"


function setVal(object, propertyName, propertyValue) {
     let ndx = propertyName.indexOf('.');
     if (ndx < 0) {
         // No sub-objects - use this property name as is
         object[propertyName] = propertyValue;
     }
     else {
         let parentName = propertyName.slice(0, ndx);
         let parentObj = object[parentName];
         if (!parentObj) {
             parentObj = {};
             object[parentName] = parentObj;
         }
         setVal(parentObj, propertyName.substring(ndx+1), propertyValue)
     }
}


class Config extends RPCServer {

    constructor() {
        
        if (!Config.instance) {
            super('config')
            Config.instance = this;
            this.load();

            let thiz = this;
            this.rpcAPI( {
                async setAndSave(propertyName, propertyValue) {
                    return await thiz.setAndSave(propertyName, propertyValue);
                }
            });

        }
        return Config.instance;
    }

    get window() {
        return this._config.window
    }

    get app() {
        return this._config.app;
    }

    get mask() {
        return this._config.mask;
    }

    get cnc() {
        return this._config.cnc;
    }

    get ui() {
        return this._config.ui;
    }

    get joystick() {
        return this._config.joystick;
    }

    get pigpio() {
        return this._config.pigpio;
    }

    get json() {
        return this._config;
    }

    get(key) {
        return this.json[key];
    }

    load() {
        console.log('Loading configuraton file...');
        let jStr = fs.readFileSync(FILENAME, 'utf8');
        this._config = JSON.parse(jStr);
    }

    async save() {
        try {
           console.log('Saving configuraton file...');
           let jStr = JSON.stringify(this._config, null, 4);
           await fsp.writeFile(FILENAME, jStr, 'utf8');
        }
        catch (err) {
            console.log('Error saving configuration file: ', err)
        }
    }


    async setAndSave(propertyName, propertyValue) {
        setVal(this._config, propertyName, propertyValue);
        await this.save();
    }

}

module.exports = new Config();
