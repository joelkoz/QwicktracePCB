const MainMQ = require('./MainMQ.js')


class RPCServer {

     constructor(rpcServerId) {
         let thiz = this;
         let rpcEventRoot = `main.call.${rpcServerId}.`;
         MainMQ.on(`${rpcEventRoot}**`, async (bundle, eventName) => {
            let cmdName = eventName.substring(rpcEventRoot.length);
            let fnCmd = this.api[cmdName];
            if (fnCmd) {
                let args = bundle.args;
                let result = await fnCmd.call(thiz, ...args);
                if (bundle.callbackName) {
                    let results;
                    if (Array.isArray(result)) {
                        results = result
                    }
                    else {
                        results = [ result ]
                    }
                    MainMQ.emit(bundle.callbackName, { callbackName: bundle.callbackName, results });
                }
            }
            else {
                log.error(`No RPC server handler found for ${eventName}`);
            }

         })
     }

     rpcAPI(api) {
         this.api = api;
     }

}

module.exports = RPCServer;