
class BoundingBox {

    constructor() {
        this.bb = { min: { x: 99999, y: 999999}, max: { x:-999999, y:-999999 }}
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

    get max() {
        return this.bb.max;
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