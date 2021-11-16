const pigpioClient = require('pigpio-client');
const pigpio = pigpioClient.pigpio({host: '127.0.0.1', port: '8888'});
// const pigpio = pigpioClient.pigpio({host: '192.168.0.152', port: '8888'});

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
 
  const uv = pigpio.gpio(6);
  await uv.modeSet('output');
  console.log('UB Bed off');
  await uv.write(0);  // turn off
 
  // control Safelight
  const safelight = pigpio.gpio(13);
  await safelight.modeSet('output');
  console.log('Safelight off')
  await safelight.write(0);

  console.log('done');
  process.exit();
  
}).catch(() => (err) => {
  console.log(`Error: ${err}`)
});

console.log('done');
