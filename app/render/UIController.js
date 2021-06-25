const { ipcRenderer } = require('electron')

class UIController {

    constructor(appConfig) {
        this.profileList = {};
        this.fileList = {};
        this.state = {};

        // Make this object available to the html scripts via
        // the "ui" alias...
        window.ui = this;

        // Make the "appConfig" object available to the html
        // scripts via the "appConfig" alias...
        window.appConfig = appConfig;

        this.profileUpdate = null;
        this.fileUpdate = null;

        let thiz = this;

        ipcRenderer.on('ui-profile-update', (event, profile) => {

            console.log(`event profile-update: ${profile.fileName}`);
            profile.value = profile.fileName;
            thiz.profileList[profile.fileName] = profile;

            if (thiz.state?.page === 'profilePage') {
                // The profile page is the current page.
                // It needs a refresh (but delay this refresh)
                // in case more data is coming...
                if (thiz.profileUpdate !== null) {
                    console.log('extending profile refresh delay');
                    clearTimeout(thiz.profileUpdate);
                }

                thiz.profileUpdate = setTimeout(() => {
                    console.log('Profile refresh');
                    thiz.showPage('profilePage');
                    thiz.profileUpdate = null;
                }, 500);
            }
        });
         

        ipcRenderer.on('ui-file-update', (event, fileObj) => {

            console.log(`event file-update: ${fileObj.value}`);
            fileObj.name = thiz.circuitDisplayName(fileObj.value);
            thiz.fileList[fileObj.value] = fileObj;

            if (thiz.state?.page === 'filePage') {
                // The file page is the current page.
                // It needs a refresh (but delay this refresh)
                // in case more data is coming...
                if (thiz.fileUpdate !== null) {
                    console.log('extending file refresh delay');
                    clearTimeout(thiz.fileUpdate);
                }

                thiz.fileUpdate = setTimeout(() => {
                    console.log('File refresh');
                    thiz.showPage('filePage');
                    thiz.fileUpdate = null;
                }, 500);
            }
        });
         
         
        ipcRenderer.on('ui-page-add', (event, pageContents) => {
            try {
                console.log(`event ui-page-add`);
                let _ui = $('#ui');
                let newPage = _ui.append(pageContents);
                newPage.show();
            }
            catch (err) {
                console.log(`Error adding UI page ${pageContents}`);
                console.error(err);
             }            
        });
         

        ipcRenderer.on('ui-start', (event, pageContents) => {
            thiz.start();
        });


        ipcRenderer.on('ui-joystick', (event, stickPos) => {
            // TODO handle joystick in UI
        });

        ipcRenderer.on('ui-joystick-press', (event) => {
            // TODO handle joystick press in UI
        });

    }

    start() {
        this.state = {}

        // The touchscreen on the Pi will not register mouse clicks
        // like one would expect. Make all our buttons respond
        // to touchstart events as if a mouse was clicked...
        $('.btn').on('touchstart', function() {
            ui.publish('btn-press');
            $(this).trigger('click');
        });

        $('body').addClass(appConfig.ui.bodyClass);

        this.showPage(appConfig.ui.startPageId);
        console.log('ui started');
    }
 

    showPage(pageId) {

        $(".page").hide();

        let fnActivate = window.uiPageActivate[pageId];
        if (fnActivate) {
            fnActivate();
        }

        $("#"+pageId).show();

        this.state.page = pageId;

        this.state.activeListId = null;
    }


    setActiveList(listId) {
        this.state.activeListId = listId;
    }

    
    select(listId, value, nextPageId) {
        this.state[listId] = value;
        if (nextPageId) {
            this.showPage(nextPageId);
        }
    }


    prepareExposure() {
        this.state.file = this.fileList[this.state.fileName];

        // Merge the selected profile with the default profile...
        this.state.profile = Object.assign({}, this.profileList['default.json']);
        Object.assign(this.state.profile, this.profileList[this.state.profileName]);

        ipcRenderer.invoke('fileloader-load', { "file": this.state.file, "profile": this.state.profile });        
    }


    startExposure() {
       let exposure = this.state.profile.exposure;
       ipcRenderer.invoke('led-expose', exposure);
    }


    cancelExposure() {
        ipcRenderer.invoke('led-cancel');
        this.showPage('exposureStartPage');
    }


    prepareDrill() {
        this.state.fileName = this.state.drillName;
        this.state.file = this.fileList[this.state.drillName];
        ipcRenderer.invoke('fileloader-load', { "file": this.state.file, "profile": this.state.drillSide })
    }


    peek() {
       ipcRenderer.invoke('led-peek');
    }


    publish(event, data) {
        ipcRenderer.invoke(event, data);
    }

    subscribe(event, callback) {
        ipcRenderer.on(event, callback);
    }    

    circuitDisplayName(fileName) {
        let ndx = fileName.indexOf('.');
        if (ndx >= 0) {
           let base = fileName.slice(0, ndx);
           let ext = fileName.slice(ndx+1);
           if (ext.toLowerCase() === 'gbr') {
                // Check for KiCad file naming...
                let dash = base.lastIndexOf('-');
                if (dash >= 0) {
                    if (base.slice(dash, dash+5) == '-B_Cu') {
                        return 'Back:' + base.slice(0, dash);
                    }
                    else if (base.slice(dash, dash+5) == '-F_Cu') {
                        return 'Frnt:' + base.slice(0, dash);
                    }
                }
           }
           return base;
        }
        else {
            return fileName;
        }
    }
}

export { UIController }
