const { app, BrowserWindow, screen, ipcMain } = require('electron')
const fs = require('fs');

const GPIO = require('./GPIO.js');
const ProjectLoader = require('./ProjectLoader.js');
const FileLoader = require('./FileLoader.js');
const ProfileLoader = require('./ProfileLoader.js');
const UILoader = require('./UILoader.js');
const UVController = require('./UVController.js');
const CNCController = require('./CNCController.js');
const Config = require('./Config.js');

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

  ipcMain.handle('toggle-debugger', (event, ...args) => {
     win.webContents.openDevTools();
  });


  ipcMain.handle('exit', () => {
    win.close();
    app.quit();
  })
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


ipcMain.handle('render-ready', event => {
    win.webContents.send('render-start', Config.json);
});


ipcMain.handle('btn-press', event => {
   // Make a tone upon button press?
});


ipcMain.handle('render-start-done', () => {
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
