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
 
    // control an LED on GPIO 26
  const led = pigpio.gpio(26);
  await led.modeSet('output');
  await led.write(1);  // turn on LED
  await wait(500);
  await led.write(0);  // turn off
  await wait(500);
 
  // use waves to blink the LED rapidly (toggle every 100ms)
  await led.waveClear();
  await led.waveAddPulse([[1, 0, 100000], [0, 1, 100000]]);
  const blinkWave = await led.waveCreate();
  led.waveChainTx([{loop: true}, {waves: [blinkWave]}, {repeat: true}]);
 
  // wait for 10 sec, stop the waves
  await wait(5000);
  await led.waveTxStop();

  await led.write(0);

  process.exit();
  
}).catch(console.error);
