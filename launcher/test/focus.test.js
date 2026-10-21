'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var focus = require('../src/js/focus.js');

var sampleRows = [
  ['edit'],
  ['f1', 'f2'],
  ['s1'],
  ['a1', 'a2', 'a3'],
  ['a4', 'a5']
];

test('moveFocus moves one step horizontally', function () {
  assert.equal(focus.moveFocus(sampleRows, 'a2', 'left'), 'a1');
  assert.equal(focus.moveFocus(sampleRows, 'a2', 'right'), 'a3');
  assert.equal(focus.moveFocus(sampleRows, 'a3', 'right'), 'a3');
});

test('moveFocus moves vertically clamping column index to target row', function () {
  assert.equal(focus.moveFocus(sampleRows, 'a2', 'up'), 's1');
  assert.equal(focus.moveFocus(sampleRows, 'f1', 'down'), 's1');
  assert.equal(focus.moveFocus(sampleRows, 'edit', 'down'), 'f1');
  assert.equal(focus.moveFocus(sampleRows, 'a1', 'up'), 's1');
});

test('firstFocusId picks first non-empty row', function () {
  assert.equal(focus.firstFocusId(sampleRows), 'edit');
  assert.equal(focus.firstFocusId([[], ['x']]), 'x');
});

test('shouldPreventDefault only when navigation handled', function () {
  assert.equal(focus.shouldPreventDefault(focus.KEY.LEFT, false), false);
  assert.equal(focus.shouldPreventDefault(focus.KEY.LEFT, true), true);
  assert.equal(focus.shouldPreventDefault(focus.KEY.ENTER, true), true);
  assert.equal(focus.shouldPreventDefault(999, true), false);
});

test('directionFromKeyCode maps arrows', function () {
  assert.equal(focus.directionFromKeyCode(focus.KEY.UP), 'up');
  assert.equal(focus.directionFromKeyCode(focus.KEY.DOWN), 'down');
  assert.equal(focus.directionFromKeyCode(32), null);
});

test('one press one item: repeated right from a1 visits a2 then a3 only', function () {
  var id = 'a1';
  var seen = [id];
  for (var i = 0; i < 3; i++) {
    id = focus.moveFocus(sampleRows, id, 'right');
    seen.push(id);
  }
  assert.deepEqual(seen, ['a1', 'a2', 'a3', 'a3']);
});
