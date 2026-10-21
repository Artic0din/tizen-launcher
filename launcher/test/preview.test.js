'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var preview = require('../src/js/preview.js');

test('fullScreenPreviewRect uses px string array for tvwindow.show', function () {
  assert.deepEqual(preview.fullScreenPreviewRect(), ['0px', '0px', '1920px', '1080px']);
});

test('validateTvWindowRect rejects object rects like the real TV', function () {
  var bad = preview.validateTvWindowRect({ x: 0, y: 0, width: 1920, height: 1080 });
  assert.equal(bad.valid, false);
  assert.equal(bad.errorName, 'TypeMismatchError');
  assert.equal(preview.validateTvWindowRect(['0px', '0px', '1920px', '1080px']).valid, true);
});

test('iconLoadPlan uses fallback without remote fetch when iconPath missing', function () {
  var empty = preview.iconLoadPlan('');
  assert.equal(empty.src, preview.FALLBACK_ICON);
  assert.equal(empty.remote, false);
  var remote = preview.iconLoadPlan('/tv/app/icon.png');
  assert.equal(remote.remote, true);
  assert.match(remote.src, /^file:\/\//);
});
