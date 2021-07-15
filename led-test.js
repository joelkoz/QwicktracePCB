const pigpioClient = require('pigpio-client');
const pigpio = pigpioClient.pigpio({host: '127.0.0.1', port: '8888'});
// const pigpio = pigpioClient.pigpio({host: '192.168.0.160', port: '8888'});

const ready = new Promise((resolve, reject) => {
  console.log('Attempting to connect to pigpio...');
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
 

  var duty = 255;
  while (duty > 0) {
    console.log(`LED duty level ${duty}`);
    await led.analogWrite(duty);
    duty -= 5;
    await wait(500);
  }

  await led.write(0);

  console.log('done');
  process.exit();
  
}).catch(() => (err) => {
  console.log(`Error: ${err}`)
});

console.log('execution complete');
