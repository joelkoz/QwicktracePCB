const Kefir = require('kefir');
const readline = require('readline');
const Joystick = require('./app/main/Joystick');


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



var appRunning = true;

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {

  if ((key.ctrl && key.name === 'c') || (key.name === 'x') || (key.name ==='q')) {
    appRunning = false;
    process.exit();
  } 
});



cls();
out(1, 1, "X:");
out(1, 2, "Y:");
out(1, 3, "Btn:");

out(1, 5, "Press X to exit.");


function hasChanged() {
   let last;
   return (val) => {
     let changed = (val != last);
     last = val;
     return changed;
   }
}

let msStream = 100;
let xStream = Kefir.fromPoll(msStream, Joystick.xVal).filter(hasChanged());
let yStream = Kefir.fromPoll(msStream, Joystick.yVal).filter(hasChanged());
let btnStream = Kefir.fromPoll(msStream, Joystick.btnVal).filter(hasChanged());

xStream.onValue(x => {
  outVal(4, 1, x * 100);
});


yStream.onValue(y => {
  outVal(4, 2, y * 100);
});


btnStream.onValue(pressed => {
  out(5, 3, pressed ? "PRESSED" : "       ");
});
