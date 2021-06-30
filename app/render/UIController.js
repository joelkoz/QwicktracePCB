const { ipcRenderer } = require('electron')

/**
 * Class for handling the display logic for the UI, maintaining
 * state of the UI, and communicating with the main process.
 */
class UIController {

    constructor(appConfig) {
        this.profileList = {};
        this.projectList = {};
        this.state = {};
        this.clearPageStack();

        // Make this object available to the html scripts via
        // the "ui" alias...
        window.ui = this;

        // Make the "appConfig" object available to the html
        // scripts via the "appConfig" alias...
        window.appConfig = appConfig;

        this.profileUpdate = null;
        this.projectUpdate = null;

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
         

        ipcRenderer.on('ui-project-update', (event, projObj) => {

            console.log(`event project-update: ${projObj.projectId}`);
            projObj.name = projObj.projectId;
            projObj.value = projObj.projectId;
            thiz.projectList[projObj.projectId] = projObj;

            if (thiz.state?.page === 'startPage') {
                // The file page is the current page.
                // It needs a refresh (but delay this refresh)
                // in case more data is coming...
                if (thiz.projectUpdate !== null) {
                    console.log('extending project refresh delay');
                    clearTimeout(thiz.projectUpdate);
                }

                thiz.projectUpdate = setTimeout(() => {
                    console.log('Project list refresh');
                    thiz.showPage('startPage');
                    thiz.projectUpdate = null;
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

    cancelProcesses() {
        if (this.state.action = 'drill') {
            window.uiDrill.cancelProcesses();
        }
    }

    start() {
        this.state = {}
        let thiz = this;

        // The touchscreen on the Pi will not register mouse clicks
        // like one would expect. Make all our buttons respond
        // to touchstart events as if a mouse was clicked...
        $('.btn').on('touchstart', function() {
            ui.publish('btn-press');
            $(this).trigger('click');
        });

        $('body').addClass(appConfig.ui.bodyClass);

        $(".btn.back").on("click", () => { thiz.backPage() });

        this.showPage(appConfig.ui.startPageId);
        console.log('ui started');
    }
 
    clearPageStack() {
        this.pageStack = [ appConfig.ui.startPageId ];
    }

    popPage() {
        this.pageStack.pop();
    }

    backPage() {
        if (this.pageStack.length > 0) {
            let pageId = this.pageStack.pop();
            this.showPage(pageId, false);
        }
    }

    showPage(pageId, pushOld = true) {

        $(".page").hide();

        let fnActivate = window.uiPageActivate[pageId];
        if (fnActivate) {
            fnActivate();
        }

        if (pushOld) {
            this.pageStack.push(this.state.page);
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

    clearState(propertyName) {
        this.state[propertyName] = undefined;
    }


    get projectName() {
        let projectId = this.state.projectId;
        let project = this.projectList[projectId];
        let name = '';
        if (project) {
            name = project.projectId + '';
            if (this.state.action) {
                name += ` (${this.state.action}`;
                if (this.state.side) {
                    name += ` ${this.state.side}`;
                }
                name += ')';
            }
        }
        return name;
    }

    publish(event, data) {
        ipcRenderer.invoke(event, data);
    }

    subscribe(event, callback) {
        ipcRenderer.on(event, callback);
    }    

 
    isOptionExpose() {
        let appConfig = window.appConfig;
        let projectId = this.state.projectId;
        let project = this.projectList[projectId];
        return (appConfig.app.hasPCB && project.sides.length > 0);
    }

    isOptionMill() {
        let appConfig = window.appConfig;
        let projectId = this.state.projectId;
        let project = this.projectList[projectId];
        return (appConfig.app.hasCNC && project.sides.length > 0);
    }

    isOptionDrill() {
        let appConfig = window.appConfig;
        let projectId = this.state.projectId;
        let project = this.projectList[projectId];
        return (appConfig.app.hasCNC && project.hasDrill);
    }
   
    setAction(action, nextPageId) {
        this.state.action = action;
        if (nextPageId) {
            this.showPage(nextPageId);
        }
    }

    getAvailableSides() {
        let sides;
        if (this.state.action === 'drill') {
            sides = [ 'top', 'bottom' ];
        }
        else {
            let projectId = this.state.projectId;
            let project = this.projectList[projectId];
            sides = project.sides;
        }
        return sides;
    }

    setSide(side) {
        this.state.side = side;
        this.dispatchToProcessStart(this.getAvailableSides().length > 1);
    }


    dispatchToProcessStart(pushOld = true) {

        let dispatchPage = window.uiActionStartPage[this.state.action];
        if (dispatchPage) {
            this.showPage(dispatchPage, pushOld);
        }
    }


    cancelProcesses() {
        if (this.state.action === 'drill') {
            window.uiDrill.cancelProcesses();
        }
    }

}

export { UIController }
