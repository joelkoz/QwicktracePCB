const Kefir = require('kefir');
const readline = require('readline');
const Joystick = require('./app/main/Joystick');
const GPIO = require('./app/main/GPIO');

// const HOST = "127.0.0.1"
const HOST = "192.168.0.152"

const mockConfig = { pigpio: {
                        "host": HOST,
                        "port": 8888
                   } };

GPIO.config = mockConfig.pigpio;
new GPIO();

function cls() {
  process.stdout.write('\033[2J');
}


function out(x, y, str) {
  process.stdout.write('\033[' + y + ';' + x + 'H' + str + '  ');
}
 

function outVal(x, y, num) {
   let str = "      " + num.toFixed(2); 
   out(x, y, str.slice(-9));
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

// Define keypresses this app understands...
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', (str, key) => {

  if ((key.name === 'x') || (key.name ==='q')) {
    appRunning = false;
    console.log('\n\n\n\n\n\n\n');
    console.log(Joystick.instance.calibration);
    process.exit();
  } 

  if (str === ' ') {
     console.log('');
  }

  if (key.name === 'c') {
    Joystick.calibrate();
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

// Joystick.SamplesPerValue = 5;
Joystick.init();
Joystick.calibrate();

let msStickCheck = 200;
let stick = Kefir.fromPoll(msStickCheck, Joystick.stickVal).filter(hasChanged());
let rawStick = Kefir.fromPoll(msStickCheck, Joystick.rawVal)
let stickBtn = Kefir.fromPoll(msStickCheck, Joystick.btnVal).filter(hasChanged());
let rawBtn = Kefir.fromPoll(msStickCheck, Joystick.rawBtn)

let jogZ = false;

stick.onValue(stick => {
  outVal(4, 1, stick.x * 100);
  outVal(4, 2, stick.y * 100);
});


rawStick.onValue(stick => {
  outVal(14, 1, stick.x);
  outVal(14, 2, stick.y);
});


stickBtn.onValue(pressed => {
   out(5, 3, pressed ? "PRESSED" : "       ");
});


rawBtn.onValue(btn => {
  outVal(14, 3, btn);
});




cls();
out(1, 1, "X:");
out(1, 2, "Y:");
out(1, 3, "Btn:");

out(1, 5, "Press X to exit.");

console.log('\n\n\n');
