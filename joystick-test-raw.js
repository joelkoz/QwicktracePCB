const ADS1115 = require('./app/main/ads1115-client')
const readline = require('readline');
const fs = require('fs');
const GPIO = require('./app/main/GPIO');

const connection = [1, 0x48, ]

const CAL_FILE = "joystick.json";


const mockConfig = { cnc: {},
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
                        "host": "127.0.0.1",
                        "port": 8888
                   } };

GPIO.config = mockConfig.pigpio;
new GPIO();

function cls() {
   process.stdout.write('\033[2J');
}

var xCal = {
  min: 99999,
  max: -1,
  mid: -99,
  deadLo: 50,
  deadHi: 50
};

var yCal = {
  min: 99999,
  max: -1,
  mid: -99,
  deadLo: 50,
  deadHi: 50
};


function out(x, y, str) {
  process.stdout.write('\033[' + y + ';' + x + 'H' + str + '  ');
}
 

function outVal(x, y, num) {
   let str = "    " + num.toFixed(2); 
   out(x, y, str.slice(-7));
}


function calibrate(cal, val) {
  if (val < cal.min) {
     cal.min = val;
  }
  if (val > cal.max) {
     cal.max = val;
  }
  if (cal.mid == -99) {
    cal.mid = val;
  }
}

function stickVal(cal, raw) {

   let mid;
   if (raw <= cal.mid) {
      mid = cal.mid - cal.deadLo;
      if (raw >= mid) {
         return 0;
      }
   }
   else {
      mid = cal.mid + cal.deadHi;
      if (raw <= mid) {
         return 0;
      }
   }

   let range;
   if (raw < cal.mid) {
     range = mid - cal.min;
   }
   else {
     range = cal.max - mid;
   }

   let val = raw - mid;

   return (val / range);

}


function readJoystickCalibration() {
    if (fs.existsSync(CAL_FILE)) {
      let json = fs.readFileSync(CAL_FILE);
      let joystick = JSON.parse(json);
      xCal = joystick.xCal;
      yCal = joystick.yCal;
    }
}


function saveJoystickCalibration() {
    let joystick = { xCal, yCal };
    let json = JSON.stringify(joystick);
    fs.writeFileSync(CAL_FILE, json + '\n');
    out(1, 7, "Calibration data saved to joystick.json");
    setTimeout(() => { out(1, 7, " ".repeat(50))}, 4000);
}

var appRunning = true;

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {

  if ((key.ctrl && key.name === 'c') || (key.name === 'x') || (key.name ==='q')) {
    appRunning = false;
    cls();
    process.exit();
  } else if (key.name === 's') {
     // Write out joystick calibration data...
     saveJoystickCalibration();
  }
});


ADS1115.open(...connection).then(async (ads1115) => {
  ads1115.gain = 1
 
  cls();
  out(1, 1, "X:");
  out(1, 2, "Y:");
  out(1, 3, "Btn:");

  out(1, 5, "Press S to save calibration data, X to exit.");

  readJoystickCalibration();

  while (appRunning) {
    let rawX = await ads1115.measure('0+GND')
    calibrate(xCal, rawX);

    let rawY = await ads1115.measure('1+GND')
    calibrate(yCal, rawY);

    let btn = await ads1115.measure('2+GND')

    let x = stickVal(xCal, rawX);
    let y = stickVal(yCal, rawY);

    outVal(4, 1, x * 100);
    outVal(4, 2, y * 100);

    let pressed = (btn < 500);
    out(5, 3, pressed ? "PRESSED" : "       ");
    // out(5, 3, btn);
  }
})
