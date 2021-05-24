const ADS1115 = require('ads1115')

const connection = [1, 0x48, 'i2c-bus']


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



ADS1115.open(...connection).then(async (ads1115) => {
  ads1115.gain = 1
 
  cls();

  out(1, 1, "X:");
  out(1, 2, "Y:");
  out(1, 3, "Btn:");

  while (true) {
    let rawX = await ads1115.measure('0+GND')
    calibrate(xCal, rawX);

    let rawY = await ads1115.measure('1+GND')
    calibrate(yCal, rawY);

    let btn = await ads1115.measure('2+GND')

    let x = stickVal(xCal, rawX);
    let y = stickVal(yCal, rawY);

    outVal(4, 1, x * 100);
    outVal(4, 2, y * 100);
    let pressed = (btn < 200);
    out(5, 3, pressed ? "PRESSED" : "       ");
//    out(5, 3, btn);
  }
})
