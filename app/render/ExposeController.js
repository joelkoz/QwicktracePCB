
"use strict"
import { ExposureCanvas } from './ExposureCanvas.js';
import { RPCClient } from './RPCClient.js'

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


class ExposeController extends RPCClient {

   constructor() {
        super('expose');

        this.exposureCanvas = new ExposureCanvas();

        window.uiDispatch.expose = (profile) => {
           this.startExposeWizard(profile);
        }
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


               { id: "placeStock",
                  subtitle: "Place stock on table",
                  instructions: "Place the stock face down in the same corner as the traces. Press Next to continue",
                  buttonDefs: [
                     { label: "Next", next: true },
                     { label: "Cancel", fnAction: () => { thiz.cancelExposure() } }                      
                  ],
                  onActivate: async (wizStep) => {
                     await thiz.rpCall('uv.safelight', true);
                  },
                  onDeactivate: async (wizStep) => {
                     await thiz.rpCall('uv.safelight', false);
                  }
               },

               { id: "findCorner",
                  subtitle: "Locate Board Corner",
                  instructions: "Position the cursor at the corner of the board closest to center or screen and press ok",
                  buttonDefs: [
                     { label: "Ok", fnAction: () => { thiz.exposureCanvas.activateCursor(false) } },
                     { label: "Cancel", fnAction: () => { thiz.cancelExposure() } }                      
                  ],
                  onActivate: async (wizStep) => {
                     let startX, startY;
                     if (profile.state.side === 'bottom') {
                         // Looking for LL corner...
                         startX = 0;
                         startY = 0;
                     }
                     else {
                        // Looking for upper right corner...
                        startX = 0;
                        startY = profile.stock.height;
                     }

                     let corner = { x: startX, y: startY }
                     corner = await this.exposureCanvas.getPcbLocation(corner);
                     if (!this.exposureCanceled) {
                        let dx = corner.x - startX;
                        let dy = corner.y - startY;
                        let profile = this.activeProfile;
                        profile.stock.actual = { width: profile.stock.width - dx, height: profile.stock.height - dy }
                        console.log('Stock actual', profile.stock.actual);
                        thiz.nextStep();
                     }
                     else {
                        console.log('get corner was canceled');
                     }
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
               }
         ]
      }
      
      window.uiController.startWizard(wizard);

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
     let ui = window.uiController;
     let exposure = this.activeProfile.exposure;
     await this.rpCall('uv.expose', exposure);
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
      window.uiController.finishWizard();
   }

   peek() {
     this.rpCall('uv.peek');
   }   
     
}

export { ExposeController }
