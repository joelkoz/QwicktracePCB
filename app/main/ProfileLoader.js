const MainSubProcess = require('./MainSubProcess.js')
const path = require('path');
const fs = require('fs');

const profileDir = "./profiles/";

class ProfileLoader extends MainSubProcess {

    constructor(win) {
       super(win);

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
                            profile.fileName = path.basename(file);
                            thiz.ipcSend('ui-profile-update', profile);
                            if (path.basename(file) == 'default.json') {
                                thiz.ipcSend('mask-profile-default', profile);
                            }
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
