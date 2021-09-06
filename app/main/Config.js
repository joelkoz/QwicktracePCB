const fs = require('fs');
const fsp = require('fs').promises;

const FILENAME="./config.json"

class Config {

    constructor() {
        if (!Config.instance) {
            Config.instance = this;
            this.load();
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

}

module.exports = new Config();
