
"use strict"

const { ipcRenderer } = require('electron')
const { deskew } = require('deskew')

const CANVAS_SAVE_WIDTH = 24;

const CANVAS_BG_COLOR = '#FFF8DC';
const CANVAS_HOLE_COLOR = '#DEB887';

const msBLINK_INTERVAL = 500;

const DRAW_HOLE_DIAMETER = 4;
const DRAW_BLINK_DIAMETER = 6;
const DRAW_BLINK_WIDTH = 2;


class DrillController {

    constructor(config) {
        this.uiWidth = config.ui.width;
        this.uiHeight = config.ui.height;

        let thiz = this;
        ipcRenderer.on('drill-load', (event, drillObj) => {
            thiz.blinkOff(false);
            thiz.drillObj = drillObj;
            ui.showPage('cncDrillAlignPage');
            thiz.initAlignment();
            this.paint();
        });
        
        this.saveImage = document.createElement('canvas');
        this.saveImage.width = CANVAS_SAVE_WIDTH;
        this.saveImage.height = CANVAS_SAVE_WIDTH;

        this.blinkPoint = null;
    }


    initAlignment() {
        this.canvas = document.getElementById('drill-canvas');

        this.drawingPreCalc();

        let bb = this.drillObj.boundingBox;

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


    positionNext() {
        this.blinkOff(false);
        this.deskewIndex++;

        if (this.deskewIndex <= 1) {
           $('#drill-align-instructions').text(`Adjust pointer to hole ${this.deskewIndex+1} and press joystick`);
           this.startBlink();
        }
        else {
            $('#drill-align-instructions').text(`Done`);
            this.deskewDone();
        }
    }


    deskewDone() {
        this.blinkOff(false);
        console.log(`Deskew completed: ${JSON.stringify(this.deskewData)}`);

        let A = this.deskewData[0];
        let B = this.deskewData[1];
        let dresult = deskew(A.sample, B.sample, A.actual, B.actual);
        console.log(`Deskew results: ${JSON.stringify(dresult)}`);
        this.deskew = dresult;

        this.setDeskewClient(A);
        this.setDeskewClient(B);

        // Redraw the holes...
        this.paint();
        this.redrawAlignmentHole(A);
        this.redrawAlignmentHole(B);
    }


    setDeskewClient(sample) {
        let pcbCoord = sample.actual;
        let canvasCoord = this.toCanvas(pcbCoord);
        let clientCoord = this.canvasToClient(canvasCoord);
        sample.client = clientCoord;
    }

    redrawAlignmentHole(sample) {
        let clientCoord = sample.client;
        let canvasCoord = this.clientToCanvas(clientCoord);
        let pcbCoord = this.toPCB(canvasCoord);
        let ctx = this.canvas.getContext('2d');
        this.drawHole(ctx, pcbCoord, 'red');
    }


    mouseDown(mouseCoord) {
      let canvasCoord = this.clientToCanvas(mouseCoord);
      let pcbCoord = this.toPCB(canvasCoord);
      this.setDeskew(pcbCoord);
    }


    setDeskew(pcbCoord) {
        if (this.deskewIndex >= 0 && this.deskewIndex <= 1) {
            this.deskewData[this.deskewIndex].actual = pcbCoord;

            // Draw the newly posistioned hole...
            this.blinkOff(false);
            const ctx = this.canvas.getContext('2d')
            this.drawHole(ctx, pcbCoord, 'red');

            this.positionNext();
        }
    }


    drawingPreCalc() {
        // There are three coordinate systems at play. the PCB's
        // coordinate system assumes (0,0) in lower left
        // hand corner, with positive X in left direction,
        // and positive Y from bottom to top. This also
        // assumes the bounding box's maximum value is in
        // Y direction (i.e. a rectangular board is taller
        // than it is wider)
        //   The UI display's coordinate system has (0,0) in
        // upper left hand corner, and positive Y is top 
        // to bottom.  
        //   The CNC mill's coordinate system
        // matches the PCB, but the mill dimensions dictate
        // the PCB be milled sideways with PCB's Y along
        // the mill's X, and the (0,0) position adjusted
        // such that the PCB's UPPER left corner is next
        // to the mill's upper right corner.
        //
        // Calculations here assume the PCB will be oriented
        // for display and milling sideways (i.e. the pcb's
        // X axis plotted along display and mill's Y axis)...

        // Set the canvas to its maximum pixel size...
        let jCanvasDiv = $('#cncDrillAlignPage .canvas-area');
        let ow = jCanvasDiv.outerWidth(true);
        let oh = jCanvasDiv.outerHeight(true);
        const canvas = this.canvas;
        canvas.width = ow;
        canvas.height = oh;

        let bb = this.drillObj.boundingBox;
        let min = bb.min;
        let max = bb.max;

        // Translation necessary to shift PCB origin to be (0,0)
        this.normalizeX = 0 - min.x;
        this.normalizeY = 0 - min.y;

        let bbWidth = max.x - min.x;
        let bbHeight = max.y - min.y;

        // Allow for a 10 pixel margin (20 pixels total) 
        // around plotted board.  Remember, "height" of 
        // board is plotted along the "width" of 
        // the display canvas
        let maxPixelHeight = canvas.width - 20;
        let maxPixelWidth = canvas.height - 20;

        // How many pixels per millimeter to we have
        // to display the entire board?
        let ppmmH = maxPixelHeight / bbHeight;
        let ppmmW = maxPixelWidth / bbWidth;

        this.ppmm = Math.min(ppmmH, ppmmW);


        // Finally, calculate a pixel margin that will center
        // the board in the display canvas...
        let truePixelHeight = this.ppmm * bbHeight;
        let truePixelWidth = this.ppmm * bbWidth;
        this.marginWidth = (maxPixelHeight - truePixelHeight) / 2;
        this.marginHeight = (maxPixelWidth - truePixelWidth) / 2;
    }


    startBlink() {
        this.blinkOff(false);
        setTimeout(() => { this.blinkOn() }, msBLINK_INTERVAL)
    }

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

    
    blinkOff(repeatBlink) {
        if (this.blinkPoint) {
            const canvas = this.canvas;
            const ctx = this.canvas.getContext('2d');

//            ctx.imageSmoothingEnabled = false;

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

    drawHole(ctx, pcbCoord, holeColor) {
        ctx.fillStyle = holeColor;
        ctx.strokeStyle = holeColor;
        ctx.lineWidth = 1;
        const drillDiam = DRAW_HOLE_DIAMETER;
        ctx.beginPath();
        let canvasCoord = this.toCanvas(pcbCoord);
        ctx.arc(canvasCoord.x, canvasCoord.y, drillDiam, 0, 2.0*Math.PI);
        ctx.fill();
        ctx.stroke();
    }


    paint() {
        const canvas = this.canvas;
        const ctx = this.canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // This is a hack to force a full screen repaint...
        canvas.width = canvas.width; 

        canvas.style.backgroundColor = CANVAS_BG_COLOR;
        ctx.clearRect(0,0,canvas.width, canvas.height);

        this.setTransform(ctx);

        let holes = this.drillObj.holes;

        holes.forEach(hole => {
           this.drawHole(ctx, hole.coord, CANVAS_HOLE_COLOR);
        });        

    }


    setTransform(ctx) {
        // Origin at UL margin corner, x+ down, y+ right
        ctx.resetTransform();
        ctx.translate(this.marginWidth, this.marginHeight);
        ctx.scale(1, -1);
        ctx.rotate(270 * Math.PI / 180);

        if (this.deskew) {
            // Apply additional deskew transformation as this
            // must be a repaint...
            ctx.rotate(2*Math.PI + this.deskew.rotation);
            ctx.translate(this.deskew.offset.x* this.ppmm, this.deskew.offset.y* this.ppmm);
        }        
    
    }


    // Used for testing transformations...
    drawTestAxis(ctx) {
        // Draw axis...
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'red';
        ctx.beginPath();
        ctx.moveTo(0, 15);
        ctx.lineTo(0, -15);
        ctx.stroke();

        ctx.strokeStyle = 'purple';
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(5, 0);
        ctx.stroke();

        this.drawHole(ctx, { x: -9, y: 9 }, 'red');
        this.drawHole(ctx, { x: 9, y: 9 }, 'green');
        this.drawHole(ctx, { x: 9, y: -9 }, 'blue');
    }

    // Translate PCB coordinates to UI display canvas coordinates
    toCanvas(pcbCoord) {
        return {
            x: (pcbCoord.x + this.normalizeY) * this.ppmm,
            y: (pcbCoord.y + this.normalizeX) * this.ppmm,
        };
    }

    // Translate canvas coordinates back to PCB coordinates
    toPCB(canvasCoord) {
        let x = canvasCoord.x / this.ppmm - this.normalizeY;
        let y = canvasCoord.y / this.ppmm - this.normalizeX;

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
     * Returns the hole closest to the specified coordinate
     */
    closestTo(pcbCoord) {
        let dist = 99999;
        let nearest = null;
        this.drillObj.holes.forEach(hole => {
            let a = hole.coord.x - pcbCoord.x;
            let b = hole.coord.y - pcbCoord.y;
            let c = Math.sqrt(a*a + b*b);
            if (c < dist) {
                nearest = hole;
                dist = c;
            }
        });

        return nearest;
    }
}

export { DrillController }
