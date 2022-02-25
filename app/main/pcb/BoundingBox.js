
class BoundingBox {

    constructor(otherBB) {
        if (otherBB) {
           this.bb = { min: { x: otherBB.bb.min.x, y: otherBB.bb.min.y }, max: { x: otherBB.bb.max.x, y: otherBB.bb.max.y }}
        }
        else {
           this.bb = { min: { x: 99999, y: 999999}, max: { x:-999999, y:-999999 }}
        }
    }

    size() {
        let bb = this.bb;
        let x,y;
    
        x = bb.max.x - bb.min.x;
        y = bb.max.y - bb.min.y;
        return { x, y }
    }

    valid() {
        return (this.bb.max.x != -999999)
    }

    get min() {
        return this.bb.min;
    }

    set min(newMin) {
        this.bb.min = newMin;
    }

    get max() {
        return this.bb.max;
    }

    set max(newMax) {
        this.bb.max = newMax;
    }
    
    /**
     * swaps the x and y values of the min and max members.
     */
    rotate() {
       let other = this.bb.min.y;
       this.bb.min.y = this.bb.min.x;
       this.bb.min.x = other;

       other = this.bb.max.y;
       this.bb.max.y = this.bb.max.x;
       this.bb.max.x = other;
    }

    
    checkCoord(coord) {
        let x = coord.x;
        let y = coord.y;
        let bb = this.bb;

        if (x > bb.max.x) {
            bb.max.x = x;
        }

        if (x < bb.min.x) {
            bb.min.x = x;
        }

        if (y > bb.max.y) {
            bb.max.y = y;
        }

        if (y < bb.min.y) {
            bb.min.y = y;
        }
    }

}

module.exports = BoundingBox;