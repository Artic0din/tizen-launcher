'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var preview = require('../src/js/preview.js');

function stubShow(rect, cbOk, cbErr) {
  var v = preview.validateTvWindowRect(rect);
  if (!v.valid) {
    cbErr({ name: v.errorName, message: 'Rect must be a string array' });
    return;
  }
  cbOk(rect);
}

test('stub tvwindow.show rejects object rect with TypeMismatchError', function () {
  var err = null;
  stubShow({ x: 0, y: 0, width: 1920, height: 1080 }, function () {
    assert.fail('expected error');
  }, function (e) {
    err = e;
  });
  assert.equal(err.name, 'TypeMismatchError');
});

test('stub tvwindow.show accepts string array rect', function () {
  var seen = null;
  stubShow(preview.fullScreenPreviewRect(), function (rect) {
    seen = rect;
  }, function () {
    assert.fail('expected success');
  });
  assert.deepEqual(seen, ['0px', '0px', '1920px', '1080px']);
});
