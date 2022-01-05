
"use strict"
import { ExposureCanvas } from './ExposureCanvas.js';
import { RPCClient } from './RPCClient.js'
import { RenderMQ } from './RenderMQ.js'

/*
Visible area of LCD screen: (26, 43) to (1411, 2530)
(width is 1386, height is 2488)

window.innerWidth: 1440
window.innerHeight: 2560
*/


// Sharp LS055R1SX04 5.5 LCD
// const ppmmWidth = 21.15158636;
// const ppmmHeight = 21.16402116;
// const ppinWidth = 537.250293;
// const ppinHeight = 537.566137464;

// Mac 27 inch Thunderbolt display
// const ppmmWidth = 4.2;
// const ppmmHeight = 4.2;
// const ppinWidth = 109;
// const ppinHeight = 109;


const CORNER_NAV_EVENT = 'render.expose.cornerNav'

class ExposeController extends RPCClient {

   constructor() {
        super('expose');

        this.exposureCanvas = new ExposureCanvas();

        window.uiDispatch.expose = (profile) => {
           this.startExposeWizard(profile);
        }

        RenderMQ.on(CORNER_NAV_EVENT, (data) => {
           if (data.dir != 'Ok') {
              this.exposureCanvas.moveCursor(data.dir, data.speed);
           }
        })        
   }


   startExposeWizard(profile) {
      this.activeProfile = profile;

      let thiz = this;
      let ui = window.uiController;
      this.exposureCanceled = false;
      this.exposureCanvas.reset();
      this.finalMaskProfile = Object.assign({}, profile.mask);

      let wizard = {
          title: "Expose PCB",

          cancelLandingPage: "startPage",
          steps: [
               { id: "start",
                  subtitle: "Preparing files",
                  instructions: "Preparing files for exposure...",
                  buttonDefs: [
                     { label: "Cancel", fnAction: () => { thiz.cancelExposure() } }                      
                  ],
                  onActivate: async (wizStep) => {
                     // Initial exposure is using "sample" trace...
                     profile.mask.traceColor = 'white';
                     profile.mask.bgColor = 'black'
                     await thiz.prepareExposure();
                     thiz.nextStep();
                  }
               },

               { id: "findCorner",
                  subtitle: "Locate Board Corner",
                  instructions: "Position the cursor at the corner of the board closest to center or screen and press ok",
                  buttonDefs: [
                     { label: "Ok", fnAction: () => { thiz.exposureCanvas.activateCursor(false) } },
                     { label: "Keypad", fnAction: () => { thiz.useKeypadForCornerCursor(); } },                     
                     { label: "Cancel", fnAction: () => { thiz.cancelExposure() } }                      
                  ],
                  onActivate: async (wizStep) => {
                     window.setWizardInstructions(`Place ${profile.state.side} side face down then position the cursor at the corner of the board closest to center or screen and press ok`)
                     await thiz.rpCall('uv.safelight', true);
                     let startX, startY;
                     let mmOther = {};
                     let maskArea = Config.mask.area;
                     if (profile.state.side === 'bottom') {
                         // Looking for LL corner...
                         mmOther = this.exposureCanvas.toPCB({ x: maskArea.pxUR.x, y: maskArea.pxUR.y });
                         startX = mmOther.x - profile.stock.width;
                         startY = mmOther.y - profile.stock.height;
                     }
                     else {
                        // Looking for UL corner...
                        mmOther = this.exposureCanvas.toPCB({ x: maskArea.pxLR.x, y: maskArea.pxLR.y });
                        startX = mmOther.x - profile.stock.width;
                        startY = mmOther.y + profile.stock.height;
                     }

                     let mmCorner = { x: startX, y: startY }
                     mmCorner = await this.exposureCanvas.getPcbLocation(mmCorner, mmOther);
                     if (!this.exposureCanceled) {
                        let dx = mmCorner.x - startX;
                        let dy = mmCorner.y - startY;
                        let profile = this.activeProfile;
                        profile.stock.actual = { width: profile.stock.width - dx, height: profile.stock.height - dy }
                        console.log('Stock actual', profile.stock.actual);
                        thiz.nextStep();
                     }
                     else {
                        console.log('get corner was canceled');
                     }
                   },
                   onDeactivate: async (wizStep) => {
                     await thiz.rpCall('uv.safelight', false);
                   }
               },


               { id: "startExposure",
                  subtitle: "Expose board",
                  instructions: "Place lid on exposure table and press 'Start' to start the exposure process.",
                  buttonDefs: [
                     { label: "Start", next: true, btnClass: 'btnStartExposure' },
                     { label: "Cancel", fnAction: () => { thiz.cancelExposure() } }                      
                  ],
                  onActivate: async (wizStep) => {
                     // Prepare for final exposure using "real" trace mask...
                     window.setWizardSubtitle(`Expose board ${profile.state.side}`)
                     $('#wizardPage .btnStartExposure').css("display", "none");
                     profile.mask = this.finalMaskProfile;
                     await thiz.prepareExposure();
                     $('#wizardPage .btnStartExposure').css("display", "block");
                  }
               },

               { id: "expose",
                  subtitle: "Exposing board",
                  instructions: "Exposing...",
                  buttonDefs: [
                     { label: "Cancel", fnAction: () => { thiz.cancelExposure() } }                      
                  ],
                  onActivate: (wizStep) => {
                     setTimeout(() => { ui.showPage('exposurePage', false)}, 25);
                  }
               },

               { id: "finishExpose",
                  subtitle: "Exposure Complete",
                  instructions: "Do you want to drill PCB holes now?",
                  buttonDefs: [
                     { label: "Yes", fnAction: () => { thiz.finishExposeWizard(true) } },
                     { label: "No", fnAction: () => { thiz.finishExposeWizard(false) } }
                  ],
                  onActivate: (wizStep) => {
                     let thisProfile = thiz.activeProfile;
                     let lastProfile = window.uiController.lastProfile;
                     if (  thisProfile.state.project.sides.length > 1 && 
                           thisProfile.material.sides > 1 &&
                          (lastProfile?.state?.projectId != thisProfile?.state?.projectId ||
                           lastProfile?.state?.side === thisProfile?.state?.side)
                        ) {
                        window.setWizardInstructions('Do you want to expose the other side of board?')
                        thiz.exposeOtherSide = true;
                        thiz.drillOtherSide = false;
                     }
                     else if (window.Config.app.hasCNC && thisProfile.state.project.hasDrill) {
                        window.setWizardInstructions('Do you want to drill PCB holes now?')
                        thiz.exposeOtherSide = false;
                        thiz.drillOtherSide = true;
                     }
                     else {
                        setTimeout(() => { thiz.finishExposeWizard(false) }, 25);
                     }
                  }
               }               
         ]
      }
      
      window.uiController.startWizard(wizard);

   }


   async useKeypadForCornerCursor() {
      if (!this.keypadInUse) {

          this.keypadInUse = true;

          const label = 'Locate corner'
          await window.uiController.directionInput(label, CORNER_NAV_EVENT);

          // Turn the cursor off, ending the input for the corner
          uiExpose.exposureCanvas.activateCursor(false);

          this.keypadInUse = false;
      }
   }


   nextStep() {
      if (!this.exposureCanceled) {
         window.uiController.wizardNext();
      }
   }

   async prepareExposure() {
      this.activeProfile.traceColor = this.activeProfile.mask.traceColor;
      let renderObj = await this.rpCall('files.loadSVG', this.activeProfile, true);
      this.exposureCanvas.setSVG(renderObj);
   }


   async startExposure() {
     $('#exposurePage .page-header .header-area').text(`Exposing ${this.activeProfile.state.side}`);
     let ui = window.uiController;
     await this.rpCall('uv.expose', this.activeProfile);
   }


   cancelExposure() {
     this.exposureCanceled = true;
     this.exposureCanvas.activateCursor(false)
     this.exposureCanvas.reset();
     this.rpCall('uv.cancel');
     window.uiController.cancelWizard();
     delete this.activeProfile;     
   }


   finishExposure() {
      window.uiController.wizardNext();
   }


   finishExposeWizard(continueProcessing) {
      window.uiController.finishProcess();

      if (continueProcessing) {
          let profile = window.uiController.currentProfile;

          if (this.exposeOtherSide) {
            // Expose the "flip" side of this board next
            profile.state.action = 'expose';
            profile.state.side = (profile.state.side === 'top' ? 'bottom' : 'top');
            profile.state.alignStock = false;
            profile.state.stockIsBlank = false;
            profile.state.stockReuse = true;
            window.uiController.state = profile.state;
          }
          else {
            // Drill the current side of this board
            profile.state.action = 'drill';
            profile.state.alignStock = true;
            profile.state.stockReuse = false;
            profile.state.stockIsBlank = false;
            window.uiController.state = profile.state;
          }
          window.uiController.initProcessing();
      }
      else {
          window.uiController.finishWizard();
      }
  }

  peek() {
    this.rpCall('uv.peek');
  }   

  
}

export { ExposeController }
