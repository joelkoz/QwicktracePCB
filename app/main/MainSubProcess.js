const RPCServer = require('./RPCServer.js');

class MainSubProcess extends RPCServer {

    constructor(win, rpcServerId = 'none') {
        super(rpcServerId);
        this.win = win;
    }

    ipcSend(msg, obj) {
        this.win.webContents.send(msg, obj);
    }
}

module.exports = MainSubProcess;
