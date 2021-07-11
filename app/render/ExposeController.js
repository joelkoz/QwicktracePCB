
"use strict"

const { ipcRenderer } = require('electron')

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


class ExposeController {

   constructor(config) {
        this.config = config.mask;
        this.config.height = config.super.height;
        this.paintCtx = { url: null};

        let canvas = document.getElementById('uv-mask');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let thiz = this;
     
        window.addEventListener('resize', () => {
           canvas.width = window.innerWidth;
           canvas.height = window.innerHeight;
           thiz.paint();
        });
     
        ipcRenderer.on('mask-load-svg', (event, renderObj) => {
            thiz.renderSVG(renderObj);
        });

        ipcRenderer.on('mask-profile-default', (event, profileDefault) => {
           console.log('event mask-profile-default');
           thiz.defaultProfile = profileDefault;
           thiz.resetPaintCtx();
         });
     
        this.resetPaintCtx();

        window.uiDispatch.expose = (profile) => {
         thiz.prepareExposure(profile);
        }
   }


   prepareExposure(profile) {
      let ui = window.uiController;

      let projectId = ui.state.projectId;

      this.exposureProfile = profile;

      let callbackEvt = "mask-load-svg";
      ipcRenderer.invoke('fileloader-load', { fileDef, profile, callbackEvt });        
  }


  startExposure() {
     let ui = window.uiController;
     let exposure = this.exposureProfile.exposure;
     ipcRenderer.invoke('uv-expose', exposure);
  }


  cancelExposure() {
     let ui = window.uiController;
     ipcRenderer.invoke('uv-cancel');
     ui.showPage('exposureStartPage');
  }


  peek() {
     ipcRenderer.invoke('uv-peek');
  }   

   invertImage() {
        this.paintCtx.profile.invertImg = !this.paintCtx.profile.invertImg;
        paint();
    }
     
   invertCanvas() {
        this.paintCtx.profile.invertImg = !this.paintCtx.profile.invertImg;
        this.paintCtx.profile.invertCanvas = !this.paintCtx.profile.invertCanvas;
        paint();
   }
     
   mirrorImage() {
        this.paintCtx.profile.mirror = !this.paintCtx.profile.mirror;
        paint();
   }
     

   paint() {
      const canvas = document.getElementById('uv-mask');
      const ctx = canvas.getContext('2d');
   
      // This is a hack to force a full screen repaint...
      canvas.width = canvas.width;
   
      if (this.paintCtx.profile.invertImg) {
         ctx.filter = "invert(100%)";
      }
      else {
         ctx.filter = "none";
      }
   
      if (this.paintCtx.profile.invertCanvas) {
         canvas.style.backgroundColor = 'black';
      }
      else {
         canvas.style.backgroundColor = 'white';
      }
   
      ctx.clearRect(0,0,canvas.width, canvas.height);
      if (this.paintCtx.img == null) {
         return;
      }
   
      let dx = 0;
      let dy = 0;
      let xScale = 1;
      let yScale = 1;

      if (this.paintCtx.profile.mirror) {
         xScale = -1;
         dx = -(this.config.width - this.config.marginX - this.paintCtx.minX);
      }
      else {
         xScale = 1;
         dx = this.config.marginX + this.paintCtx.minX;
      }

      yScale = 1;
      dy = this.config.height - this.config.marginY - this.paintCtx.height  - this.paintCtx.minY;

      ctx.save();
      ctx.scale(xScale,yScale);
         // let x;
         // if (process.platform == 'darwin') {
         //    // Mirror image left edge calc is different on Mac OS X Chrome...
         //    minX = this.config.marginX - this.paintCtx.width / 2
         // }
         // else {
         //    minX = -minX;
         // }
      ctx.drawImage(this.paintCtx.img, dx, dy, this.paintCtx.width, this.paintCtx.height);
      ctx.restore();
   }

   
   resetPaintCtx() {
     
      if (this.paintCtx.url != null) {
         URL.revokeObjectURL(this.paintCtx.url);
      }
   
      this.paintCtx = {
         img: null,
         url: null
      }

      if (this.defaultProfile) {
         this.paintCtx.profile = this.defaultProfile;
      }
      
   }

   
   renderSVG(renderObj) {
     
      this.resetPaintCtx();
      this.paintCtx.profile = renderObj.profile;
      this.paintCtx.url = URL.createObjectURL(new Blob([renderObj.svg], { type: 'image/svg+xml' }));
      this.paintCtx.viewBox = renderObj.viewBox;
   
      let thiz = this;
      this.paintCtx.img = new Image();
      this.paintCtx.img.onload = function() {

         // The image width and height as pre-determined by pixel width as a default...
         thiz.paintCtx.width = this.naturalWidth;
         thiz.paintCtx.height = this.naturalHeight;
   
         // What are the multipliers for the view box width and height?
         let mw = renderObj.viewBox[2] / renderObj.width;
         let mh = renderObj.viewBox[3] / renderObj.height;

         // Convert view box offsets to their natural numbers...
         let minX = renderObj.viewBox[0] / mw;
         let minY = renderObj.viewBox[1] / mh;

         if (renderObj.units) {
            switch (renderObj.units) {
   
               case 'mm':
                  console.log('SVG size specified in mm');
                  thiz.paintCtx.width = renderObj.width * thiz.config.ppmmWidth;
                  thiz.paintCtx.height = renderObj.height * thiz.config.ppmmHeight;
                  thiz.paintCtx.minX = minX * thiz.config.ppmmWidth;
                  thiz.paintCtx.minY = minY * thiz.config.ppmmHeight;
                  break;
   
               case 'cm':
                  console.log('SVG size specified in cm');
                  thiz.paintCtx.width = renderObj.width * thiz.config.ppmmWidth * 10.0;
                  thiz.paintCtx.height = renderObj.height * thiz.config.ppmmHeight * 10.0;
                  thiz.paintCtx.minX = minX * thiz.config.ppmmWidth * 10.0;
                  thiz.paintCtx.minY = minY * thiz.config.ppmmHeight * 10.0;
                  break;
      
               case 'in':
                  console.log('SVG size specified in inches');
                  thiz.paintCtx.width = renderObj.width * thiz.config.ppinWidth;
                  thiz.paintCtx.height = renderObj.height * thiz.config.ppinHeight;
                  thiz.paintCtx.minX = minX * thiz.config.ppinWidth;
                  thiz.paintCtx.minY = minY * thiz.config.ppinHeight;
                  break;
      
            }
         }
   
         thiz.paintCtx.invertImg = renderObj.invert;
         thiz.paintCtx.mirror = renderObj.mirror;
         thiz.paint();
   
         // A second refresh seems to be needed on Rapsberry Pi...
         setTimeout(() => { thiz.paint(); }, 10);
   
      }   
   
      this.paintCtx.img.src = this.paintCtx.url;
   }
     
}

export { ExposeController }
