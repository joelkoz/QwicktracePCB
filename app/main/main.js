const { app, BrowserWindow, screen, ipcMain } = require('electron')
const fs = require('fs');

const FileLoader = require('./FileLoader.js');
const ProfileLoader = require('./ProfileLoader.js');
const UILoader = require('./UILoader.js');
const LEDController = require('./LEDController.js');

let win = null;
let fileLoader = null;
let profileLoader = null;
let uiLoader = null;
let ledController = null;

// Load in the base configuration...
let jStr = fs.readFileSync('./config.json', 'utf8');
let jConfig = JSON.parse(jStr);

// Enable touch events...
app.commandLine.appendSwitch('touch-events');

function createWindow () {
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: jConfig.super.width,
    height: jConfig.super.height,
    minWidth: jConfig.super.width,
    minHeight: jConfig.super.height,
    fullscreen: jConfig.super.fullScreen,
    show: false,
    frame: jConfig.super.frame,
    webPreferences: {
      nodeIntegration: true,
      // webSecurity: false
    }
  })

  // Remove menu (use ctrl-Q to exit app)
  win.setMenuBarVisibility(false);

  win.loadFile('./app/render/index.html');

  win.show();

  if (jConfig.super.debug) {
      win.webContents.openDevTools();
  }

  ipcMain.handle('toggle-debugger', (event, ...args) => {
     win.webContents.openDevTools();
  });

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
    win.webContents.send('render-start', jConfig);
});


ipcMain.handle('btn-press', event => {
   // Make a tone upon button press?
});


ipcMain.handle('render-start-done', () => {
  fileLoader = new FileLoader(win);
  profileLoader = new ProfileLoader(win);
  uiLoader = new UILoader(win);
  ledController = new LEDController(win, jConfig);
});    

