
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


function uiInitList(listId, valueList, fnSort, nextPageId) {
    let select = $('#' + listId);
    select.empty();
    let list = Object.values(valueList);
    list.sort(fnSort);
    list.forEach(entry => {
        if (entry.name.toLowerCase() !== 'default') {
           select.append(`<option value="${entry.value}">${entry.name}</option>`);
        }
    });

    // Mouse clicks (or touches) on individual options auto select them..
    $('#' + listId + ' option').on('click touchstart', function() {
        ui.publish('btn-press');
        ui.select(listId, this.value, nextPageId);
    });
}

