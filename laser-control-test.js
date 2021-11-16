const pigpioClient = require('pigpio-client');
// const pigpio = pigpioClient.pigpio({host: '127.0.0.1', port: '8888'});
const pigpio = pigpioClient.pigpio({host: '192.168.0.143', port: '8888'});

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
 
  const laser = pigpio.gpio(26);
  await laser.modeSet('output');

  console.log('Laser on');
  await laser.write(1);  // turn on LED

  await wait(4000);

  console.log('Laser off');

  await laser.write(0);  // turn off

  console.log('done');
  process.exit();
  
}).catch(() => (err) => {
  console.log(`Error: ${err}`)
});

console.log('execution complete');
