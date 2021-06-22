
"use strict"

const { ipcRenderer } = require('electron')

class DrillController {

    constructor(config) {
        this.uiWidth = config.ui.width;
        this.uiHeight = config.ui.height;

        let thiz = this;
        ipcRenderer.on('drill-load', (event, drillObj) => {
            thiz.drillObj = drillObj;
            thiz.preCalc();
            ui.showPage('cncDrillAlignPage');
            this.paint();
        });        
    }

    preCalc() {
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

        let bb = this.drillObj.boundingBox;
        let min = bb.min;
        let max = bb.max;

        // Translation necessary to shift PCB origin to be (0,0)
        this.shiftX = 0 - min.x;
        this.shiftY = 0 - min.y;

        const canvas = document.getElementById('drill-canvas');

        let bbWidth = max.x - min.x;
        let bbHeight = max.y - min.y;

        // Allow for a five pixel margin (10 pixels total) 
        // around plotted board.  Remember, "height" of 
        // board is plotted along the "width" of 
        // the display canvas
        let maxPixelHeight = canvas.width - 10;
        let maxPixelWidth = canvas.height - 10;

        // How many pixels per millimeter to we have
        // to display the entire board?
        let ppmmH = maxPixelHeight / bbHeight;
        let ppmmW = maxPixelWidth / bbWidth;

        this.ppmm = Math.min(ppmmH, ppmmW);


        // Finally, calculate a pixel margin that will center
        // the board in the display canvas...
        let truePixelHeight = this.ppmm * bbHeight;
        let truePixelWidth = this.ppmm * bbWidth;
        this.marginHeight = (maxPixelHeight - truePixelHeight) / 2 + 5;
        this.marginWidth = (maxPixelWidth - truePixelWidth) / 2 + 5;
    }

    paint() {
        const canvas = document.getElementById('drill-canvas');
        const ctx = canvas.getContext('2d');
     
        // This is a hack to force a full screen repaint...
        canvas.width = canvas.width; 

        canvas.style.backgroundColor = '#FFF8DC';
        ctx.clearRect(0,0,canvas.width, canvas.height);

        ctx.fillStyle = '#DEB887';
        ctx.strokeStyle = '#DEB887';

        let holes = this.drillObj.holes;
        let drillDiam = 2;

        holes.forEach(hole => {
           // console.log(`   ${count}: x:${hole.coord.x}, y:${hole.coord.y} diam: ${hole.tool.params[0]}`)
           ctx.beginPath();
           let drill = this.toCanvas(hole.coord);
           ctx.arc(drill.x, drill.y, drillDiam, 0, 2.0*Math.PI);
           ctx.fill();
           ctx.stroke();
        });        
    }

    // Translate PCB coordinate to UI display canvas coordinate
    toCanvas(pcbCoord) {
        return {
            x: (pcbCoord.y + this.shiftY) * this.ppmm + this.marginHeight,
            y: (pcbCoord.x + this.shiftX) * this.ppmm + this.marginWidth
        };
    }

}

export { DrillController }
