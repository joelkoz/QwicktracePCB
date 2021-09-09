const { app, BrowserWindow, screen } = require('electron')

const GPIO = require('./GPIO.js');
const ProjectLoader = require('./ProjectLoader.js');
const FileLoader = require('./FileLoader.js');
const ProfileLoader = require('./ProfileLoader.js');
const UILoader = require('./UILoader.js');
const UVController = require('./UVController.js');
const CNCController = require('./CNCController.js');
const Config = require('./Config.js');
const MainMQ = require('./MainMQ.js');

let win = null;
let fileLoader = null;
let profileLoader = null;
let projectLoader = null;
let uiLoader = null;
let uvController = null;
let cncController = null;

GPIO.setConfiguration(Config.pigpio);

// Enable touch events...
app.commandLine.appendSwitch('touch-events');

function createWindow () {
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: Config.window.width,
    height: Config.window.height,
    minWidth: Config.window.width,
    minHeight: Config.window.height,
    fullscreen: Config.window.fullScreen,
    show: false,
    frame: Config.window.frame,
    webPreferences: {
      nodeIntegration: true,
      // webSecurity: false
    }
  })

  // Remove menu (use ctrl-Q to exit app)
  win.setMenuBarVisibility(false);

  win.loadFile('./app/render/index.html');

  win.show();

  if (Config.window.debug) {
      win.webContents.openDevTools();
  }

  MainMQ.on('main.app.toggleDebugger', () => {
     win.webContents.openDevTools();
  });


  MainMQ.on('main.app.exit', () => {
    win.close();
    app.quit();
  })

  MainMQ.setWindow(win);
  
}


app.whenReady().then(() => {
  screen.setMinimum
  createWindow();
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
  }
})


MainMQ.on('main.startup.renderReady', () => {
    MainMQ.emit('render.startup.initialize', Config.json);
});


MainMQ.on('global.ui.btnPress', () => {
   // Make a tone upon button press?
});


MainMQ.on('main.startup.initializeDone', () => {
  projectLoader = new ProjectLoader(win);
  fileLoader = new FileLoader(win);
  profileLoader = new ProfileLoader(win);
  uiLoader = new UILoader(win);


  if (Config.app.hasPCB) {
     uvController = new UVController(win);
  }

  if (Config.app.hasCNC) {
     cncController = new CNCController(win)
  }

});    
