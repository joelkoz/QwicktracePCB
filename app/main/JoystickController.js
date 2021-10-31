const MainSubProcess = require('./MainSubProcess.js')
const MainMQ = require('./MainMQ.js');


// An "equals" function that does a "shallow" comparison
// of objects, ensuring all keys of one object exists in
// and are equal to another object.
function shallowEqual(object1, object2) {
    if (typeof object1 !== typeof object2) {
       return false;
    }
  
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);
  
    if (keys1.length !== keys2.length) {
      return false;
    }
  
    for (let key of keys1) {
      if (object1[key] !== object2[key]) {
        return false;
      }
    }
  
    return true;
}


// Kefir filter function - returns a filter function that can
// track if a value is different from the last time it was reported,
// and if so, returns TRUE.
function hasChanged() {
    let last;
    return (val) => {
      let changed;
      if (typeof val === 'object') {
         changed = !shallowEqual(val, last);
      }
      else {
         changed = (val != last);
      }
      last = val;
      return changed;
    }
 }


class JoystickController  extends MainSubProcess {

    constructor(win) {
        super(win, 'joystick');

        if (!JoystickController.instance) {
            JoystickController.instance = this;
            this.init();
        }
        
        return JoystickController.instance;
    }


    init() {
        console.log('Initializing Joystick...');

        const Joystick = require('./Joystick');
        const Kefir = require('kefir');
        
        Joystick.init();

        const thiz = this;

        const msStickCheck = 100;
        this.stick = Kefir.fromPoll(msStickCheck, Joystick.stickVal).filter(hasChanged());
        this.stickBtn = Kefir.fromPoll(msStickCheck, Joystick.btnVal).filter(hasChanged());
        
        this.stick.onValue(stick => {
            if (thiz.fnJoystickListener) {
                thiz.fnJoystickListener('stick', stick)
            }
            else {
                MainMQ.emit('global.joystick.stick', stick);
            }
        });
        
        
        this.stickBtn.onValue(pressed => {
            if (thiz.stickBtnDebounceDelay) {
                clearInterval(thiz.stickBtnDebounceDelay)
            }
            thiz.stickBtnDebounceDelay = setTimeout(() => {
                thiz.stickBtnDebounceDelay = null;
                if (thiz.fnJoystickListener) {
                    thiz.fnJoystickListener('button', pressed)
                }
                else if (pressed) {
                    MainMQ.emit('global.joystick.press');
                }
            }, 100);
        });
    }

    /**
     * Sets a joystick listener that will process all joystick information vs.
     * having it broadcast over the message queue. To remove the listener,
     * call this method passing "false"
     * @param {*} fnJoystickListener 
     */
    static captureJoystick(fnJoystickListener = false) {
        JoystickController.instance.fnJoystickListener = fnJoystickListener;
    }

}

module.exports = JoystickController;
