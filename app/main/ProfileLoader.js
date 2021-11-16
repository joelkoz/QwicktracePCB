const MainSubProcess = require('./MainSubProcess.js')
const MainMQ = require('./MainMQ.js');
const path = require('path');
const fs = require('fs');

const profileDir = "./profiles/";

class ProfileLoader extends MainSubProcess {

    constructor(win) {
       super(win, 'profiles');

       this.lastProfileSyncMs = 0;

       // Do a profile refresh now...
       this.refreshProfiles();

       // And every 10 seconds after this...
       let thiz = this;
       setInterval(() => { thiz.refreshProfiles(); }, 10000);

    }

    refreshProfiles() {
      let thiz = this;
        fs.readdir(profileDir, (err, files) => {
          let msLastSync = this.lastProfileSyncMs;
          files.forEach(file => {
              if (path.extname(file) == '.json') {
                fs.stat(profileDir + file, false, (err, fstat) => {
                   if (fstat.mtimeMs > msLastSync) {
                     fs.readFile(profileDir + file, 'utf8', (err, json) => {
                          try {
                            let profile = JSON.parse(json);
                            profile.id = path.parse(file).name;
                            MainMQ.emit('render.ui.profileUpdate', profile);
                          }
                          catch (err) {
                            console.log(`Error loading profile ${fileName}`);
                            console.error(err);
                          }                          
                     });
                   }
                });
              }
          });
          this.lastProfileSyncMs = Date.now();
        });  
    }
}

module.exports = ProfileLoader;
