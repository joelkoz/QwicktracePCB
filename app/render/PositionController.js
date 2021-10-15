"use strict"
import { RPCClient } from './RPCClient.js'


const PCB_BG_COLOR = '#e6d4be';
const CANVAS_BG_COLOR = '#FFF8DC';
const CANVAS_TRACE_COLOR = '#DEB887';

const BOARD_POSITIONS = {
    NATURAL: 0,
    CENTER_BOTTOM: 1,
    CENTER_ALL: 2,
    ROTATE_UR: 3,
    ROTATE_CENTER_RIGHT: 4,
    ROTATE_CENTER_ALL: 5
}

class PositionController extends RPCClient {

    constructor(config) {
        super('position');
    }


    async init(profile) {

        this.renderInfo = {}
        this.currentPos = 0;
        
        let stock = $('#positionPage .canvas-area')
        let sw = stock.width();
        let sh = stock.height();
   
    
        // Calculate "pixels per milimeter" for rendering
        let ppmmWidth = sw / profile.stock.width;
        let ppmmHeight = sh / profile.stock.height;
        this.renderInfo.ppmm = Math.min(ppmmWidth, ppmmHeight)
    
        sw = this.renderInfo.ppmm * profile.stock.width;
        sh = this.renderInfo.ppmm * profile.stock.height;
    
        // Make sure canvas pixel size matches display size to get
        // 1:1 coordinates.
        let stockCanvas = document.getElementById('stock-canvas');
        stockCanvas.width = sw;
        stockCanvas.height = sh;
        
        this.renderInfo.canvas = stockCanvas;
        
        let pcbCanvas  = await this.getPcbAsImage(profile);
        
        this.renderInfo.board = pcbCanvas;
            
        this.renderInfo.ctx = stockCanvas.getContext('2d');
        
        this.drawPosition()
    }
        
    currentPosition() {
        return this.currentPos;
    }
    
    drawPosition() {
    
        let sw = this.renderInfo.canvas.width;
        let sh = this.renderInfo.canvas.height;
        let bw = this.renderInfo.board.width;
        let bh = this.renderInfo.board.height;
        
        switch (this.currentPos) {
            case BOARD_POSITIONS.NATURAL: {
               // Natural position
               this.renderInfo.ll = { x: 0, y: sh };
               this.renderInfo.rotate = false;
            }
            break;
    
            case BOARD_POSITIONS.CENTER_BOTTOM: {
               // Centered on bottom
               this.renderInfo.ll = { 
                   x: (sw - bw) / 2,
                   y: sh
                };
               this.renderInfo.rotate = false;
            }
            break;
    
    
            case BOARD_POSITIONS.CENTER_ALL: {
               // Centered horizontal and vertical
               this.renderInfo.ll = { 
                   x: (sw - bw) / 2,
                   y: (sh + bh) / 2
                };
               this.renderInfo.rotate = false;
            }
            break;
            
            case BOARD_POSITIONS.ROTATE_UR: {
               // Rotate to UR
               this.renderInfo.ll = { 
                   x: sw - bh,
                   y: 0
                };
               this.renderInfo.rotate = true;
            }
            break;
            
            
            case BOARD_POSITIONS.ROTATE_CENTER_RIGHT: {
               // Rotate then center along height of stock
               this.renderInfo.ll = { 
                   x: sw - bh,
                   y: (sh - bw) / 2 
                };
               this.renderInfo.rotate = true;
            }
            break;
    
    
            case BOARD_POSITIONS.ROTATE_CENTER_ALL: {
               // Rotate then center horizontal and vertical on stock
               this.renderInfo.ll = { 
                   x: (sw - bh) / 2,
                   y: (sh - bw) / 2 
                };
               this.renderInfo.rotate = true;
            }
            break;
            
    
    
        }
         this.drawPcb(this.renderInfo)
    }
    

    positionValid(pos) {

        if (pos === BOARD_POSITIONS.NATURAL) {
            // This position is always available...
            return true;
        }

        let sw = this.renderInfo.canvas.width;
        let sh = this.renderInfo.canvas.height;
        let bw = this.renderInfo.board.width;
        let bh = this.renderInfo.board.height;

        let canRotate = (bw <= sh);
        let rotated = (pos >= BOARD_POSITIONS.ROTATE_UR)

        if (rotated && !canRotate) {
            // No rotations possible...
            return false;
        }

        let maxMarginWidth;
        let maxMarginHeight;
        if (rotated) {
           maxMarginWidth = (sw - bh);
           maxMarginHeight = (sh - bw);
        }
        else {
            maxMarginWidth = (sw - bw);
            maxMarginHeight = (sh - bh);
        }

        switch (pos) {
            case BOARD_POSITIONS.CENTER_ALL:
            case BOARD_POSITIONS.ROTATE_CENTER_ALL:
                return maxMarginWidth >= 3 || maxMarginHeight >= 3;

            case BOARD_POSITIONS.CENTER_BOTTOM:
                return maxMarginWidth >= 3;

            case BOARD_POSITIONS.ROTATE_CENTER_RIGHT:
                return maxMarginHeight >= 3;

            case BOARD_POSITIONS.ROTATE_UR:
                return canRotate;
        }
    }
    

    getValidPositionCount() {
        let count = 0;
        for (let p = 0; p < Object.keys(BOARD_POSITIONS).length; p++) {
            if (this.positionValid(p)) {
                count++;
            }
        }
        return count;
    }

    

    nextPos() {
       do {
          this.currentPos = (this.currentPos + 1) % Object.keys(BOARD_POSITIONS).length
       } while (!this.positionValid(this.currentPos))
       this.drawPosition(this.currentPos)
    }
    
    
    drawPcb(drawInfo) {
    
       let board = drawInfo.board;
       let ctx = drawInfo.ctx;
       let canvas = drawInfo.canvas;
       
       ctx.clearRect(0,0, canvas.width, canvas.height); 
       ctx.beginPath();
       ctx.fillStyle = CANVAS_BG_COLOR;
       ctx.fillRect(0, 0, canvas.width, canvas.height);
            
       if (drawInfo.rotate) {
         let dx = drawInfo.ll.x;
         let dy = drawInfo.ll.y;
       
         const TO_RADIANS = Math.PI/180; 
         let rx = dx + board.height / 2;
         let ry = dy + board.width / 2;
         const angle = 90
         ctx.save(); 
         ctx.translate(rx, ry);
         ctx.rotate(angle * TO_RADIANS);
         ctx.drawImage(board, -(board.width/2), -(board.height/2));
         ctx.restore(); 
       }
       else {
          let dx = drawInfo.ll.x;
          let dy = drawInfo.ll.y - board.height;
          ctx.drawImage(board, dx, dy)
       }
    
    }
    
    async getPcbAsImage(profile) {
    
        // Prepare for deferred promise...
        let _resolve;
        let _reject;
        
        let p = new Promise((resolve, reject) => {
          _resolve = resolve;
          _reject = reject;
        });
    
        profile.traceColor = CANVAS_TRACE_COLOR;
        let pcbSvg = await this.rpCall('files.loadSVG', profile)
        let svg = pcbSvg.svg;
        let url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        let img = new Image();
        let thiz = this;
        img.onload = function() {
            let canvas = document.createElement('canvas');
            
            let pxWidth = Math.round(pcbSvg.width * thiz.renderInfo.ppmm);
            let pxHeight = Math.round(pcbSvg.height * thiz.renderInfo.ppmm);
           
            canvas.width = pxWidth;
            canvas.height = pxHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            
            ctx.clearRect(0,0, pxWidth, pxHeight); 
            ctx.beginPath();
            ctx.fillStyle = PCB_BG_COLOR;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            let minX = pcbSvg.viewBox[0] / 1000;
            let minY = pcbSvg.viewBox[1] / 1000;
            ctx.drawImage(img, 0, 0, pxWidth, pxHeight);
            
            _resolve(canvas)
        }
        img.src = url;
        return p;
    }
    
}

export { PositionController, BOARD_POSITIONS }
