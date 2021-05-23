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
  await led.write(0);  // turn off

  process.exit();
  
}).catch(console.error);
