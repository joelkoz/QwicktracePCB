
var uiPageActivate = {};

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

    ui.publish('btn-press');
  
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

    ui.publish('btn-press');
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
        ui.publish('btn-press');
        ui.select(listId, this.value, nextPageId);
    });
}


function uiAddButton(divSelector, label, onClick, classDef = "btn w3") {
    let newBtn = $(`<button type="button" class="${classDef}">${label}</button>`);
    newBtn.on('click', onClick);
    $(divSelector).append(newBtn);
}
