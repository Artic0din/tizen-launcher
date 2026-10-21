'use strict';

var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009 };

function directionFromKeyCode(keyCode) {
  switch (keyCode) {
    case KEY.LEFT: return 'left';
    case KEY.RIGHT: return 'right';
    case KEY.UP: return 'up';
    case KEY.DOWN: return 'down';
    default: return null;
  }
}

function shouldPreventDefault(keyCode, didHandle) {
  if (!didHandle) {
    return false;
  }
  if (directionFromKeyCode(keyCode)) {
    return true;
  }
  if (keyCode === KEY.ENTER || keyCode === KEY.BACK) {
    return true;
  }
  return false;
}

function moveFocus(rows, focusId, direction) {
  if (!rows.length) {
    return focusId;
  }
  var pos = findPosition(rows, focusId);
  if (!pos) {
    return firstFocusId(rows);
  }
  if (direction === 'left' || direction === 'right') {
    var row = rows[pos.ri];
    var ni = pos.ci + (direction === 'left' ? -1 : 1);
    if (ni >= 0 && ni < row.length) {
      return row[ni];
    }
    return focusId;
  }
  var targetRi = pos.ri + (direction === 'up' ? -1 : 1);
  if (targetRi < 0 || targetRi >= rows.length) {
    return focusId;
  }
  var targetRow = rows[targetRi];
  if (!targetRow.length) {
    return focusId;
  }
  var ti = Math.min(pos.ci, targetRow.length - 1);
  return targetRow[ti];
}

function findPosition(rows, focusId) {
  for (var ri = 0; ri < rows.length; ri++) {
    var ci = rows[ri].indexOf(focusId);
    if (ci >= 0) {
      return { ri: ri, ci: ci };
    }
  }
  return null;
}

function firstFocusId(rows) {
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].length) {
      return rows[i][0];
    }
  }
  return null;
}

function chunkIntoRows(ids, columns) {
  var rows = [];
  for (var i = 0; i < ids.length; i += columns) {
    rows.push(ids.slice(i, i + columns));
  }
  return rows;
}

var focusExports = {
  KEY: KEY,
  directionFromKeyCode: directionFromKeyCode,
  shouldPreventDefault: shouldPreventDefault,
  moveFocus: moveFocus,
  findPosition: findPosition,
  firstFocusId: firstFocusId,
  chunkIntoRows: chunkIntoRows
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = focusExports;
} else if (typeof window !== 'undefined') {
  window.KEY = KEY;
  window.directionFromKeyCode = directionFromKeyCode;
  window.shouldPreventDefault = shouldPreventDefault;
  window.moveFocus = moveFocus;
  window.findPosition = findPosition;
  window.firstFocusId = firstFocusId;
  window.chunkIntoRows = chunkIntoRows;
}
