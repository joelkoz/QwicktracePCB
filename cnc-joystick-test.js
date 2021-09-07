const Kefir = require('kefir');
const readline = require('readline');
const CNC = require('./app/main/cnc/CNC');
const Joystick = require('./app/main/Joystick');
const ZProbe = require('./app/main/cnc/ZProbe');
const LaserPointer = require('./app/main/cnc/LaserPointer');
const GPIO = require('./app/main/GPIO');

// const HOST = "127.0.0.1"
const HOST = "192.168.0.152"

const mockConfig = { cnc: {
                        server: {
                          host: HOST,
                          port: 8000,
                          serialPort: "/dev/ttyUSB0",
                          baudRate: 115200
                        }
                    },
                    joystick: {
                      invertY: true,
                      invertX: false,
                      calibration: {
                                      xCal:{min:174,max:26514,mid:13442,deadLo:50,deadHi:50},
                                      yCal:{min:176,max:26515,mid:13098,deadLo:50,deadHi:50},
                                      btnPressThreshold: 500
                                    }
                    },
                     pigpio: {
                        "host": HOST,
                        "port": 8888
                   } };

GPIO.config = mockConfig.pigpio;
new GPIO();

var pointer = new LaserPointer(mockConfig);


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


  if (key.name === 's') {
    if (cnc.rpm === 0) {
       // Toggle to ON...
       cnc.rpm = 9500;
    }
    else {
      cnc.rpm = 0;
    }
  }

  if (key.name === 'l') {
      if (!pointer.laser) {
        // Laser is OFF, so turn it ON...
        // cnc.sendGCode(['G91', `G0 X${LaserPointer.offsetX} Y${LaserPointer.offsetY}`, 'G90']);
        pointer.laser = true;
      }
      else {
        // Laser is ON, so turn it OFF...
        // cnc.sendGCode(['G91', `G0 X${-LaserPointer.offsetX} Y${-LaserPointer.offsetY}`, 'G90']);
        pointer.laser = false;
      }
      console.log(`Laser is ${pointer.laser ? 'ON' : 'OFF'}`);
  }

  if (key.name === 'z') {
     // Zero out work coordinates...
     if (pointer.laser) {
        // If laser pointer is active, set zero to where laser is pointing...
        cnc.sendGCode(`G10 L20 P1 X${LaserPointer.offsetX} Y${LaserPointer.offsetY}`);
     }
     else {
        cnc.sendGCode('G10 L20 P1 X0 Y0');    
     }
  }

  if (key.name === 'w') {
     // Go to work coordinates 0,0...
     cnc.sendGCode('G0 X0 Y0');
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


Joystick.init(mockConfig);

let msStickCheck = 100;
let stick = Kefir.fromPoll(msStickCheck, Joystick.stickVal).filter(hasChanged());
let stickBtn = Kefir.fromPoll(msStickCheck, Joystick.btnVal).filter(hasChanged());

let jogZ = false;

stick.onValue(stick => {
    cnc.jog(stick.x, stick.y, jogZ);
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


let cncState = Kefir.fromEvents(cnc, 'state').filter(hasChanged());
cncState.onValue(state => {
  console.log("cnc state: " + state);
});

cnc.on('data', (data) => {
  console.log("data: " + data);
});

cnc.on('pos', (pos) => {
  console.log("pos: " + JSON.stringify(pos));
});


let zprobe = new ZProbe(mockConfig);
zprobe.on(ZProbe.EVT_PRESSED, (pressed) => {
    console.log('z probe: ' + (pressed ? "ON" : "OFF"));
});

let server = mockConfig.cnc.server;
cnc.connect(server.host, server.port, server.serialPort, server.baudRate);
