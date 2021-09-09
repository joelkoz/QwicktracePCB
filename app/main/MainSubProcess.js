const RPCServer = require('./RPCServer.js');

class MainSubProcess extends RPCServer {

    constructor(win, rpcServerId = 'none') {
        super(rpcServerId);
        this.win = win;
    }
}

module.exports = MainSubProcess;
