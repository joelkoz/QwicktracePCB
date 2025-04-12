General functionality of QwicktracePCB app:
========

Workflow
------
- User creates a collection of Gerber files for each layer of a PCB, and a DRL file for hole definitions using
  their EDA (KiCad, Eagle, etc.). 
  - Be sure that the origin of your board is at the lower left hand corner
  - Files that represent the top and/or bottom copper layer, along with the DRL file should be bundled into a single .zip file.
  - The .ZIP file name is used as the project name inside of QwicktracePCB. 
  - The .ZIP file name should NOT contain any spaces
- Upload the .ZIP file to the app using `http://pcb.local:8080`
- Use the UI of QwicetracePCB to fabricate the board


Troubleshooting
-------
- Just before milling or exposure starts, the gerber and drill files actually used will be stored in `/temp`
- You can examine the .GBR or .DRL files with the `gerbv` utility to make sure they represent your board.
- Gcode used for milling and drilling are stored in `/temp` with file extensions `.nc`
- You can manually updload the `.nc` files and manually control the milling process by accessing CNCjs directly
  at `http://pcb.local:8000`
- Since the CNC mill is controlled via the CNCjs layer, you can actually run the QuicktracePCB UI and control code directly 
  from a PC or Mac and observe the logs.
  - Edit the `config.json` file and change the `cnc.server.host` and the `pigpio.host` entries to be the IP of
    the Qwicktrace controller. Do NOT use the DNS name "pcb.local", as the code may not properly resolve those names
  - Run the Qwicktrace UI from the desktop by changing the current directory to the `QwicktracePCB` root and
    executing `npm run start` from the terminal.


- Regenerate gcode for traces with
```
pcb2gcode --front ./temp/mirror-bottom.gbr --front-output ./temp/bottom-mill.nc
```



Project outline
-----
- Source code is in `app` directory
- ZIP files of gerber/drill bunders are stored in `pcb-files`
- Definitions for raw material types and stock of those materials are in `profiles`
  - A "material" defines a general type of raw material (copper board, photosenstive board, etc)
  - A "stock" is a raw material cut to a particular size
- Configuration file for app is `config.json`. It defines the fabrication tools available and their configuration
  - use `config-3018.json` if milling pcb with a standard 3018 CNC Mill
  - use `config-pi-pro.json` if milling and/or exposing with a Qwickpro build
- If pcb trace isolation is done using a mill, then `pcb2gcode` app is used to translate gerber into gcode. The
  file `millproject` defines the parameters passed in to this CLI app. 
  
  
Source overview
------
- App is a desktop app that uses Electron to provide a runtime environment
- App is structured as a typical client/server app, even though it is bundled inside Electron
- "Server" code is the only code that can talk to/control hardware (hard drive, mill, exposure table)
- "Client" code is a html+javascript web app
- "Server" code is located in `main` directory
- "Client" code is located in `render` directory
- The two layers communicate with each other with a publish/subscribe model using message queue management provided
  by `MainMQ.js` and `RenderMQ.js`
- There is a "remote procedure call" mechanism built on top of `MainMQ.js` and `RenderMQ.js` named `RPCServer.js` and 
  `RPCClient.js` respectively
- The main application logic and program flow is handled in the "Client".  The "Server" provides supporting services
  and does the actual work.


Server side code
------------
- Code found in `app/main`
- `main.js` is the server side entrypoint with startup code. It creates the Electron browser window for the UI,
   loads the UI (via `UILoader.js`), then sets up message handers the client may call
- `ProjectLoader.js` is a singleton that manages a collection of all of the PCB projects stored in `pcb-files.js`
  - Each entry is an instance of `pcb/PCBProject.js`
  - Each project is sent to the UI for user selection
  - Has a method named `prepareForWork()` that prepares all of the files necessary to be processed
- `ProfileLoader.js` is a singleton that reads the definitions of all of the material and stock profiles and sends
   them to the ui
- A series of "Controller" objects control the various hardware sub systems. Each are a collection of work methods
  that do the work of fabrication.  Many can be called directly by the client via the RPC mechanism (look for 
  `this.rpcAPI()` to see what methods are exposed as callable via RPC).
  - `CNCController.js` handles milling and drilling
  - `JoystickController.js` handles the system joystick
  - `UVController.js` handles the exposure table
- A low level CNC control object that interfaces with CNCjs can be found in `cnc/CNC.js`
- If milling a PCB's traces using trace isolation, Gerber to GCode translation is handled by the `pcb2gcode`
  command line tool. `cnc/GcodeUtils.js` is the server's interface to this tool which invokes `pcb2gcode`


Client side code
----------------
- Code found in `app/render`
- UI is composed of a series of individual "pages" that the user moves through.
  - Pages are located in `app/render/ui`
  - A page definition contains CSS and a root `&lt;DIV&gt;`. The `DIV` in turn can contain
    whatever HTML needs to be displayed
  - Page flow is controlled by `UIController.js`
  - A "wizard" is a collection of pages that leads a user step by step thru a particular
    function. Wizards are created by definition a JSON structure that contains the name
    of the wizard and a series of "steps". Each step composed of a string id that identifies the
    step, text instructions to give the user, the buttons to present to the user and the "handler"
    code to execute when that button is pressed, as well as code to execute then the page is first
    activated, and when it is deactivated.
- A series of "Controller" objects represent by each functional subsystem. They define both the
  UI of that subsystem, as well as handle the communication with the hardware controllers on the "server"
  via RPC. Generally, a feature will define a wizard to handle the feature, then will delegate to the
  UIController to execute the wizard.
  - `UIController.js` Top level UI that delegates to the various features and sub-systems. Also executes
     the "wizard" UI feature.
  - `DrillController.js` Feature allows thru holes to be drilled in a PCB
  - `MillController.js` Feature that allows a PCB to be fabricated using a CNC to do trace isolation
  - `ExposeController.js` Featuure that allows a PCB to be fabtricated using UV sensitive PCB boards
  - `PositionController.js` A sub-system that allows the user to position the traces on stock of a particular size
  - `SettingsController.js` Feature allows user to modify system configuration, as well as perform utility functions
    like cutting stock



PCB milling
=====================
- Gerber and DRL files are converted to GCode for milling by:
- `app/main/ProjectLoader.js` methods `prepareForWork()`, `getFinalGerber()`, and `getWorkAsGcode()`
- `prepareForWork()` and `getFinalGerber()` takes the project files and transforms them, positioning
  them on the stock, and mirroring the traces (if milling the bottom of the board). Transformed
  gerber files are placed in the `/temp` directory
- `getWorkAsGcode()` translates those files in Gcode via `app/main/cnc/GcodeUtils.js`, and stores the
  results in the `/temp` dir as `.nc` files.
- `GcodeUtils.js` delegates to `pcb2gcode` to do the actual translation, Parameters to `pcb2code` are stored
  in the `millproject` file.  
- To actually mill the traces of a PCB, `app/render/MillController.js` makes the rpc call `cnc.millPCB` which
  is executed by `app/main/CNCController.js` in the `millPCB()` method. That in turn makes a series of calls
  to `app/cnc/CNC.js` to control each step of the milling process.
