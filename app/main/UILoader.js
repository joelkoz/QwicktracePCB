const MainSubProcess = require('./MainSubProcess.js')
const MainMQ = require('./MainMQ.js');
const path = require('path');
const fs = require('fs');

const uiPageDir = "./app/render/ui";

class UILoader extends MainSubProcess {

    constructor(win) {
        super(win, 'ui');
        this.loadUI();
    }

    loadUI() {
      this.scanDir(uiPageDir);
      MainMQ.emit('render.startup.startUI');
    }    


    scanDir(dirName) {
      let files = fs.readdirSync(dirName, { withFileTypes: true });
      files.forEach(dirent => {
        let file = dirent.name;
        if (path.extname(file) == '.html') {
            let fName = dirName + "/" + file
            let strContents = fs.readFileSync(fName, 'utf8');
            console.log(`adding ui page ${fName}`)
            MainMQ.emit('render.ui.pageAdd', strContents);
        }
        else if (dirent.isDirectory()) {
          this.scanDir(dirName + "/" + file);
        }
      });

    }    
}

module.exports = UILoader;
