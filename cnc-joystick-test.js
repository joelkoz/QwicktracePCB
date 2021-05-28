const Kefir = require('kefir');
const readline = require('readline');
const Joystick = require('./app/main/Joystick');
const CNC = require('./app/main/CNC');
const LaserPointer = require('./app/main/LaserPointer');


var pointer = new LaserPointer();

function cls() {
  process.stdout.write('\033[2J');
}

function out(x, y, str) {
  process.stdout.write('\033[' + y + ';' + x + 'H' + str + '  ');
}
 

function outVal(x, y, num) {
   let str = "    " + num.toFixed(2); 
   out(x, y, str.slice(-7));
}


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

});



// cls();
// out(1, 1, "X:");
// out(1, 2, "Y:");
// out(1, 3, "Btn:");

// out(1, 5, "Press X to exit.");


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
// let stickX = Kefir.fromPoll(msStickCheck, Joystick.xVal).filter(hasChanged());
// let stickY = Kefir.fromPoll(msStickCheck, Joystick.yVal).filter(hasChanged());

let stick = Kefir.fromPoll(msStickCheck, Joystick.stickVal).filter(hasChanged());
let stickBtn = Kefir.fromPoll(msStickCheck, Joystick.btnVal).filter(hasChanged());

//stickX.onValue(x => {
//  outVal(4, 1, x * 100);
//});


//stickY.onValue(y => {
//  outVal(4, 2, y * 100);
//});


stick.onValue(stick => {
    cnc.jog(-stick.x, stick.y);
});


stickBtn.onValue(pressed => {
    if (pressed) {
      pointer.laser = !pointer.laser;
      console.log(`Laser is ${pointer.laser ? 'ON' : 'OFF'}`);
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


cnc.connect();

