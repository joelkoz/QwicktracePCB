
const RPCServer = require('./RPCServer.js');
const Config = require('./Config.js');


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
                    return await Config.load();
                }

            });

        }
        return ConfigServer.instance;
    }

}

module.exports = new ConfigServer();
