var Victor = require('victor');


Victor.prototype.log = function(name) {
    console.log(`${name}: (${this.x}, ${this.y})`);
}

/**
 * Calculates a rotation and translation from two known points and their new/actual positions.
 * Coordinate parameters are assumed to be objects with properties "x" and "y".
 * 
 * ### How this works:
 * Assume a right triangle with hypotenuse to the upper right (postive X, postive Y) of the 
 * legs.  A is a vector to the upper left corner of the triangle. B is a vector
 * to the lower right. T is a vector to the point where the legs join to form the right angle.
 * Theta is the angle formed by the hypotenuse and a line parallel to the X axis. H is a
 * vector identical to the hypotenuse (aka BA). B1 is a vector similar to TB
 * ```
 *  ^   A
 *  |   |\ h
 *  |   | \  theta
 * y|   T--B---------
 *  |    b1
 *  +--------------->
 *          x
 * ```
 * @param {coordinate} originalA Coordinate that specifies the original position of sample point A
 * @param {coordinate} originalB Coordinate that specifies the original position of sample point B
 * @param {coordinate} newA Coordinate that specifies the new position of sample point A
 * @param {coordinate} newB Coordinate that specifies the new position of sample point A
 * @returns {object}
 */
function deskew(originalA, originalB, newA, newB) {

    let beforeA = new Victor(originalA.x, originalA.y);
    let beforeB = new Victor(originalB.x, originalB.y);
    
    
    // Key things we know about our original points:
    let beforeT = new Victor(beforeA.x, beforeB.y);
    let beforeH = Victor.fromObject(beforeA).subtract(beforeB);
    let beforeTheta = beforeH.direction();
    
    // The original vector from translation point T to B
    let beforeB1 = Victor.fromObject(beforeB).subtract(beforeT);
    
    // Calculate the angle formed by the right triangle with
    // hypotenuse AB, and leg TB
    let t = Math.PI - beforeTheta;
    
    let afterA = new Victor(newA.x, newA.y);
    let afterB = new Victor(newB.x, newB.y);
    
    // Key things about our new points:
    let afterH = Victor.fromObject(afterA).subtract(afterB);
    let afterTheta = afterH.direction();
    
    
    // Calculate the new translation point afterT by backtracking
    // from afterB back to afterT via a scaled direction vector
    let dirAngle = afterTheta + t;
    let dir = new Victor(Math.cos(dirAngle), Math.sin(dirAngle));
    let N = Victor.fromObject(dir).multiplyScalar(beforeB1.length());
    let afterT = Victor.fromObject(afterB).add(N);
    
    let deltaTheta = afterTheta - beforeTheta;
    let deltaT = Victor.fromObject(afterT).subtract(beforeT);
    
    let degRotation = deltaTheta * 180 / Math.PI;

    // console.log(`Rotate: ${degRotation}`);
    // beforeT.log('Before T');
    // afterT.log('After T')
    // deltaT.log('Delta T');
    
    return { "rotation": deltaTheta, "offset": { "x": deltaT.x, "y": deltaT.y } }
 
}

module.exports = { deskew }
