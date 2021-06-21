# Qwicktrace PCB software flow:


## User interface startup sequence
  1. `app/main/main.js` defines `app.whenReady.then()` which calls `createWindow()`

  2. `createWindow()` creats UI window and explicitly loads `./app/render/index.html`

  3. `index.html` loads `app/render/index.js`, which invokes event `render-ready`

  4. `app/main/main.js` responds to `render-ready` by invoking `render-start`

  5. `app/render/index.js` responds to `render-start` by instantiating `UIController()`, then invoking `render-start-done`

  6. `app/main/main.js` responds to `render-start-done` by instantiating `UILoader()`

  7. `UILoader()` reads the contents of every '.html' file in `app/render/ui`, invoking `ui-page-add` for each one

  8. `UIController()` responds to `ui-page-add` by adding the page contents as a child of `<div id="ui">` in `index.html`

  9. After the last .html file is processed, `UILoader()` invokes `ui-start`

 10. `UIController` responds to `ui-start` by calling method `UILoader().start()`, which explicitly shows page `filePage`



## Inside of each `app/render/ui` .html file:
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
