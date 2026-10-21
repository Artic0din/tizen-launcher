'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fav = require('../src/js/favourites.js');

test('pin adds id once', function () {
  assert.deepEqual(fav.pinFavourite([], 'a'), ['a']);
  assert.deepEqual(fav.pinFavourite(['a'], 'a'), ['a']);
  assert.deepEqual(fav.pinFavourite(['a'], 'b'), ['a', 'b']);
});

test('unpin and toggle', function () {
  assert.deepEqual(fav.unpinFavourite(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(fav.togglePin(['a'], 'a'), []);
  assert.deepEqual(fav.togglePin([], 'x'), ['x']);
});

test('move left/right swaps neighbours', function () {
  assert.deepEqual(fav.moveFavourite(['a', 'b', 'c'], 'b', 'left'), ['b', 'a', 'c']);
  assert.deepEqual(fav.moveFavourite(['a', 'b', 'c'], 'b', 'right'), ['a', 'c', 'b']);
  assert.deepEqual(fav.moveFavourite(['a'], 'a', 'left'), ['a']);
});

test('prune drops uninstalled ids', function () {
  assert.deepEqual(fav.pruneFavourites(['a', 'b', 'c'], ['a', 'c']), ['a', 'c']);
});
