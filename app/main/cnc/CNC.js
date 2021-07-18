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
      let id, name;
      if (config.users) {
          id = config.users[0].id;
          name = config.users[0].name;
      }
      let token = generateAccessToken({ id, name }, secret, '30d');
      return token;    
    } 
    catch (err) {
      console.error(err)
      process.exit(1)
    }
}


//const host = '127.0.0.1';
const host = '192.168.0.160';
const port = 8000;
const serialPort = '/dev/ttyUSB0';
const baudRate = 115200;
const controllerType = 'Grbl';

const RESERVED_EVENTS = [ 'error', 'ready', 'closed', 'state', 'sent', 'data', 'pos', 'sender', 'feeder', 'alarm', 'msg', 'probe' ];


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
 *   <li>sender - Reports the current state of the sender</li>
 *   <li>feeder - Reports the current state of the feeder</li>
 *   <li>alarm - Reports any alarm received from the controller</li>
 *   <li>msg - Reports any messages received from the controller</li>
 *   <li>probe - Reports any zprobe result messages received from the controller</li>
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
        if (this.socket) {
            // Ignore if we are already connected.
            console.log('Aready connected to CNC. Ignoring connect() call.');
            return;
        }

        console.log('Connecting to CNC...');
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

        
        this.socket.on('serialport:close', function (options) {
            thiz.emit('error', new Error('Unexpected closing of serial port "' + options.port + '"'));
        });

        this.socket.on('workflow:state', (data) => {
            thiz.workflow = data;
            thiz.checkSenderStatus(false);
        });

        this.socket.on('feeder:status', (data) => {
            thiz.feeder = data;
            this.emit('feeder', data);
        });


        this.socket.on('sender:status', (data) => {
            thiz.sender = data;
            thiz.checkSenderStatus(true);
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
                else if (data.startsWith('error:')) {
                     let msg = data.substring(6, data.length);
                     console.log(`CNC reported an error: ${msg}`);
                     this.emit('error', new Error(msg));
                }

                if (data === RESET_MSG && this.autoReset) {
                    console.log('Auto-reset after alarm condition...')
                    this.reset();
                }
                else if (data.startsWith('[MSG:')) {
                    console.log('Message from CNC: ', data);
                    this.emit('msg', data.substring(5, data.length - 1))
                }
                else if (data.startsWith('[PRB:')) {
                    // [PRB:-183.458,-179.270,-25.948:1]
                    let pStr = data.substring(5, data.length-1);
                    let values = pStr.split(',');
                    let zVals = values[2].split(':');
                    let results = { x: parseFloat(values[0]), y: parseFloat(values[1]), z: parseFloat(zVals[0]), ok: zVals[1] === '1' }
                    this.emit('probe', results);
                }


            }

        });
 
    }
    
    checkSenderStatus(alwaysEmit) {
        let workflow = this.workflow;
        let sender = this.sender;
        if (workflow && sender) {
            let oldStatus = this.senderStatus;
            if (workflow === 'running') {
                this.senderStatus = CNC.SENDER_RUNNING;
            }
            else if (workflow === 'paused') {
                this.senderStatus = CNC.SENDER_PAUSED;
            }
            else {
                // Workflow state is "idle", so sender is in
                // one of its idle states...
                if (sender.size === 0) {
                    this.senderStatus = CNC.SENDER_EMPTY;
                }
                else if (sender.finishTime) {
                    this.senderStatus = CNC.SENDER_DONE;
                }
                else {
                    this.senderStatus = CNC.SENDER_LOADED;
                }
            }
            let statusChanged = (this.senderStatus != oldStatus);
            if (alwaysEmit || statusChanged) {
                this.emit('sender', this.getSenderState());
            }
        }
    }


    getSenderStatus() {
        return this.senderStatus;
    }

    getSenderState() {
        return { status: this.senderStatus, ...this.sender };
    }


    getFeederState() {
        return this.feeder;
    }


    home() {
        this.emit('state', CNC.CTRL_STATE_HOME);
        this.sendCommand('homing');
    }

    unlock() {
        this.sendCommand('unlock');
    }

    reset() {
        this.emit('state', CNC.CTRL_STATE_RESET);
        this.sendCommand('reset');
        this.socket.once('feeder:status', () => {
            this.emit('state', CNC.CTRL_STATE_IDLE);
        });
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


    // When one or more commands are send directly to the CNC machine (e.g. via sendGcode(), goto(), etc),
    // they are queued by the "feeder", which forwards them to grbl via the serial port

    // Starts the feed sending again following a hold()
    feederStart() {
        this.sendCommand('feeder:start');
    }

    // Stops the feeder by removing any unsent commands from the queue. To pause the feeder,
    // call hold()
    feederStop() {
        this.sendCommand('feeder:stop');
    }

    // Forces a reset of the feeder by immediately executing a hold, then clearing the feeder queue.
    feederReset() {
       this.hold();
       this.feederStop();
       this.feederStart();
    }


    // Large hunks of gcode (for example, the contents of a complete file) are held by the
    // "sender". The sender sends gcode to the grbl controller via the serial port. If
    // it is active (i.e. workflow state is "running"), it blocks anything queued in the
    // feeder.
    senderLoad(gcodeName, strGcodeContents) {
        this.sendCommand('gcode:load', gcodeName, strGcodeContents);
    }

    senderUnload() {
        this.sendCommand('gcode:unload');
    }


    senderStop() {
        this.sendCommand('gcode:stop');
    }


    senderStart() {
        this.sendCommand('gcode:start');
    }

    senderPause() {
        this.sendCommand('gcode:pause');
    }


    senderResume() {
        this.sendCommand('gcode:resume');
    }


    zeroWorkXY(wcsNum = 1) {
        this.setWorkCoord({x: 0, y: 0}, wcsNum);
    }
    
    
    /**
     * Sets the current position of the specified work coordinate
     * system to the specified position
     * @param {object} pos An object with one or more of x, y, z properties
     * @param {number} wcsNum Work coordinate system number 1 thru 6. Using
     *   zero (machine coordinates) is not supported by GRBL and thus is
     *   invalid
     */
    setWorkCoord(pos, wcsNum = 1) {
        let gcode = `G10 L20 P${wcsNum} `;

        if (pos.hasOwnProperty('x')) {
            gcode += `X${pos.x.toFixed(3)} `;
        }

        if (pos.hasOwnProperty('y')) {
           gcode += `Y${pos.y.toFixed(3)} `;
        }

       if (pos.hasOwnProperty('z')) {
           gcode += `Z${pos.z.toFixed(3)}`;
       }

       this.sendGCode(gcode);
    }


    /** 
     * Moves the CNC machine to the specified position
     * of the specified work coordinate system number.
     * If the z position is specified alone, no x,y
     * movement will occur. If the z position is specified
     * along with an (x,y) coordinate, it will be positioned
     * AFTER the x,y movement completes.
     * @param {object} wpos An object with properties x, y, z.
     * @param {number} wcsNum The work coordinate system to use for positioning.
     *   Valid numbers are 0 thru 6.  Zero is used for "machine coordinates"
     */
    goto(wpos, wcsNum = 1) {

       let wcsSelect = `G${53 + wcsNum}`;
       let sendXY = false;
       let xyCode = `${wcsSelect} G0 `;

       if (wpos.hasOwnProperty('x')) {
           xyCode += `X${wpos.x.toFixed(3)} `
           sendXY = true;
       }

       if (wpos.hasOwnProperty('y')) {
           xyCode += `Y${wpos.y.toFixed(3)}`;
           sendXY = true;
       }

       if (sendXY) {
          this.sendGCode(xyCode);
       }

       if (wpos.hasOwnProperty('z')) {
            this.sendGCode(`${wcsSelect} G0 Z${wpos.z.toFixed(3)}`);
       }
    }

    /**
     * Select the current work coordinate system
     * @param {number} wcsNum A number 1 thru 6
     */
    selectWCS(wcsNum = 0) {
        let wcsSelect = `G${53 + wcsNum}`;
        this.sendGCode(wcsSelect);
    }

    /** 
     * Moves the CNC machine to the specified machine position.
     * If the z position is specified, it will be set after
     * the move completes...
     */
     gotoM(mpos) {
         this.goto(mpos, 0)
     }
     

    get mpos() {
        if (this.ctrlState) {
            let pos = this.ctrlState.status.mpos;
            return { x: parseFloat(pos.x), y: parseFloat(pos.y), z: parseFloat(pos.z) };
        }
        else {
            return { x: 0, y: 0, z: 0 };
        }
    }

    get wpos() {
        if (this.ctrlState) {
            let pos = this.ctrlState.status.wpos;
            return { x: parseFloat(pos.x), y: parseFloat(pos.y), z: parseFloat(pos.z) };
        }
        else {
            return { x: 0, y: 0, z: 0 };
        }
    }


    get rpm() {
        if (this.ctrlState) {
            return parseFloat(this.ctrlState.status.spindle);
        }
        else {
            return 0;
        }
    }

    set rpm(val) {
       if (val > 0) {
           this.sendGCode(`M03 S${val}`);
       }
       else {
           this.sendGCode('M05');
       }
    }


    get isIdle() {
        let state = this.state;
        if (state) {
            return (this.ready && state === CNC.CTRL_STATE_IDLE);
        }
        else {
            return false;
        }
    }


    disconnect() {
        if (this.socket) {
           this.socket.disconnect();
           this.socket = null;
           this.ready = false;
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


    once(eventName, listener) {

        // Directly handle events generated by this class...
        if (RESERVED_EVENTS.includes(eventName)) {
            return super.once(eventName, listener);
        }

        if (this.socket) {
           // Everything else is assumed low level and handled directly by the socket...
           return this.socket.once(eventName, listener);
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
        this.feederReset();
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
CNC.CTRL_STATE_RESET = 'Resetting';


// Possible values for the sender:
CNC.SENDER_EMPTY = 'empty';
CNC.SENDER_LOADED = 'loaded';
CNC.SENDER_RUNNING = 'running';
CNC.SENDER_PAUSED = 'paused';
CNC.SENDER_DONE = 'done';

module.exports = CNC;
