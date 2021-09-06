const EventEmitter2 = require('eventemitter2')
const { ipcRenderer } = require('electron')

/**
 * A message queue for the Render process
 */
class RenderMQ extends EventEmitter2 {

    constructor() {
        super({wildcard: true});

        if (RenderMQ._instance) {
            return RenderMQ._instance;
        }
        RenderMQ._instance = this;

        let thiz = this;
        ipcRenderer.on('render-ipc-forward', (event, bundle) => {
            let args = bundle.args;
            args.push(bundle.eventName);
            thiz.emit(bundle.eventName, ...args);
        });        
    }


    static emit(eventName, ...args) {
        let thiz = RenderMQ.getInstance();
        if (eventName.startsWith('main.')) {
            // This is addressed to the main process...
            let bundle = { eventName, args }
            ipcRenderer.invoke('main-ipc-forward', bundle)
        }
        else {
           thiz.emit(eventName, ...args);
        }
    }

    static on(eventName, listener) {
        RenderMQ._instance.on(eventName, listener);
    }

    static once(eventName, listener) {
        RenderMQ._instance.once(eventName, listener);
    }

    static getInstance() {
        return RenderMQ._instance;
    }
}

const singleton = new RenderMQ();

export { RenderMQ }
