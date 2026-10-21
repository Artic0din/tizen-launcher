'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var apps = require('./stub-apps.js');

test('stub apps mirror S95C list scale and show=true count', function () {
  assert.equal(apps.length, 555);
  assert.equal(apps.filter(function (a) { return a.show; }).length, 256);
});

test('stub includes real retail app ids', function () {
  var ids = apps.map(function (a) { return a.id; });
  assert.ok(ids.indexOf('com.samsung.tv.cobalt-yt') >= 0);
  assert.ok(ids.indexOf('org.tizen.netflix-app') >= 0);
  assert.ok(ids.indexOf('org.tizen.primevideo') >= 0);
  assert.ok(ids.indexOf('org.tizen.primevideo-dummy') >= 0);
});
