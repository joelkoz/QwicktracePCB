const Kefir = require('kefir');
const readline = require('readline');
const Joystick = require('./app/main/Joystick');
const CNC = require('./app/main/CNC');

const pigpioClient = require('pigpio-client');
const pigpio = pigpioClient.pigpio({host: '127.0.0.1'});
var laser;
var laserOn = false;

pigpio.once('connected', () => {
  laser = pigpio.gpio(26);
  laser.modeSet('output');
  console.log('Laser control successfully initialized');
  laserOn = false;
  setLaser(laserOn);
});

function setLaser(val) {
  laser.write(val ? 1 : 0);
}


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

});

stickBtn.onValue(pressed => {
//  out(5, 3, pressed ? "PRESSED" : "       ");
    if (pressed) {
       laserOn = !laserOn;
       setLaser(laserOn);
       console.log(`Laser is ${laserOn ? 'ON' : 'OFF'}`);
    }
});



let cnc = new CNC();


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

