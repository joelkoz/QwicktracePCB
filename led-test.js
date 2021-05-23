const pigpioClient = require('pigpio-client');
const pigpio = pigpioClient.pigpio({host: '127.0.0.1'});

const ready = new Promise((resolve, reject) => {
  pigpio.once('connected', resolve);
  pigpio.once('error', reject);
});

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

ready.then(async (info) => {
  // display information on pigpio and connection status
  console.log(JSON.stringify(info,null,2));
 
    // control an LED on GPIO 14
  const led = pigpio.gpio(14);
  await led.modeSet('output');
  console.log('LED on');
  await led.write(1);  // turn on LED
  await wait(2000);
  console.log('LED off');
  await led.write(0);  // turn off
  await wait(2000);
 
  // use waves to blink the LED rapidly (toggle every 100ms)
//  await led.waveClear();
//  await led.waveAddPulse([[1, 0, 100000], [0, 1, 100000]]);
//  const blinkWave = await led.waveCreate();
//  led.waveChainTx([{loop: true}, {waves: [blinkWave]}, {repeat: true}]);
 
var duty = 255;
while (duty > 0) {
   console.log(`LED ${duty}`);
   await led.analogWrite(duty);
   duty -= 5;
   await wait(500);
}

  // wait for 10 sec, stop the waves
  //await wait(5000);
  //await led.waveTxStop();

  await led.write(0);

  process.exit();
  
}).catch(console.error);
