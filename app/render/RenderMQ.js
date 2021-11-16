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
        let isGlobal = eventName.startsWith('global.');
        if (eventName.startsWith('main.') || isGlobal) {
            // This is addressed to the main process...
            let bundle = { eventName, args }
            ipcRenderer.invoke('main-ipc-forward', bundle)

            if (isGlobal) {
                // Global events are also sent locally
                thiz.emit(eventName, ...args);
            }
        }
        else {
           thiz.emit(eventName, ...args);
        }
    }

    static on(eventName, listener) {
        return RenderMQ._instance.on(eventName, listener, {objectify: true});
    }

    static once(eventName, listener) {
        return RenderMQ._instance.once(eventName, listener, {objectify: true});
    }

    static getInstance() {
        return RenderMQ._instance;
    }
}

const singleton = new RenderMQ();

export { RenderMQ }
