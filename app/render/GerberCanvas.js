
"use strict"
import { RPCClient } from './RPCClient.js'
import { RenderMQ } from './RenderMQ.js'
const { deskew } = require('deskew')


const CANVAS_ID = 'align-canvas';
const DIV_INSTRUCTIONS_ID = 'align-instructions';

const CANVAS_SAVE_WIDTH = 24;

const CANVAS_BG_COLOR = '#FFF8DC';
const CANVAS_TRACE_COLOR = '#DEB887';
const CANVAS_HOLE_COLOR = 'black';

const msBLINK_INTERVAL = 500;

const DRAW_HOLE_DIAMETER = 4;
const DRAW_BLINK_DIAMETER = 6;
const DRAW_BLINK_WIDTH = 2;

const PIXEL_MARGIN = 10;

const wcsMACHINE_WORK = 0;
const wcsPCB_WORK = 1;

/**
 * A class that represents a Gerber file and is capable of rendering
 * both the the traces and the drilled holes of the PCB. It also
 * can optionally handle deskew.
 */
class GerberCanvas extends RPCClient {

    constructor(parentRpcPrefix) {

        super(`${parentRpcPrefix}Canvas`)

        let config = window.appConfig;
        this.uiWidth = config.ui.width;
        this.uiHeight = config.ui.height;
        
        this.saveImage = document.createElement('canvas');
        this.saveImage.width = CANVAS_SAVE_WIDTH;
        this.saveImage.height = CANVAS_SAVE_WIDTH;

        this.blinkPoint = null;
    }


    // Initializes the hole alignment process. fnAlignmentComplete
    // will be called when the alignment process has finished.
    initAlignment(fnAlignmentComplete) {
        this.fnAlignmentComplete = fnAlignmentComplete;

        let bb = this.mmBoundingBox;

        // For skew correction, we need two points...
        this.deskewData = [
            { "sample": this.closestTo( { "x": bb.min.x, "y": bb.max.y } ).coord },
            { "sample": this.closestTo( { "x": bb.max.x, "y": bb.min.y } ).coord }
        ];

        // For the UI input of skew correction...
        this.deskewIndex = -1;
        this.deskew = null;

        this.positionNext();
    }



    cancelAlignment() {
        this.blinkOff(false);
        this.deskewIndex = 99;
    }


    // Called when the next alignment position should be obtained.
    positionNext() {
        this.blinkOff(false);
        this.deskewIndex++;

        let instructionsSelector = '#' + DIV_INSTRUCTIONS_ID;
        if (this.deskewIndex <= 1) {
           $(instructionsSelector).text(`Adjust pointer to hole ${this.deskewIndex+1} and press joystick`);
           this.startBlink();
           let thiz = this;
           let sample = this.deskewData[this.deskewIndex].sample

           if (this.deskewIndex === 1) {
               // Guess that the second sample will have the same actual offset
               // as the first sample...
               let firstSample = this.deskewData[0].sample;
               let firstActual = this.deskewData[0].actual;
               let offsetX = firstActual.x - firstSample.x;
               let offsetY = firstActual.y - firstSample.y;
               sample = Object.assign({}, { x: sample.x + offsetX, y: sample.y + offsetY })
           }

           this.getAlignmentHole(sample);
        }
        else {
            $(instructionsSelector).text(`Done`);
            this.deskewDone();
        }
    }


    // Sets the alignment data for the current sample hole to
    // the specified PCB coordinate.
    async getAlignmentHole(samplePoint) {
        let pcbCoord = await this.rpCall('cnc.locatePoint', samplePoint, wcsPCB_WORK)
        this.saveAlignmentHole(pcbCoord)
    }    


    saveAlignmentHole(pcbCoord) {
        if (this.deskewIndex >= 0 && this.deskewIndex <= 1) {
            this.deskewData[this.deskewIndex].actual = pcbCoord;

            console.log(`User found alignment hole ${this.deskewIndex+1} at `, pcbCoord)
            // Draw the newly posistioned hole...
            this.blinkOff(false);
            const ctx = this.canvas.getContext('2d')
            this.drawHole(ctx, pcbCoord, 'red');

            this.positionNext();
        }
    }


    // Called when all alignment data has been obtained and completes
    // the process.
    deskewDone() {
        this.blinkOff(false);
        console.log(`Deskew completed: ${JSON.stringify(this.deskewData)}`);

        let A = this.deskewData[0];
        let B = this.deskewData[1];
        let dresult = deskew(A.sample, B.sample, A.actual, B.actual);
        console.log(`Deskew results: ${JSON.stringify(dresult)}`);
        this.deskew = dresult;

        this.setDeskewDataClient(A);
        this.setDeskewDataClient(B);

        // Redraw the holes...
        this.paint();
        this.redrawAlignmentHole(A);
        this.redrawAlignmentHole(B);

        this.fnAlignmentComplete(dresult);
    }


    // Computes the raw client pixel coordinates of
    // the specified alignment sample then sets
    // the "client" properties of that sample to
    // the results
    setDeskewDataClient(sample) {
        let pcbCoord = sample.actual;
        let canvasCoord = this.toCanvas(pcbCoord);
        let clientCoord = this.canvasToClient(canvasCoord);
        sample.client = clientCoord;
    }

    // Draws an alingment hole for the specified sample
    // using the "client" pixel coordinates of the sample
    // This allows a sample to be drawn in the correct
    // spot even if the pcb and/or canvas coordinate 
    // transformations have changed.
    redrawAlignmentHole(sample) {
        let clientCoord = sample.client;
        let canvasCoord = this.clientToCanvas(clientCoord);
        let pcbCoord = this.toPCB(canvasCoord);
        let ctx = this.canvas.getContext('2d');
        this.drawHole(ctx, pcbCoord, 'red');
    }


    // Responds to simulated alignment selection during debugging by
    // using the mouse as a proxy for the CNC positioning laser...
    mouseDown(mouseCoord) {
      let canvasCoord = this.clientToCanvas(mouseCoord);
      let pcbCoord = this.toPCB(canvasCoord);
      console.log('Canvas: ', canvasCoord, 'PCB: ', pcbCoord)
      //   let pcbCoord = this.toPCB(canvasCoord);
      //   this.saveAlignmentHole(pcbCoord);
    }

    /**
     * 
     * There are two coordinate systems at play:
     * The PCB and CNC work coordinates are in millimeters 
     * and have origin (0,0) at the board's lower left 
     * hand corner.
     *    The UI display coordiante system is in 
     * "canvas coordinates" which are in pixels. The 2D
     * drawing context is modified via setTransform()
     * so pixel (0,0) is also in the lower left hand
     * corder, with X+ to the right and Y+ moving up.
     * However, the SVG image of the PCB traces are
     * drawn in such a way as to zoom in and maximum
     * the display such that the smaller of the width
     * or height fill ups the entire canvas (minus a
     * small margin), and the other dimension
     * is centered on the canvas.  The methods
     * toCanvas() and toPCB() translate back and
     * forth between these two coordinate systems.
     * This method pre-calculates certain values used
     * in those calculations.
    */
    drawingPreCalc() {
        this.canvas = document.getElementById(CANVAS_ID);

        // Set the canvas to its maximum pixel size
        // which is the pixel size of the parent div
        let jCanvasDiv = $(this.canvas).parent();

        let ow = jCanvasDiv.outerWidth(true);
        let oh = jCanvasDiv.outerHeight(true);
        const canvas = this.canvas;
        canvas.width = ow;
        canvas.height = oh;

        let bb = this.viewBox;
        let min = { x: bb[0]/ 1000, y: bb[1] / 1000 };

        let mmBoxWidth = bb[2] /1000
        let mmBoxHeight = bb[3] / 1000;

        let max = { x: min.x + mmBoxWidth, y: min.y + mmBoxHeight }

        this.mmBoundingBox = { min, max }

        // Translation necessary to shift PCB coordinate to the viewBox minimum
        this.mmNormalizeX = 0 - min.x;
        this.mmNormalizeY = 0 - min.y;

        // Allow for a 10 pixel margin (20 pixels total) 
        // around plotted board.  
        let pxMaxHeight = canvas.height - PIXEL_MARGIN*2;
        let pxMaxWidth = canvas.width - PIXEL_MARGIN*2;

        // How many pixels per millimeter to we have
        // to display the entire board?
        let ppmmH = pxMaxHeight / mmBoxHeight;
        let ppmmW = pxMaxWidth / mmBoxWidth;

        this.pxpmm = Math.min(ppmmH, ppmmW);


        // Finally, calculate a pixel margin that will center
        // the board in the display canvas...
        this.pxBoardHeight = this.pxpmm * mmBoxHeight;
        this.pxBoardWidth = this.pxpmm * mmBoxWidth;
        this.pxMarginHeight = (pxMaxHeight - this.pxBoardHeight) / 2 + PIXEL_MARGIN;
        this.pxMarginWidth = (pxMaxWidth - this.pxBoardWidth) / 2 + PIXEL_MARGIN;
    }


    // Starts the "blink indicator" on the current sample hole
    // used for alignment data.
    startBlink() {
        this.blinkOff(false);
        setTimeout(() => { this.blinkOn() }, msBLINK_INTERVAL)
    }

    // Draws the actual blink indicator on the canvas, and
    // sets a timer to turn it off after the blink interval
    blinkOn() {
        this.blinkOff();
        if (this.deskewIndex <= 1) {
            let canvas = this.canvas;
            const ctx = this.canvas.getContext('2d')
            ctx.imageSmoothingEnabled = false;

            // Save the area we are about to draw on...
            // Clear the "save image" canvas...
            this.saveImage.width = CANVAS_SAVE_WIDTH;
            const saveCtx = this.saveImage.getContext('2d')
            
            let samplePoint = this.deskewData[this.deskewIndex].sample;
            let canvasCoord = this.toCanvas(samplePoint);
            let blinkCoord = this.canvasToClient(canvasCoord);
            saveCtx.drawImage(canvas, blinkCoord.x - CANVAS_SAVE_WIDTH/2, blinkCoord.y - CANVAS_SAVE_WIDTH/2, CANVAS_SAVE_WIDTH, CANVAS_SAVE_WIDTH, 0, 0, CANVAS_SAVE_WIDTH, CANVAS_SAVE_WIDTH);

            ctx.strokeStyle = 'red';
            ctx.lineWidth = DRAW_BLINK_WIDTH;
            ctx.beginPath();
            ctx.arc(canvasCoord.x , canvasCoord.y, DRAW_BLINK_DIAMETER, 0, 2.0*Math.PI);
            ctx.stroke();
            this.blinkPoint = blinkCoord;
            setTimeout(() => { this.blinkOff(true) }, msBLINK_INTERVAL)
        }
    }


    // Removes the blink indicator drawn by blinkOn from the canvas. If
    // repeatBlink is TRUE, the blink will be restarted after the
    // blink interval has passed.
    blinkOff(repeatBlink) {
        if (this.blinkPoint) {
            const canvas = this.canvas;
            const ctx = this.canvas.getContext('2d');

            ctx.save();
            ctx.resetTransform();
            canvas.style.backgroundColor = CANVAS_BG_COLOR;
            let halfSaveWidth = CANVAS_SAVE_WIDTH/2
            ctx.clearRect(this.blinkPoint.x - halfSaveWidth, this.blinkPoint.y - halfSaveWidth, CANVAS_SAVE_WIDTH, CANVAS_SAVE_WIDTH);
            ctx.drawImage(this.saveImage, this.blinkPoint.x - halfSaveWidth, this.blinkPoint.y - halfSaveWidth, CANVAS_SAVE_WIDTH, CANVAS_SAVE_WIDTH);
            ctx.restore();
            this.blinkPoint = null;
            if (repeatBlink) {
                this.startBlink();
            }
        }
    }


    // Draws a drill hole for the specified pcb coordinate
    // using the specified canvas draw context.
    drawHole(ctx, pcbCoord, holeColor) {
        ctx.fillStyle = holeColor;
        ctx.strokeStyle = holeColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        let canvasCoord = this.toCanvas(pcbCoord);
        ctx.arc(canvasCoord.x, canvasCoord.y, DRAW_HOLE_DIAMETER, 0, 2.0*Math.PI);
        ctx.fill();
        ctx.stroke();


    }


    // Paints the entire canvas will all of the holes that
    // are to be drilled to give the user a visual indication
    // of the final results, and to aid in locating the
    // alignment holes being requested.
    paint() {
        if (!this.canvas) {
            console.log('WARNING! GerberCanvas paint requested prior to drawingPreCalc(). Ignoring.');
            return;
        }

        const canvas = this.canvas;
        const ctx = this.canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // This is a hack to force a full screen repaint...
        canvas.width = canvas.width; 

        canvas.style.backgroundColor = CANVAS_BG_COLOR;
        ctx.clearRect(0,0,canvas.width, canvas.height);


        if (this.img) {
            ctx.drawImage(this.img, this.pxMarginWidth, this.pxMarginHeight, this.pxBoardWidth, this.pxBoardHeight);
        }

        this.setTransform(ctx);

        if (this.holeList) {
            this.holeList.forEach(hole => {
               this.drawHole(ctx, hole.coord, CANVAS_HOLE_COLOR);
            });
        }
    }



    // JSFiddle for experimenting with transforms:
    // https://jsfiddle.net/joelkoz/4gfbczk2/


    // Sets the transformation matrix for the UI display.
    setTransform(ctx) {
        // Origin at LL margin corner, x+ right, y+ up
        ctx.resetTransform();
        ctx.scale(1, -1);
        ctx.translate(0, -this.canvas.height);        

        if (this.deskew) {
            // Apply additional deskew transformation as this
            // must be a repaint...
            ctx.rotate(2*Math.PI + this.deskew.rotation);
            ctx.translate(this.deskew.offset.x* this.pxpmm, this.deskew.offset.y* this.pxpmm);
        }        
    
    }


    reset() {
        if (this.svgURL != null) {
           URL.revokeObjectURL(this.svgURL);
        }
     
        this.img = null;
        this.svgURL = null;
        this.holeList = undefined;
        this.viewBox = undefined;
        this.profile = undefined;
    }
   


    setSVG(renderObj, profile) {
     
        this.reset();
        this.profile = profile;
        this.svgURL = URL.createObjectURL(new Blob([renderObj.svg], { type: 'image/svg+xml' }));
        this.viewBox = renderObj.viewBox;

        let thiz = this;
        this.img = new Image();
        this.img.onload = function() {
           // This is called after the
           // svg data has been processed
           // following setting the Image()
           // object's src property...
           thiz.drawingPreCalc();
           thiz.paint();
        }

        // Initiate image processing by setting
        // the src attribute...
        this.img.src = this.svgURL;
    }          


    setHoles(drillObj, profile) {

        this.profile = profile;
        if (!this.mmBoundingBox) {
            // The GerberFile has not been loaded yet. 
            // this.viewBox is necessary for drawingPreCalc()
            // to run, so fake it using the drill's bounding box
            let bb = drillObj.mmBoundingBox;
            this.viewBox = [ bb.min.x * 1000, bb.min.y * 1000, bb.max.x * 1000, bb.max.y * 1000 ];
            this.drawingPreCalc();
        }

        this.holeList = drillObj.holes;

        this.paint();
    }


    // Translate PCB coordinates to UI display canvas coordinates
    toCanvas(pcbCoord) {
        return {
            x: (pcbCoord.x + this.mmNormalizeX) * this.pxpmm + this.pxMarginWidth,
            y: (pcbCoord.y + this.mmNormalizeY) * this.pxpmm + this.pxMarginHeight
        };
    }

    // Translate canvas coordinates back to PCB coordinates
    toPCB(canvasCoord) {
        let x = (canvasCoord.x - this.pxMarginWidth) / this.pxpmm - this.mmNormalizeX;
        let y = (canvasCoord.y - this.pxMarginHeight) / this.pxpmm - this.mmNormalizeY;

        return {
            "x": x,
            "y": y
        }
    }

    // Translate client coordinates (i.e. pixel coordinates like client position)
    // to canvas coordinates.
    clientToCanvas(clientCoord) {
        const ctx = this.canvas.getContext('2d');
        let matrix = ctx.getTransform();
        var imatrix = matrix.invertSelf();
        let x = clientCoord.x * imatrix.a + clientCoord.y * imatrix.c + imatrix.e;
        let y = clientCoord.x * imatrix.b + clientCoord.y * imatrix.d + imatrix.f;
        return { x, y };
    }


    // Translate canvas coordinates to client pixel coordinates
    canvasToClient(canvasCoord) {
        const ctx = this.canvas.getContext('2d');
        let matrix = ctx.getTransform();
        let x = canvasCoord.x * matrix.a + canvasCoord.y * matrix.c + matrix.e;
        let y = canvasCoord.x * matrix.b + canvasCoord.y * matrix.d + matrix.f;
        return { x: Math.round(x), y: Math.round(y) };
    }


    /**
     * Returns the hole closest to the specified coordinate that is surrounded
     * by copper on the current side (allowing the user to identify its posistion)
     */
     closestTo(pcbCoord) {

        // TODO: This needs to select a hole that intersects with traces on the visible
        // side. Holes that are not surrounded by copper on the visible side should
        // not be retunred by this method.

        let dist = 99999;
        let nearest = null;

        if (this.holeList) {
            this.holeList.forEach(hole => {
                let a = hole.coord.x - pcbCoord.x;
                let b = hole.coord.y - pcbCoord.y;
                let c = Math.sqrt(a*a + b*b);
                if (c < dist) {
                    nearest = hole;
                    dist = c;
                }
            });
        }

        return nearest;
    }    
}


GerberCanvas.TRACE_COLOR = CANVAS_TRACE_COLOR

export { GerberCanvas }
