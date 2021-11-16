const EventEmitter = require('events')
const fs = require('fs')
const gerberParser = require('gerber-parser')
const whatsThatGerber = require('whats-that-gerber')
const GerberData = require('./app/main/GerberData.js');



const filenames = ['pi-hat/gbr/PiHat.drl', 'pi-hat/gbr/PiHat-B_Cu.gbr', 'pi-hat/gbr/PiHat-Edge_Cuts.gbr']
// {     
//  "pi-hat/gbr/PiHat.drl":{"type":"drill","side":"all"},
//  "pi-hat/gbr/PiHat-B_Cu.gbr":{"type":"copper","side":"bottom"},
//  "pi-hat/gbr/PiHat-F_Cu.gbr":{"type":"copper","side":"top"},
//  "pi-hat/gbr/PiHat-Edge_Cuts.gbr":{"type":"outline","side":"all"}
// }

var pcb = new GerberData();

pcb.on('ready', () => {
   let holes = pcb.holes;
   console.log(`Number of holes: ${holes.length}`)
   console.log(`All numbers are in ${pcb.units}`)
   var count = 0;
   holes.forEach(hole => {
      count++;
      console.log(`   ${count}: x:${hole.coord.x}, y:${hole.coord.y} diam: ${hole.tool.params[0]}`)
   });

});

pcb.on('ready', () => {
   let corners = pcb.corners;
   console.log(`Number of corners: ${corners.length}`)
   console.log(`All numbers are in ${pcb.units}`)
   var count = 0;
   corners.forEach(corner => {
      count++;
      console.log(`   ${count}: x:${corner.coord.x}, y:${corner.coord.y} diam: ${corner.tool.params[0]}`)
   });

   console.log(`Bounding box: (${pcb.boundingBox.min.x}, ${pcb.boundingBox.min.y}) to (${pcb.boundingBox.max.x}, ${pcb.boundingBox.max.y})`)

});

pcb.loadFiles(filenames);
