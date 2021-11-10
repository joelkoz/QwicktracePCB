
const RPCServer = require('./RPCServer.js');
const Config = require('./Config.js');
const MainMQ = require('./MainMQ.js');


class ConfigServer extends RPCServer {

    constructor() {
        
        if (!ConfigServer.instance) {
            super('config')
            ConfigServer.instance = this;

            this.rpcAPI( {
                async setAndSave(propertyName, propertyValue) {
                    return await Config.setAndSave(propertyName, propertyValue);
                },

                async load() {
                    let result = await Config.load();
                    MainMQ.emit('global.config.load', Config.json);
                    return result;
                }

            });

        }
        return ConfigServer.instance;
    }

}

module.exports = new ConfigServer();
