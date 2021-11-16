
var uiPageActivate = {};

// Simulate a button click with a touch event.
// This function should be added as an event
// response to the 'touchstart' event on
// buttons.
function uiTouchToClick() {
    ui.publish('global.ui.btnPress');
    $(this).trigger('click');
}


function uiListDown(listId) {
    let selector = '#' + listId;
    let optionCount = $(selector + ' option').length;
    let ndx = $(selector).prop('selectedIndex');
    if (ndx >= 0) {
        ndx++;
        if (ndx >= optionCount) {
            ndx = 0;
        }
    }
    else {
        ndx = 0;
    }
    $(selector).prop('selectedIndex', ndx);

    ui.publish('global.ui.btnPress');
  
}

function uiListUp(listId) {
    let selector = '#' + listId;
    let optionCount = $(selector + ' option').length;
    let ndx = $(selector).prop('selectedIndex');
    if (ndx >= 0) {
        ndx--;
        if (ndx < 0) {
            ndx = optionCount - 1;
        }
    }
    else {
        ndx = 0;
    }
    $(selector).prop('selectedIndex', ndx);

    ui.publish('global.ui.btnPress');
}


function uiInitList(listId, valueList, fnSort, nextPageId, fnFilter) {
    let select = $('#' + listId);
    select.empty();
    let list;
    if (Array.isArray(valueList)) {
        list = valueList;
    }
    else {
       list = Object.values(valueList);
    }
    if (fnSort) {
       list.sort(fnSort);
    }
    list.forEach(entry => {
        if (entry.name.toLowerCase() !== 'default' &&
            ((typeof fnFilter == 'undefined') || fnFilter(entry))  ) {
           select.append(`<option value="${entry.value}">${entry.name}</option>`);
        }
    });

    ui.setActiveList(listId);

    // Mouse clicks (or touches) on individual options auto select them..
    $('#' + listId + ' option').on('click touchstart', function() {
        ui.publish('global.ui.btnPress');
        ui.select(listId, this.value, nextPageId);
    });
}


function uiAddButton(divSelector, label, onClick, classDef = "btn w3") {
    let newBtn = $(`<button type="button" class="${classDef}">${label}</button>`);
    newBtn.on('click', onClick);
    newBtn.on('touchstart', uiTouchToClick);
    $(divSelector).append(newBtn);
}


function uiAddPosDisplay(parentDivSelector, wcsNum = wcsMACHINE_WORK) {

    let pos = cncPos;
    let jog = cncJog;
    let laser = cncLaser;
    let displayDiv = {};

    function refreshUI() {
        let p;
        let offset = { x: 0, y: 0 }
        if (wcsNum === wcsMACHINE_WORK) {
            p = pos.mpos;
        }
        else if (wcsNum === wcsPCB_RELATIVE_UR) {
            let ur = appConfig.cnc.locations.ur;
            p = {
                x: Math.abs(pos.mpos.x) + ur.x,
                y: Math.abs(pos.mpos.y) + ur.y,
                z: pos.wpos.z
            }            
        }
        else {
            p = pos.wpos;
        }

        if (laser) {
            offset = appConfig.cnc.pointer.offset;
        }
        else {
            offset = { x: 0, y: 0 }
        }

        if (jog.jogMode) {
           displayDiv.jog.text(jog.jogZ ? 'Jog Z' : 'Jog XY');
        }
        else {
            displayDiv.jog.text('');
        }

        let x = (parseFloat(p.x) + offset.x).toFixed(3);
        let y = (parseFloat(p.y) + offset.y).toFixed(3);
        displayDiv.x.text(x);
        displayDiv.y.text(y);
        displayDiv.z.text(Number(p.z).toFixed(3));

    }

    displayDiv.posListener = RenderMQ.on('render.cnc.pos', (newPos) => {
        pos = newPos;
        refreshUI();
    })

    displayDiv.jogListener = RenderMQ.on('render.cnc.jog', (newJog) => {
        jog = newJog;
        refreshUI();
     })
     
    displayDiv.laserListener = RenderMQ.on('render.cnc.laser', (state) => {
        laser = state;
        refreshUI();
     });
     

    // Create the UI display:
    let parent = $(parentDivSelector);
    const labelDiv = '<div style="width: 2ch; margin-left: 2ch">'
    const valDiv = '<div style="width: 8ch; text-align: right"></div>'

    const html = '<div style="display: flex; margin: auto; width: 40ch">' +
                    `${labelDiv}X:</div>` +
                    valDiv +
                    `${labelDiv}Y:</div>` +
                    valDiv +
                    `${labelDiv}Z:</div>` +
                    valDiv +
                    '<div style="width: 10ch; margin-left: 3ch"></div>' +
                 '</div>'


    parent.append(html);
    displayDiv.parent = parent;

    let mainDiv = parent.children();
    let divs = mainDiv.children();

    displayDiv.x = $(divs.get(1));
    displayDiv.y = $(divs.get(3));
    displayDiv.z = $(divs.get(5));
    displayDiv.jog = $(divs.get(6));

    refreshUI();

    return displayDiv;
}

function uiRemovePosDisplay(displayDiv) {
    displayDiv.posListener.off();
    displayDiv.jogListener.off();
    displayDiv.laserListener.off();
    displayDiv.parent.empty();
}