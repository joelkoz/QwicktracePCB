
const RPCServer = require('./RPCServer.js');


class LogServer extends RPCServer {

    constructor() {
        
        if (!LogServer.instance) {
            super('log')
            LogServer.instance = this;

            this.rpcAPI( {
                async info(logText) {
                    console.log(logText);
                },

                async error(logText) {
                    console.error(logText);
                },

                async warn(logText) {
                    console.warn(logText);
                }

            });

        }
        return LogServer.instance;
    }

}

module.exports = new LogServer();
