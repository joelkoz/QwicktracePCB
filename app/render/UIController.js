
import { RPCClient } from './RPCClient.js'
import { RenderMQ } from './RenderMQ.js'
import { BOARD_POSITIONS } from './PositionController.js';

const { untilEvent } = require('promise-utils');

/**
 * Class for handling the display logic for the UI, maintaining
 * state of the UI, and communicating with the main process.
 */
class UIController extends RPCClient {

    constructor(appConfig) {
        super('ui')

        this.profileList = {};
        this.projectList = {};
        this.state = {};
        this.lastProfile = {}
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

        RenderMQ.on('render.ui.profileUpdate', (profile) => {

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
         

        RenderMQ.on('render.ui.projectUpdate', (projObj) => {

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
         
         
        RenderMQ.on('render.ui.pageAdd', (pageContents) => {
            try {
                console.log(`event render.ui.pageAdd`);
                let _ui = $('#ui');
                let newPage = _ui.append(pageContents);
                newPage.show();
            }
            catch (err) {
                console.log(`Error adding UI page ${pageContents}`);
                console.error(err);
             }            
        });
         

        RenderMQ.on('render.startup.startUI', () => {
            thiz.start();
        });


        RenderMQ.on('global.cnc.joystick', (stickPos) => {
            // console.log('Joystick: ', stickPos);
        });

        RenderMQ.on('global.cnc.joystickPress', (jogMode) => {
            console.log(`Joystick pressed (jog mode ${jogMode})`);
        });


        RenderMQ.on('render.ui.showPage', (data) => {
            if (data.clearPageStack) {
                thiz.clearPageStack();
            }
            thiz.showPage(data.pageId);
        });


        RenderMQ.on('render.ui.popupMessage', (msg) => {
            console.log('Popup msg: ', msg)
            let isError = (msg.startsWith('ERROR'));
            if (!isError || !window.appConfig.ui.ignoreErrors) {
               thiz.popupMessage({ message: msg });
            }
        });

    }


    start() {
        this.state = {}
        let thiz = this;

        // The touchscreen on the Pi will not register mouse clicks
        // like one would expect. Make all our buttons respond
        // to touchstart events as if a mouse was clicked...
        $('.btn').on('touchstart', function() {
            ui.publish('global.ui.btnPress');
            $(this).trigger('click');
        });

        $('body').addClass(appConfig.ui.bodyClass);

        $(".btn.back").on("click", () => { thiz.backPage() });

        $(".btn.wizardBack").on("click", () => { thiz.cancelWizard() });

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
        else if (btnDef.gotoStepId) {
            this.gotoWizardPage(btnDef.gotoStepId);
        }
        else if (btnDef.emit) {
            RenderMQ.emit(btnDef.emit.evtName, btnDef.emit.data);
        }
        else if (btnDef.call) {
            this.rpCall(btnDef.call.name, ...(btnDef.call.data));
        }
        else if (btnDef.fnAction) {
            btnDef.fnAction();
        }
    }


    /**
     * Prompts the user to input a number, then returns that value
     * @param {string} initialValue The initial value to display.
     */
    async getNumber(inputLabel='', initialValue = '') {
        this.popupMessage({ popupId: 'numberInput' });
        $(".inputContainer .inputValue").val(initialValue);
        $('.inputContainer label').text(inputLabel)
        let finalVal = await untilEvent(RenderMQ.getInstance(), 'ui.numberInput', () => { return false; });
        return finalVal;
    }


    startWizard(wizard, wizardStepId) {
        this.wizard = wizard;
        if (!wizardStepId) {
            wizardStepId = wizard.steps[0].id;
        }
        this.gotoWizardPage(wizardStepId);
    }


    gotoWizardPage(wizardStepId) {
        this.endCurrentWizardPage();
        this.wizardStepId = wizardStepId;
        let thiz = this;
        setTimeout(() => { thiz.showPage('wizardPage', false)}, 10);
    }


    getWizardStep(wizardStepId) {

        if (!wizardStepId) {
            // If no parameter specified, use the current step Id...
            wizardStepId = this.wizardStepId;
        }

        let wdata = this.wizard.steps.find((e) => { 
            return (e.id === wizardStepId);
        });

        if (wdata) {
            wdata.title = this.wizard.title;
            return wdata;
            // return Object.assign({}, wdata, { title: this.wizard.title });
        }
        else {
            this.popupMessage({ message: `Can not find wizard step ${wizardStepId}` });
            return {};
        }
    }


    endCurrentWizardPage() {
        if (this.wizard && this.wizardStepId) {
            let wiz = this.getWizardStep(this.wizardStepId);
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
           let wiz = this.wizard;
           let cancelPage = wiz.cancelLandingPage ? wiz.cancelLandingPage : wiz.finishLandingPage;
           delete this.wizard;
           this.clearPageStack();
           this.rpCall('cnc.cancelProcesses');
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

    get wizardActive() {
        return (this.wizard ? true : false)
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
        delete this.state[propertyName];
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
        RenderMQ.emit(event, data);
    }

    subscribe(event, callback) {
        RenderMQ.on(event, callback);
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



    /**
     * Returns TRUE if using the stock already in the mill is an option 
     * the user has.
     */
    isOptionStockContinue() {
        let lastState = this.lastProfile.state;
        if (lastState) {
            let state = this.state;
            return (state.projectId === lastState.projectId &&
                    state.action != 'expose' && lastState.action != 'expose' &&
                    state.side === lastState.side);
        }
        return false;
    }


    /**
     * Returns TRUE if loading previously processed stock into
     * the mill is an option.
     */
    isOptionStockProcessed() {
        let lastState = this.lastProfile.state;
        if (lastState) {
            let state = this.state;
            if (state.projectId === lastState.projectId &&
                state.side != lastState.side) {
                return true;
            }
        }
        return this.state.action === 'drill';
    }


    /**
     * Returns a list of options of blank stock the user
     * can chose to process in the mill.
     */
    getStockList() {
        let list = [];

        let profiles = Object.values(this.profileList);
        let thiz = this;
        profiles.forEach(profile => {
            if (profile.hasOwnProperty('stock')) {
                let stock = profile.stock;
                let material = thiz.profileList[stock.materialId].material;
                if (material.actions.includes(thiz.state.action)) {
                   let name;
                   if (stock.width) {
                       name = `${stock.width}mm x ${stock.height}mm, ${material.name} `
                   }
                   else {
                        name = `Custom ${material.name} `
                   }
                   list.push({"name": name, "value": profile.id});
                }
            }
        });
        return list;
    }


    /**
     * Called when the user wants to continue with the current side
     * already in the mill
     */
    stockContinue() {
        this.setState('alignStock', false)
        this.setState('stockIsBlank', false);
        this.setState('stockReuse', true);
        this.showPage('initProcessPage');
    }


    /**
     * Called when the user wants to continue with a previously 
     * processed board that is not currently in the mill
     */
    stockProcessed() {
        this.setState('alignStock', true)
        this.setState('stockIsBlank', false);
        this.setState('stockReuse', false);
        this.showPage('stockSelectPage');
    }

    /**
     * Called to indicate that new blank stock is going to be used
     * in the mill.
     */
    stockIsNew(pushOld) {
        this.lastProfile = {}
        this.setState('stockIsBlank', true);
        this.setState('alignStock', false)
        this.showPage('stockSelectPage', pushOld);
    }


    async initProcessing() {

        let state = this.state;
        let defaults = this.profileList.default;

        let stock, material, mask;
        if (state.stockReuse) {
            stock = this.lastProfile.stock;
            material = this.lastProfile.material;
            mask = this.lastProfile.mask;
        }
        else if (state.stockId) {
            // Use user selected stock in the processing profile
            stock = this.profileList[state.stockId].stock; 
            material = this.profileList[stock.materialId].material;
            mask = this.profileList[stock.materialId].mask
            if (!stock.width) {
                // A custom stock setting was used...
                stock = Object.assign({}, stock);
                stock.width = state.customStockWidth;
                stock.height = state.customStockHeight;
            }
        }
        else {
            // No explicit stock was selected. Use implied values from the Gerber definitions...
            let originalSize = await this.rpCall('projects.getOriginalSize', state.projectId)
            stock = { width: originalSize.x, height: originalSize.y, materialId: defaults.material.name }
            material = defaults.material;
            mask = defaults.mask;
        }

        // Build the complete profile used by all processing of this action...
        let profile = Object.assign({}, defaults, { material }, { stock }, { state });
        if (mask) {
            profile = Object.assign(profile, { mask });
        }

        // Normalize so the width of the stock is always the long side...
        let longSide = Math.max(profile.stock.width, profile.stock.height);
        let shortSide = Math.min(profile.stock.width, profile.stock.height);
        profile.stock.width = longSide;
        profile.stock.height = shortSide;


        // Remove superfluous values that came from from defaults...
        delete profile.id;
        delete profile.value;
        delete profile.state.activeListId;
        delete profile.state.page;

        profile = await this.rpCall('projects.prepareForWork', profile);

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
        else if (profile.state.stockIsBlank || (profile.state.alignStock && !profile.state.hasOwnProperty('positionBoard'))) {
            // Board is smaller than stock and we are not going to pre-align.
            // See where the user wants to position the board on the stock.
            this.showPage('positionPage', false)
            await window.uiPos.init(profile);
            let posCount = await window.uiPos.getValidPositionCount();
            if (posCount < 2) {
                // There is only one (the natural) position available.
                // No need to ask the user to select...
                this.currentProfile.state.positionBoard = BOARD_POSITIONS.NATURAL;
                this.dispatchProcess(this.currentProfile);
            }
        }
        else {
           // Just continue on without any explicit board positioning...
           this.dispatchProcess(profile);
        }
    }


    // Does the board fit on the stock?
    checkBoardSize(profile) {
        let boardWidth = profile.state.size.x;
        let boardHeight = profile.state.size.y;
        return (boardWidth <= profile.stock.width && boardHeight <= profile.stock.height);
    }


    onPositionButton(positionNumber) {
        this.currentProfile.state.positionBoard = positionNumber;
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
     * Marks the active process as completed and prepares to start a new one.
     */    
    finishProcess() {
        // Do a quasi deep copy...
        this.lastProfile = Object.assign({}, this.currentProfile);
        this.lastProfile.state = Object.assign({}, this.currentProfile.state);
        this.lastProfile.stock = Object.assign({}, this.currentProfile.stock);
    }


    /**
     * Returns TRUE if the profiles are such that we are now drilling holes in the
     * same side of the same board we just milled.
     */
    skipStockLoading() {
        if (this?.lastProfile?.state) {
            let currentState = this.currentProfile.state;
            let lastState = this.lastProfile.state;
            return currentState.action === 'drill' &&
                   currentState.projectId === lastState.projectId &&
                   currentState.side == lastState.side &&
                   currentState.stockId == lastState.stockId
        }
        return false;
    }

    selectPCBPosition() {
       RenderMQ.emit('main.cnc.uiPositionSelect')
    }
}

export { UIController }
