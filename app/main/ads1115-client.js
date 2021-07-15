// Modified ADS1115 code to use pgpio-client for i2c operations.
// Original source available on npmjs.com as "ads1115"
// Original source Copyright (c) 2019 William Kapke
// Code modifications here by Joel Kozikowski

const hex = (v) => v.toString(16).padStart(2, '0')
const bin = (v) => v.toString(2).padStart(16, '0')
const sleep = (t) => new Promise((resolve) => setTimeout(resolve, t))

const START_CONVERSION = 0b1000000000000000
const MUX = {
  '0+1':   0b0000000000000000,
  '0+3':   0b0001000000000000,
  '1+3':   0b0010000000000000,
  '2+3':   0b0011000000000000,
  '0+GND': 0b0100000000000000,
  '1+GND': 0b0101000000000000,
  '2+GND': 0b0110000000000000,
  '3+GND': 0b0111000000000000
}

const gains = {
  '2/3': 0b0000000000000000,  // +/- 6.144V
  '1':   0b0000001000000000,  // +/- 4.096V
  '2':   0b0000010000000000,  // +/- 2.048V
  '4':   0b0000011000000000,  // +/- 1.024V
  '8':   0b0000100000000000,  // +/- 0.512V
  '16':  0b0000101000000000,  // +/- 0.256V
}

var pigpio;


const debug = (...args) => {
    // console.log(...args);
}


module.exports = (handle, addr = 0x48, delay = 10, shift = 0) => {
  let gain = gains['2/3']

  function i2cWrite(n, buff) {
      return new Promise((resolve, reject) => {
           pigpio.i2cWriteDevice(handle, buff.toString('utf8'), (result) => {
              if (result === 0) {
                  return resolve();
              }
              else {
                  return reject(result);
              }
           });
      });
  }

  function i2cRead(count, buff) {
    return new Promise((resolve, reject) => {
        pigpio.i2cReadDevice(handle, count, (error, rcount, data) => {
           if (error === 0) {
               return resolve({ buffer: data });
           }
           else {
               return reject(error);
           }
        });
    });
  }


  const writeReg16 = (register, value) => {
    const buff = Buffer.from([register & 3, value >> 8, value & 0xFF])
    debug('write to 0x%h [%h]', addr, buff)
    return i2cWrite(3, buff)
  }

  const readReg16 = async (register) => {
    await i2cWrite(1, Buffer.alloc(1, register))
    const buff = (await i2cRead(2, Buffer.allocUnsafe(2))).buffer
    debug('read from register 0x%h [%h]', register, buff)
    return (buff[0] << 8) | buff[1]
  }

  const readResults = async (value) => (await readReg16(0x00)) >> shift
  const writeConfig = (value) => {
    debug('writeConfig 0b%b', value)
    return writeReg16(0b01, value)
  }

  return {
    get gain() { return gain },
    set gain(level) {
      if (level === (2/3)) level = '2/3'
      gain = gains[level] || gain
    },
    _delay: delay,
    _shift: shift,

    writeLowThreshold: (threshold) => writeReg16(addr, 0b10, threshold << shift),
    writeHiThreshold: (threshold) => writeReg16(addr, 0b11, threshold << shift),

    measure: async (mux) => {
      mux = MUX[mux]
      if (typeof mux === 'undefined') throw new Error('Invalid mux')

      const config = 0x0183 // No comparator | 1600 samples per second | single-shot mode
      await writeConfig(config | gain | mux | START_CONVERSION)
      await sleep(delay)
      return readResults()
    }
  }
}

const GPIO = require('./GPIO.js');

module.exports.open = (busNum, addr = 0x48) => {

    return new Promise((resolve, reject) => {
        pigpio = new GPIO();
        pigpio.whenReady(() => {
            console.log('Initializing ADS1115-client');
            return resolve();
        });        
    })
    .then(() => {
        return new Promise(resolve => {
            pigpio.i2cOpen(busNum, addr, (handle) => {
                resolve(handle);
            });
        });
    })
    .then((handle) => {
        return module.exports(handle, addr);
    });
}
