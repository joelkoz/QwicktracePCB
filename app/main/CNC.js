const path = require('path')
const fs = require('fs')
const EventEmitter = require('events')

const io = require('socket.io-client')
const jwt = require('jsonwebtoken')


// Controller initialization...
function getUserHome() {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME']
}
  
function generateAccessToken(payload, secret, expiration) {
    const token = jwt.sign(payload, secret, {
      expiresIn: expiration
    })
  
    return token
}
  
const cncrc = path.resolve(getUserHome(), '.cncrc');
  
function getAccessToken() {
    try {
      let config = JSON.parse(fs.readFileSync(cncrc, 'utf8'))
      let secret = config.secret;
      let token = generateAccessToken({ id: '' , name: 'qwicktrace' }, secret, '30d');
      return token;    
    } 
    catch (err) {
      console.error(err)
      process.exit(1)
    }
}

  
const host = '127.0.0.1';
const port = 8000;
const serialPort = '/dev/ttyUSB0';
const baudRate = 115200;
const controllerType = 'Grbl';

const RESERVED_EVENTS = [ 'error', 'ready', 'closed', 'state', 'sent', 'data', 'pos', 'mode', 'alarm', 'msg' ];


const RESET_MSG = '[MSG:Reset to continue]';

/**
 * A Class for controlling a Grbl based CNC controlled by CNCjs running on the local machine. As
 * an EventEmitter, external listeners can subscribe (and unsubscribe) to events. These are the
 * events emitted directly by this class:
 * <ol>
 *   <li>ready - The class is connected to the controller and ready for further processing</li>
 *   <li>error - An error has occurred</li>
 *   <li>closed - The connection to the controller has been closed</li>
 *   <li>state - Reports the current state of the controller</li>
 *   <li>sent - Reports data sent to the controller (i.e. written to the serial port)</li>
 *   <li>data - Reports raw data received from the controller (i.e. the serial port feed)</li>
 *   <li>pos - Reports an object with the mpos, wpos, and spindle speed at the current moment</li>
 *   <li>mode - Reports the workflow mode</li>
 *   <li>alarm - Reports any alarm received from the controller</li>
 *   <li>msg - Reports any messages received from the controller</li>
 * </ol>
 * 
 * In addition to the above primary events, any event defined by CNCjs for its socket communications API
 * can be used. The only catch is that direct subscription to CNCjs socket events must not occur until after
 * the "ready" event has been reported as that is when the socket is ready.
 */
class CNC extends EventEmitter {

    constructor() {
        super();
        this.token = getAccessToken();
        this.ready = false;
        this.autoReset = true;
    }

    connect() {
        this.ready = false;

        this.socket = io.connect('ws://' + host + ':' + port, {
            'query': 'token=' + this.token
        });

        let thiz = this;
        this.socket.on('connect', () => {
           let url = 'ws://' + host;
           console.log('Connected to CNCjs at ' + url);
           thiz.socket.emit('open', serialPort, {
              baudrate: Number(baudRate),
              controllerType: controllerType
           });
        });


        this.socket.on('error', (err) => {
            console.error('CNCjs Connection error.', err)
            if (thiz.socket) {
              thiz.socket.destroy();
              thiz.socket = null;
            }
            thiz.emit('error', new Error('Error opening CNCjs connection: "' + err.message));
        });


        this.socket.on('close', () => {
            console.log('Connection to CNCjs closed.');
            thiz.socket = null;
            thiz.ready = false;
            thiz.emit('closed');
        });
        
        
        this.socket.on('serialport:open', function (options) {
            options = options || {}
            console.log('Connected to port "' + options.port + '" (Baud rate: ' + options.baudrate + ')');
            thiz.ready = true;

            // Notify the CNC object listeners that we are ready to control the machine.
            thiz.emit('ready');
        });


        this.socket.on('serialport:error', function (options) {
            thiz.emit('error', new Error('Error opening serial port "' + options.port + '"'));
        });
          

        this.socket.on('workflow:state', (state) => {
            thiz.wfMode = state;
            this.emit('mode', thiz.mode);
        });


        this.socket.on('controller:state', (controller, state) => {
            thiz.ctrlState = state;
            this.emit('state', state.status.activeState);
            this.emit('pos', { mpos: state.status.mpos, wpos: state.status.wpos, spindle: state.status.spindle });
        });


        this.socket.on('serialport:write', (data) => {
            thiz.emit('sent', data)
        });

        
        this.socket.on('serialport:read', (data) => {
            thiz.emit('data', data);

            if (thiz.jogWaiting && data === 'ok') {
                thiz.jogWaiting = false;
            }
            else {
                if (data.startsWith('ALARM:')) {
                    this.emit('state', CNC.CTRL_STATE_ALARM);
                    this.emit('alarm', data.substring(6));
                }

                if (data === RESET_MSG && this.autoReset) {
                    this.reset();
                }
                else if (data.startsWith('[MSG:')) {
                    this.emit('msg', data.substring(5, data.length - 1))
                }
            }

        });
 
    }

    home() {
        this.sendCommand('homing');
    }

    unlock() {
        this.sendCommand('unlock');
    }

    reset() {
        this.emit('state', 'Resetting');
        this.sendCommand('reset');
    }

    report() {
        this.sendCommand('statusreport');
    }

    hold() {
        this.sendCommand('feedhold');
    }


    resume() {
        this.sendCommand('cyclestart');
    }


    get mpos() {
        if (this.ctrlState) {
            return this.ctrlState.status.mpos;
        }
        else {
            return { x: 0, y: 0, z: 0 };
        }
    }

    get wpos() {
        if (this.ctrlState) {
            return this.ctrlState.status.wpos;
        }
        else {
            return { x: 0, y: 0, z: 0 };
        }
    }


    get rpm() {
        if (this.ctrlState) {
            return this.ctrlState.status.spindle;
        }
        else {
            return 0;
        }
    }


    disconnect() {
        if (this.socket) {
           this.socket.disconnect();
           this.socket = null;
        }
    }


    on(eventName, listener) {

        // Directly handle events generated by this class...
        if (RESERVED_EVENTS.includes(eventName)) {
            return super.on(eventName, listener);
        }

        if (this.socket) {
           // Everything else is assumed low level and handled directly by the socket...
           return this.socket.on(eventName, listener);
        }
        else {
            throw new Error('Subscribing directly to CNCjs events must occur after connect() has been called.');
        }
    }



    removeListener(eventName, listener) {

        // Directly handle events generated by this class...
        if (RESERVED_EVENTS.includes(eventName)) {
            return super.removeListener(eventName, listener);
        }

        // Event alias names for socket events-=-=-=-=-=-=-=-
    
        // When CNC sends commands to Grbl...
        if (eventName === 'sent') {
            // Delegate directly to the socket...
            return this.socket.removeListener('serialport:write', listener);
        }

        // When we receive data from Grbl...
        if (eventName === 'data') {
            return this.socket.removeListener('serialport:read', listener);
        }

        //-=-=-=-=-=-=-=-=-=--=-=-=-=-=-=-

        // Everything else is assumed low level and handled directly by the socket...
        return this.socket.removeListener(eventName, listener);
    }

        
    // Possible commands that can be sent to the Grbl controller can be found in CNCjs code
    // src/server/controllers/Grbl/GrblController.js starting at line 1029 (see possible property names
    // of the map value being assigned to 'const handler').
    sendGCode(gcode) {
        if (Array.isArray(gcode)) {
           this.sendCommand('gcode', gcode.join('\n'));
        }
        else {
           this.sendCommand('gcode', gcode);
        }
    }


    stopGcode () {
        this.sendCommand('gcode:stop', { force: true });
    }


    sendCommand(cmd, ...args) {
        this.socket.emit('command', serialPort, cmd, ...args)
    }


    get state() {
        if (this.ctrlState) {
           return this.ctrlState.status.activeState
        }
        else {
            return null;
        }
    }


    get mode() {
        return this.wfMode;
    }


    canJog() {
        let state = this.state;
        if (state) {
            return (this.ready && !this.jogWaiting && (state === CNC.CTRL_STATE_IDLE || state === CNC.CTRL_STATE_JOG));
        }
        else {
            return false;
        }
    }


    jogStop() {
        this.sendCommand('jogCancel');
      
         // Use "feedhold" if "jogCancel" patch is not installed on CNCjs...
//        this.sendCommand('feedhold');

    }


    /**
     * Commands the spindle to jog, but only if the status is idle or in jog mode. Arguments of (0, 0)
     * will immediately cancel any jog in progress.
     * If jogZ is TRUE, stickY will be used to control the Z axis instead.
     */
    jog(stickX, stickY, jogZ) {
        if (stickX !== 0 || stickY !== 0) {
             if (this.canJog()) {
                let fastestRate = Math.max(Math.abs(stickX), Math.abs(stickY));
                let feedRate;
                let multiplier;
                if (fastestRate > 0.8 && !jogZ) {
                    feedRate = 500;
                    multiplier = 2;
                }
                else if (fastestRate > 0.5) {
                    feedRate = 250;
                    multiplier = 1;
                }
                else {
                    feedRate = 100;
                    multiplier = 0.5;
                }
                
                let jogLetter;
                if (jogZ) {
                    // Jog the Z axis instead...
                    stickX = 0;
                    stickY = -stickY;
                    jogLetter = 'Z';
                }
                else {
                    jogLetter = 'Y';
                }
                let jCmd = `$J=G91 G21 X${Math.sign(stickX)*multiplier} ${jogLetter}${Math.sign(stickY)*multiplier} F${feedRate}`;
                this.jogInProgress = true;
                this.jogWaiting = true;
                this.sendGCode(jCmd);
             }
        }
        else {
            if (this.jogInProgress) {
               this.jogStop();
               this.jogInProgress = false;
               this.jogWaiting = false;
            }
        }
    }
}


// Possible Workflow States:
CNC.WORKFLOW_MODE_IDLE = 'idle';
CNC.WORKFLOW_MODE_PAUSED = 'paused';
CNC.WORKFLOW_MODE_RUNNING = 'running';


// Possible Grbl states when active:
CNC.CTRL_STATE_IDLE = 'Idle';
CNC.CTRL_STATE_RUN = 'Run';
CNC.CTRL_STATE_HOLD = 'Hold';
CNC.CTRL_STATE_DOOR = 'Door';
CNC.CTRL_STATE_HOME = 'Home';
CNC.CTRL_STATE_SLEEP = 'Sleep';
CNC.CTRL_STATE_ALARM = 'Alarm';
CNC.CTRL_STATE_CHECK = 'Check';
CNC.CTRL_STATE_JOG = 'Jog';

module.exports = CNC;
