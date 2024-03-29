import { RenderMQ } from './RenderMQ.js'

class RPCClient {

      constructor(rpcPrefix) {
         this.rpcPrefix = rpcPrefix;
         this.rpcClearAll();

         let thiz = this;
         RenderMQ.on(`render.${this.rpcPrefix}.result.**`, (bundle) => {
            let callback = thiz.fnResultDispatch[bundle.callbackName];
            let args = bundle.results;
            if (callback) {
                callback.call(thiz, ...args);
            }
            else {
                console.log(`No active RPC callback found for ${bundle.callbackName}`);
            }
         })
      }

      rpCallCb(cmdName, argv = [], callbackMethod) {
          let evtName = `main.call.${cmdName}`;
          let bundle = {};
          if (Array.isArray(argv)) {
            bundle.args = argv
          }
          else {
              bundle.args = [ argv ]
          }
        
          if (callbackMethod) {
              let callbackName = `render.${this.rpcPrefix}.result.${cmdName}`;
              bundle.callbackName = callbackName;
              this.fnResultDispatch[callbackName] = callbackMethod;
          }
          RenderMQ.emit(evtName, bundle);
      }


      async rpCall(cmdName, ...argv) {

          let _resolve;
          let _reject;
          let p = new Promise((resolve, reject) => {
            _resolve = resolve;
            _reject = reject;
          });

          try {
            this.rpCallCb(cmdName, argv, (result) => {
                if (result instanceof Error) {
                   _reject(result);
                }
                else {
                   _resolve(result)
                }
            });
          }
          catch (err) {
            _reject(err)
          }
          return p;
      }

      
      rpcCancel(cmdName) {
        let callbackName = `render.{this.rpcPrefix}.result.${cmdName}`;
        delete this.fnResultDispatch[callbackName];
      } 

      rpcClearAll() {
          this.fnResultDispatch = {};
      }
}

export  { RPCClient };