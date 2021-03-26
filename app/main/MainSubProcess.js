
class MainSubProcess {

    constructor(win) {
        this.win = win;
    }

    ipcSend(msg, obj) {
        this.win.webContents.send(msg, obj);
    }
}

module.exports = MainSubProcess;
