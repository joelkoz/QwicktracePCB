/**
  * Conditional waiting via a promise. untilTrue() loops every msInterval
  * milliseconds until the callback function fnResolved returns TRUE, in
  * which case the promise resolves. The promise will be rejected if a
  * rejection callback is specified as the third parameter and it returns TRUE, 
  * or if the promise times out (default is 30 seconds).
  * @param {number} msInterval The interval (in milliseconds) to test the functions
  * @param {function} fnResolved Callback function that returns true if the promise is resolved
  * @param {numberOrFunction} fnRejectedOrTimeout A number or a callback function. If a function
  *   that returns a boolean, the promise will be rejected upon TRUE.  If a number, its
  *   the number of milliseconds that should pass before the promise is rejected.
  * @returns A promise that polls every msInterval seconds until fnResolved is TRUE
  *   or the promise is rejected
  */
 function untilTrue(msInterval, fnResolved, fnRejectedOrTimeout = 30000) {

    let _resolve;
    let _reject;
  
    let fnRejected;
    
    if (typeof fnRejectedOrTimeout === 'number') {
        let startRun = Date.now();
        let timeout = fnRejectedOrTimeout;
          fnRejected = () => {
           return (Date.now() - startRun) > timeout;
        }    
    }
    else {
       fnRejected = fnRejectedOrTimeout;
    }
  
    let p = new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });
  
    function loop() {
      if (fnResolved()) {
        return _resolve();
      } else if (fnRejected()) {
        return _reject();
      }
      setTimeout(loop, msInterval);
    }
    setTimeout(loop, msInterval);
  
    return p;
}


/**
  * Conditional waiting via a promise. untilEvent() waits until
  * the event emitter evtEmitter emits the event evtName,
  * in which case the promise resolves. The promise will be rejected if a
  * rejection callback is specified as the third parameter and it returns TRUE, 
  * or if the promise times out (default is 30 seconds).
  * @param {class} evtEmitter The NodeJS EventEmitter that fires the event
  * @param {string} evtName The name of the event we are waiting on
  * @param {function} fnResolved Callback function that returns true if the promise is resolved
  * @param {numberOrFunction} fnRejectedOrTimeout A number or a callback function. If a function
  *   that returns a boolean, the promise will be rejected upon TRUE.  If a number, its
  *   the number of milliseconds that should pass before the promise is rejected.
  * @returns A promise that polls every msInterval seconds until fnResolved is TRUE
  *   or the promise is rejected
  */
 function untilEvent(evtEmitter, evtName, fnRejectedOrTimeout = 30000) {

    let _resolve;
    let _reject;
  
    let fnRejected;
    
    if (typeof fnRejectedOrTimeout === 'number') {
        let startRun = Date.now();
        let timeout = fnRejectedOrTimeout;
          fnRejected = () => {
           return (Date.now() - startRun) > timeout;
        }    
    }
    else {
       fnRejected = fnRejectedOrTimeout;
    }
  
    let p = new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });
  

    let waiting = true;
    evtEmitter.once(evtName, (...args) => {
        waiting = false;
        _resolve.apply(null, args);
    });

    const msInterval = 200;
    function loop() {
      if (waiting && fnRejected()) {
        return _reject();
      }
      if (waiting) {
         setTimeout(loop, msInterval);
      }
    }

    setTimeout(loop, msInterval);
  
    return p;
}


async function untilDelay(msDelay = 1000) {
  await new Promise(resolve => setTimeout(resolve, msDelay));
}


module.exports = { untilTrue, untilEvent, untilDelay }
