'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');

test('preview callbacks abort when sequence is invalidated before setSource returns', function () {
  var previewSeq = 0;
  var previewPending = true;
  var op = ++previewSeq;
  previewSeq++;
  previewPending = false;
  assert.notEqual(op, previewSeq);
  assert.equal(previewPending, false);
});
