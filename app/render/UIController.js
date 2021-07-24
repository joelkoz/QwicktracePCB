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

            if (thiz.state?.page === 'projectPage') {
                // The project page is the current page.
                // It needs a refresh (but delay this refresh)
                // in case more data is coming...
                if (thiz.projectUpdate !== null) {
                    console.log('extending project refresh delay');
                    clearTimeout(thiz.projectUpdate);
                }

                thiz.projectUpdate = setTimeout(() => {
                    console.log('Project list refresh');
                    thiz.showPage('projectPage');
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


        ipcRenderer.on('ui-final-prep', (event, profile) => {
            thiz.finalPrep(profile);
        });
 
        ipcRenderer.on('ui-process-done', (event) => {
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
            console.log('Popup msg: ', data)
            let isError = (data.startsWith('ERROR'));
            if (!isError || !window.appConfig.ui.ignoreErrors) {
               thiz.popupMessage({ message: data });
            }
        });


        ipcRenderer.on('ui-wizard-next', (event, data) => {
            thiz.wizardNext();
        });
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
        else if (btnDef.invoke) {
            this.publish(btnDef.invoke.evtName, btnDef.invoke.data);
        }
        else if (btnDef.fnAction) {
            btnDef.fnAction();
        }

    }


    startWizard(wizard) {
        this.wizard = wizard;
        this.gotoWizardPage(wizard.steps[0].id);
    }


    gotoWizardPage(wizardStepId) {
        this.endCurrentWizardPage();
        this.wizardStepId = wizardStepId;
        let thiz = this;
        setTimeout(() => { thiz.showPage('wizardPage', false)}, 10);
    }


    getWizardData(wizardStepId) {

        if (!wizardStepId) {
            // If no parameter specified, use the current step Id...
            wizardStepId = this.wizardStepId;
        }

        let wdata = this.wizard.steps.find((e) => { 
            return (e.id === wizardStepId);
        });

        if (wdata) {
            return Object.assign({}, wdata, { title: this.wizard.title });
        }
        else {
            this.popupMessage({ message: `Can not find wizard step ${wizardStepId}` });
            return {};
        }
    }


    endCurrentWizardPage() {
        if (this.wizard && this.wizardStepId) {
            let wiz = this.getWizardData(this.wizardStepId);
            if (wiz.onDeactivate) {
                wiz.onDeactivate(wiz);
            }
        }
    }


    wizardNext() {

        let thiz = this;
        let wNdx = this.wizard.steps.findIndex((e) => { 
            return (e.id === thiz.wizardStepId) 
        });

        if (wNdx >= 0) {
            wNdx++;
            if (wNdx < this.wizard.steps.length) {
                this.gotoWizardPage(this.wizard.steps[wNdx].id);
            }
            else {
                // If we are out of steps, then just auto finish the wizard
                this.finishWizard();
            }
        }
        else {
            console.log('Could not locate current wizard page.');
        }
    }


    onWizardButton(btnDef) {
        if (btnDef.next) {
            this.wizardNext();
        }
        else {
           this.doButtonAction(btnDef);
        }
    }

    cancelWizard() {
        if (this.wizard) {
           this.endCurrentWizardPage();
           let cancelPage = this.wizard.cancelLandingPage;
           delete this.wizard;
           this.clearPageStack();
           ipcRenderer.invoke('cnc-cancel');
           this.showPage(cancelPage, false);
        }
    }


    finishWizard() {
        if (this.wizard) {
            let wiz = this.wizard;
           this.endCurrentWizardPage();
           let finishPage = wiz.finishLandingPage ? wiz.finishLandingPage : wiz.cancelLandingPage;
           delete this.wizard;
           this.clearPageStack();
           this.showPage(finishPage, false);
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


    isOptionStockProcessed() {
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
                let material = thiz.profileList[stock.materialId].material;
                if (material.actions.includes(thiz.state.action)) {
                   let name = `${stock.width}mm x ${stock.height}mm, ${material.name} `
                   list.push({"name": name, "value": profile.id});
                }
            }
        });
        return list;
    }


    stockContinue() {
        this.setState('alignStock', false)
        this.showPage('initProcessPage');
    }


    stockProcessed() {
        this.setState('alignStock', true)
        this.showPage('initProcessPage');
    }


    initProcessing() {
        let state = this.state;
        let stock = this.profileList[state.stockId].stock;
        let material = this.profileList[stock.materialId].material;
        let defaults = this.profileList.default;

        // Build the complete profile used by all processing of this action...
        let profile = Object.assign({}, defaults, { material }, { stock }, { state });
        if (profile.state.stockIsBlank) {
            profile.state.alignStock = false;
        }

        // Normalize so the width of the stock is always the long side...
        let longSide = Math.max(profile.stock.width, profile.stock.height);
        let shortSide = Math.min(profile.stock.width, profile.stock.height);
        profile.stock.width = longSide;
        profile.stock.height = shortSide;


        // Remove superfluous values that came from from defaults...
        delete profile.id;
        delete profile.value;
   
        this.currentProfile = profile;

        ipcRenderer.invoke('projectloader-prepare', { callbackName: "ui-final-prep", profile });
    }



    finalPrep(profile) {
        this.currentProfile = profile;
        if (!this.checkBoardSize(profile)) {
            // Board will not fit on stock
            let popup = {
                message: `${profile.state.projectId} (${profile.state.size.x} mm x ${profile.state.size.y} mm) ` +
                         `does not fit on stock ${profile.stock.width} mm x ${profile.stock.height} mm`,
                buttonDefs: [
                    {  label: 'Ok', pageId: 'stockPage', pushOld: false }
                ]
            }
            this.popupMessage(popup)
        }
        else if (profile.state.stockIsBlank) {
            this.showPage('centerPage', false)
        }
        else {
           // Time to continue...
           this.dispatchProcess(profile);
        }
    }


    // Does the board fit on the stock?
    checkBoardSize(profile) {
        let boardWidth = profile.state.size.x;
        let boardHeight = profile.state.size.y;
        return (boardWidth <= profile.stock.width && boardHeight <= profile.stock.height);
    }


    onCenterButton(centerBoard) {
        this.currentProfile.state.centerBoard = centerBoard;
        this.dispatchProcess(this.currentProfile);
    }


    /**
     * Dispatch program control to the next steps in the process. The uiDispatch[action]
     * dispatch functiomn is defined for each action (expose, mill, drill) in the individual
     * process controller classes (ExposeController, MillController, etc.)
     * @param {*} profile The current process profile gathered thus far.
     */
    dispatchProcess(profile) {
        let fnDispatch = window.uiDispatch[this.state.action];
        fnDispatch(profile);
    }

    /**
     * Cancel control currently managed by the individual process controllers. The uiCancelProcess[action]
     * cancel functiomn is defined for each action (expose, mill, drill) in the individual
     * process controller classes (ExposeController, MillController, etc.)
     */    
    cancelProcesses() {
        let fnCancel = window.uiCancelProcess[this.state.action];
        if (fnCancel) {
            fnCancel();
        }
    }

    startJogMode() {
        ipcRenderer.invoke('cnc-jog-mode');
    }

    endJogMode() {
        ipcRenderer.invoke('cnc-cancel');
        this.showPage('settingsPage', false);
    }
}

export { UIController }
