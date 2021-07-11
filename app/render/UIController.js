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

            console.log(`event profile-update: ${profile.id}`);
            profile.value = profile.id;
            thiz.profileList[profile.id] = profile;

            if (thiz.state?.page === 'stockSelectPage') {
                // The profile page is the current page.
                // It needs a refresh (but delay this refresh)
                // in case more data is coming...
                if (thiz.profileUpdate !== null) {
                    console.log('extending stock refresh delay');
                    clearTimeout(thiz.profileUpdate);
                }

                thiz.profileUpdate = setTimeout(() => {
                    console.log('Stock profile refresh');
                    thiz.showPage('stockSelectPage');
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


        ipcRenderer.on('ui-process-done', (event, profile) => {
            try {
                console.log(`event ui-process-done`);
                thiz.state.lastProjectId = this.state.projectId;
                thiz.state.lastAction = this.state.action;
                thiz.state.lastSide = this.state.side;
                thiz.state.lastStockId = this.state.stockId;
                thiz.state.action = undefined;
                thiz.state.side = undefined;
                thiz.clearPageStack();
                thiz.showPage('actionPage');
            }
            catch (err) {
                console.log(`Error adding UI page ${pageContents}`);
                console.error(err);
             }            
        });


        ipcRenderer.on('ui-show-page', (event, data) => {
            if (data.clearPageStack) {
                thiz.clearPageStack();
            }
            thiz.showPage(data.pageId);
        });


        ipcRenderer.on('ui-popup-message', (event, data) => {
            thiz.popupMessage(data);
        });

    }


    cancelProcesses() {
        if (this.state.action === 'drill') {
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
        $(".popup").hide();

        this.state.activeListId = null;

        let fnActivate = window.uiPageActivate[pageId];
        if (fnActivate) {
            fnActivate();
        }

        if (pushOld) {
            this.pageStack.push(this.state.page);
        }

        $("#"+pageId).show();
        $("#"+pageId).css({ pointerEvents: "auto"});         
        this.state.page = pageId;
    }


    popupMessage(popupData) {
        // Delay the popup activation in case this was called DURING a page activation
        // (i.e. showPage() is in progress)
        setTimeout(() => {
            let popupId = popupData.popupId;
            if (!popupId) {
                popupId = "popupMessage";
            }

            $("#"+this.state.page).css({ pointerEvents: "none"});    
            $("#" + popupId).show();

            let fnActivate = window.uiPageActivate[popupId];
            if (fnActivate) {
                fnActivate(popupData);
            }
        }, 5);
    }


    showPopup(popupData) {
        this.popupMessage(popupData);
    }


    onPopupButton(btnDef) {
        $(".popup").hide();
        $("#"+this.state.page).css({ pointerEvents: "auto"});    
        this.doButtonAction(btnDef);
    }


    doButtonAction(btnDef) {
        if (btnDef.pageId) {
            this.showPage(btnDef.pageId, btnDef.pushOld);
        }
        else if (btnDef.callbackEvt) {
            this.publish(btnDef.callbackEvt, btnDef.callbackData);
        }
        else if (btnDef.fnAction) {
            btnDef.fnAction();
        }

    }







    setActiveList(listId) {
        this.state.activeListId = listId;
    }

    
    select(listId, value, nextPageId) {
        this.state[listId] = value;
        if (nextPageId) {
            if (typeof nextPageId === 'string') {
               this.showPage(nextPageId);
            }
            else if (typeof nextPageId === 'function') {
                nextPageId(value);
            }
        }
    }

    clearState(propertyName) {
        this.state[propertyName] = undefined;
    }


    setState(propertyName, value, nextPageId, pushOld) {
        this.state[propertyName] = value;
        if (nextPageId) {
            this.showPage(nextPageId, pushOld);
        }
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
   

    setAction(action, nextPageId, pushOld) {
        this.setState('action', action, nextPageId, pushOld);
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

    setSide(side, nextPageId, pushOld) {
        this.setState('side', side, nextPageId, pushOld);
    }



    isOptionStockContinue() {
        let state = this.state;
        return (state.projectId === state.lastProjectId &&
                state.action != 'expose' && state.lastAction != 'expose' &&
                state.side === state.lastSide);
    }


    isOptionStockFlip() {
        let state = this.state;
        return (state.projectId === state.lastProjectId &&
                state.side != state.lastSide);
    }


    getStockList() {
        let list = [];

        let profiles = Object.values(this.profileList);
        let thiz = this;
        profiles.forEach(profile => {
            if (profile.hasOwnProperty('stock')) {
                let stock = profile.stock;
                let material = this.profileList[stock.materialId].material;
                if (material.actions.includes(this.state.action)) {
                   let name = `${stock.width}mm x ${stock.height}mm, ${material.name} `
                   list.push({"name": name, "value": profile.id});
                }
            }
        });

        return list;
    }


    stockContinue() {
        this.initProcessing(false);
    }


    stockFlip() {
        this.initProcessing(true);
    }


    initProcessing(initStock = true) {

        let state = this.state;
        let stock = this.profileList[state.stockId].stock;
        let material = this.profileList[stock.materialId].material;
        let defaults = this.profileList.default;

        // Build the complete profile used by all processing of this action...
        let profile = Object.assign({}, defaults, { material }, { stock }, { state });
        profile.state.initStock = initStock;

        // Remove superfluous values that came from from defaults...
        delete profile.id;
        delete profile.value;
   
        let fnDispatch = window.uiDispatch[state.action];
        fnDispatch(profile);
    }


    cancelProcesses() {

        let fnCancel = window.uiCancelProcess[this.state.action];
        if (fnCancel) {
            fnCancel();
        }
    }

}

export { UIController }
