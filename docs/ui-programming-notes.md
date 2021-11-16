# Qwicktrace PCB software notes:


## Unified Messaging Queue

Qwicktrace uses a message queue system that unifies the publish/subscribe patterns of NodeJS EventEmitters and Electron's
interprocess communications system.  The main process has a singleton object named `MainMQ`. The render process has an identical
singleton named `RenderMQ`.  These message queue objects have the EventEmitter's typical `emit()`, `on()`, and `once()` methods, but
adds the following event naming and routing schemes:

1. Using dot notation, events are usually in the format `processName.className.message`

2. By using the [EventEmitter2](https://github.com/EventEmitter2/EventEmitter2) package, the message queues inherit all of its functionality. This includes the ability to
listen to wilcard event names. For example, `MainMQ.on('main.cnc.**')` will define a listener that responds to ALL messages
targed to the CNC class, like `main.cnc.hello`.

3. Event names starting with `main` are routed to the main process. Thus sending a message like `RenderMQ.emit('main.cnc.hello')`
ends up being sent to `MainMQ` via Electron's ipc mechanism, where it is then emitted locally in the main process. Any class 
on the main process can listen by calling `MainMQ.on()`. Note that the class name `cnc` in this example usually indicates that 
the CNCController class is the target of the message, but that is not strictly enforced.  Messages can also be sent to to `main.*`
via `MainMQ`. In that case, those events function like a normal event being emitted locally to the main process alone.

4. Event names starting with `render` are routed to the render process in the same manner as described above.

5. Event names starting with `global` are both sent locally via standard `emit()` calls, as well as being routed to the
"other" process (the render process in the case of `MainMQ`, and the main in the case of `RenderMQ`).


## Remote procedure calls
A simplified remote procedure call mechanism builds upon the Unified Message Queue by way of two special base classes: `RPCServer` and
`RPCClient`.  Classes in the main process can inherit from `RPCServer` and expose an API that can be called by `RPCClient` classes
in the render process.  `RPCClient` defines an `async rpCall()` method that makes the call and waits for the returned value. This simple
`rpCall()` ends up being bundled up into a special event message, is forwarded to the main process via RenderMQ, where an `RPCServer`
accepts the messages, makes the local method call, and returns the value via a special "return value" message sent via `MainMQ`.


## Application and User interface startup sequence
  1. `app/main/main.js` defines `app.whenReady.then()` which calls `createWindow()`

  2. `createWindow()` creats UI window and explicitly loads `./app/render/index.html`

  3. `index.html` loads `app/render/index.js`, which invokes event `main.startup.renderReady`

  4. `app/main/main.js` responds to `main.startup.renderReady` by invoking `render.startup.initialize`

  5. `app/render/index.js` responds to `render.startup.initialize` by instantiating `UIController()`, then invoking `main.startup.initializeDone`

  6. `app/main/main.js` responds to `main.startup.initializeDone` by instantiating `UILoader()`

  7. `UILoader()` reads the contents of every '.html' file in `app/render/ui`, invoking `render.ui.pageAdd` for each one

  8. `UIController()` responds to `render.ui.pageAdd` by adding the page contents as a child of `<div id="ui">` in `index.html`

  9. After the last .html file is processed, `UILoader()` invokes `render.startup.startUI`

 10. `UIController` responds to `render.startup.startUI` by calling its `start()` method, which explicitly shows page `appConfig.ui.startPageId`



## Anatomy of an `app/render/ui` .html file:
a. contains a single parent element that is <div id="nameOfFile" class="page">
b. Usual format is:
```
   <div id="nameOfFile class="page">
      <style>...</style>
      <div class="page-header">...</div>
      <div class="page-body">...</div>
      <script>
         uiPageActivate['nameOfFile'] = function() {
             // Code to run each time page is made visible
             // 'ui' variable is the UIController (e.g. ui.showPage('somePageId'))
         }

         // Any other code to run one time when page is first added to index.html
      </script>
   </div>
```

c. The UIController() object is accessible inside a page `<script>` via the global variable `ui`

d. Any "global" variables declared in page scripts are in fact member properties of `window` variable global to all renderside scripts
