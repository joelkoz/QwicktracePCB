const EventEmitter2 = require('eventemitter2')
const { ipcMain } = require('electron')

/**
 * A message queue for the Main process
 */
class MainMQ extends EventEmitter2 {

    constructor() {
        super({wildcard: true});

        if (MainMQ._instance) {
            return MainMQ._instance;
        }
        MainMQ._instance = this;

        let thiz = this;
        ipcMain.handle('main-ipc-forward', (event, bundle) => {
            let args = bundle.args;
            args.push(bundle.eventName);
            thiz.emit(bundle.eventName, ...args);
        });
    }


    static emit(eventName, ...args) {

        let thiz = MainMQ.getInstance();
        if (eventName.startsWith('render.')) {
            // This is addressed to the render process...
            if (!thiz.win) {
                throw new Error('MainMQ.setWindow() has not been called to allow forwarding to render process')
            }
            let bundle = { eventName, args }
            thiz.win.webContents.send('render-ipc-forward', bundle)
        }
        else {
           thiz.emit(eventName, ...args);
        }
    }

    static on(eventName, listener) {
        MainMQ._instance.on(eventName, listener);
    }

    static once(eventName, listener) {
        MainMQ._instance.once(eventName, listener);
    }

    static getInstance() {
        return MainMQ._instance;
    }

    static setWindow(win) {
        MainMQ.getInstance().win = win;
    }
}

const singleton = new MainMQ();

module.exports = MainMQ;