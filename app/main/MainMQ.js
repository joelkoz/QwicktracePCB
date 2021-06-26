const EventEmitter = require('events')

/**
 * A message queue for the Main process
 */
class MainMQ extends EventEmitter {

    constructor() {
        super();

        if (MainMQ._instance) {
            return MainMQ._instance;
        }
        MainMQ._instance = this;
    }


    static emit(eventName, ...args) {
        MainMQ._instance.emit(eventName, ...args);
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
}

const singleton = new MainMQ();

module.exports = MainMQ;