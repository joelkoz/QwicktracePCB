const MainSubProcess = require('./MainSubProcess.js')
const path = require('path');
const fs = require('fs');

const uiPageDir = "./app/render/ui";

class UILoader extends MainSubProcess {

    constructor(win) {
        super(win);
        this.loadUI();
    }

    loadUI() {
      let files = fs.readdirSync(uiPageDir);
      files.forEach(file => {
        if (path.extname(file) == '.html') {
            let strContents = fs.readFileSync(uiPageDir + "/" + file, 'utf8');
            this.ipcSend('ui-page-add', strContents);
        }
      });

      this.ipcSend('ui-start');
    }    

}

module.exports = UILoader;
