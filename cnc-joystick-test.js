const Kefir = require('kefir');
const readline = require('readline');
const Joystick = require('./app/main/Joystick');
const ZProbe = require('./app/main/ZProbe');
const CNC = require('./app/main/CNC');
const LaserPointer = require('./app/main/LaserPointer');


var pointer = new LaserPointer();


function shallowEqual(object1, object2) {
  if (typeof object1 !== typeof object2) {
     return false;
  }

  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let key of keys1) {
    if (object1[key] !== object2[key]) {
      return false;
    }
  }

  return true;
}


// Start program execution...
var appRunning = true;

// Define keypresses this app understands...
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', (str, key) => {

  if ((key.ctrl && key.name === 'c') || (key.name === 'x') || (key.name ==='q')) {
    appRunning = false;
    process.exit();
  } 

  if (str === ' ') {
     console.log('');
  }

  if (key.name === 'r') {
     console.log('Reset...');
     cnc.reset();
  }

  if (key.name === 'h') {
    console.log('Home...');
    cnc.home();
  }

  if (str === '?') {
    console.log('Request report...');
    cnc.report();
  }

  if (str === '!') {
    console.log('Hold...');
    cnc.hold();
  }

  if (str === '~') {
    console.log('Resume...');
    cnc.resume();
  }

  if (str === 'u') {
    console.log('Unlock...');
    cnc.unlock();
  }

  if (key.name === 'l') {
      if (!pointer.laser) {
        // Laser is OFF, so turn it ON...
        cnc.sendGCode(['G91', `G0 X${LaserPointer.offsetX} Y${LaserPointer.offsetY}`, 'G90']);
        pointer.laser = true;
      }
      else {
        // Laser is ON, so turn it OFF...
        cnc.sendGCode(['G91', `G0 X${-LaserPointer.offsetX} Y${-LaserPointer.offsetY}`, 'G90']);
        pointer.laser = false;
      }
      console.log(`Laser is ${pointer.laser ? 'ON' : 'OFF'}`);
  }

  if (key.name === 'z') {
     // Zero out work coordinates...
     cnc.sendGCode('G10 L20 P1 X0 Y0 Z0');    
  }

});



// Kefir filter function...
function hasChanged() {
   let last;
   return (val) => {
     let changed;
     if (typeof val === 'object') {
        changed = !shallowEqual(val, last);
     }
     else {
        changed = (val != last);
     }
     last = val;
     return changed;
   }
}


let msStickCheck = 100;
let stick = Kefir.fromPoll(msStickCheck, Joystick.stickVal).filter(hasChanged());
let stickBtn = Kefir.fromPoll(msStickCheck, Joystick.btnVal).filter(hasChanged());

let jogZ = false;

stick.onValue(stick => {
    cnc.jog(-stick.x, stick.y, jogZ);
});


stickBtn.onValue(pressed => {
    if (pressed) {
      jogZ = !jogZ;
    }
});


let cnc = new CNC();

cnc.on('ready', ()=> {
   console.log('CNC ready for use.');
   cnc.sendGCode('G21');
   cnc.unlock();
});

cnc.on('alarm', (msg) => {
   console.log(`CNC alarm detected: ${msg}`);
});


cnc.on('msg', (msg) => {
  console.log(`CNC msg: ${msg}`);
});


let statestickY = Kefir.fromEvents(cnc, 'state').filter(hasChanged());
statestickY.onValue(state => {
  console.log("state: " + state);
});

cnc.on('data', (data) => {
  console.log("data: " + data);
});

cnc.on('pos', (pos) => {
  console.log("pos: " + JSON.stringify(pos));
});


let zprobe = new ZProbe();
zprobe.on(ZProbe.EVT_PRESSED, (pressed) => {
    console.log('z probe: ' + (pressed ? "ON" : "OFF"));
});


cnc.connect();

