// Headless Chrome CDP driver for launcher harness screenshots + JSON report.
// Usage: node test/cdp-drive.js <port> <outdir>
'use strict';

const fs = require('fs');
const path = require('path');

const [port, outDir] = process.argv.slice(2);
const root = path.resolve(__dirname, '..');
if (!port || !outDir) {
  console.error('Usage: node test/cdp-drive.js <port> <outdir>');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

(async function () {
  const list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const tab = list.find(function (t) { return t.type === 'page'; });
  if (!tab) {
    throw new Error('No CDP page target');
  }
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let seq = 0;
  const pending = {};
  const consoleLines = [];

  const send = function (method, params) {
    params = params || {};
    return new Promise(function (resolve) {
      const id = ++seq;
      pending[id] = resolve;
      ws.send(JSON.stringify({ id: id, method: method, params: params }));
    });
  };

  ws.onmessage = function (msg) {
    const data = JSON.parse(msg.data);
    if (data.id && pending[data.id]) {
      pending[data.id](data.result || data.error);
      delete pending[data.id];
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      consoleLines.push(data.params.args.map(function (a) { return a.value; }).join(' '));
    }
  };

  await new Promise(function (r) { ws.onopen = r; });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  const evalValue = async function (expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) {
      throw new Error(JSON.stringify(r.exceptionDetails));
    }
    return r.result.value;
  };
  const shot = async function (name) {
    const png = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(png.data, 'base64'));
  };
  const key = async function (code, times) {
    times = times || 1;
    for (let n = 0; n < times; n++) {
      for (const type of ['rawKeyDown', 'keyUp']) {
        await send('Input.dispatchKeyEvent', {
          type: type,
          windowsVirtualKeyCode: code,
          nativeVirtualKeyCode: code
        });
      }
      await wait(80);
    }
  };

  const state = function () {
    return evalValue('window.__launcher.getState()');
  };

  const report = {};

  await send('Page.navigate', { url: 'file://' + path.join(root, 'test/harness.html') });
  await wait(2000);

  report.home = await state();
  await shot('01-home.png');

  await evalValue('window.__launcher.setFocus("focus:src:HDMI:1")');
  await wait(100);
  report.focusMoved = await evalValue('window.__launcher.getState().focusId');
  await shot('02-focus-moved.png');

  await evalValue('window.__launcher.setFocus("focus:edit"); document.getElementById("btnEdit").click()');
  await wait(150);
  report.editMode = await evalValue('window.__launcher.getState().editMode');
  await evalValue('window.__launcher.setFocus("focus:app:com.samsung.tv.cobalt-yt"); document.querySelector("[data-focus-id=\\"focus:app:com.samsung.tv.cobalt-yt\\"]").click()');
  await wait(150);
  report.afterPin = {
    favourites: await evalValue('window.__launcher.getState().favouriteIds'),
    editMode: await evalValue('window.__launcher.getState().editMode')
  };
  await shot('03-edit-pin.png');

  await evalValue('window.__launcher.setFocus("focus:app:org.tizen.netflix-app"); document.querySelector("[data-focus-id=\\"focus:app:org.tizen.netflix-app\\"]").click()');
  await wait(150);
  await evalValue('window.__launcher.setFocus("focus:fav:com.samsung.tv.cobalt-yt"); document.querySelector("[data-focus-id=\\"focus:fav:com.samsung.tv.cobalt-yt\\"]").click()');
  await wait(100);
  await key(39);
  await wait(100);
  await evalValue('document.querySelector("[data-focus-id=\\"focus:fav:com.samsung.tv.cobalt-yt\\"]").click()');
  await wait(150);
  report.favouriteMoved = {
    favourites: await evalValue('window.__launcher.getState().favouriteIds'),
    pickedUp: await evalValue('window.__launcher.getState().pickedUpId')
  };
  if (JSON.stringify(report.favouriteMoved.favourites) !== JSON.stringify(['org.tizen.netflix-app', 'com.samsung.tv.cobalt-yt'])) {
    throw new Error('favourite reorder unexpected: ' + JSON.stringify(report.favouriteMoved.favourites));
  }
  await shot('04-favourite-moved.png');

  await evalValue('document.getElementById("btnEdit").click()');
  await wait(150);
  report.editOff = await evalValue('window.__launcher.getState().editMode');

  await evalValue('window.__launcher.setFocus("focus:app:org.tizen.primevideo-dummy"); document.querySelector("[data-focus-id=\\"focus:app:org.tizen.primevideo-dummy\\"]").click()');
  await wait(400);
  report.launchErrorToast = await evalValue("document.getElementById('toast').textContent");
  await shot('05-launch-error-toast.png');

  await evalValue('window.__launcher.setFocus("focus:src:HDMI:1"); document.querySelector("[data-focus-id=\\"focus:src:HDMI:1\\"]").click()');
  await wait(400);
  report.hdmiPreview = {
    previewing: await evalValue('window.__launcher.getState().previewing'),
    bodyClass: await evalValue('document.body.className'),
    shellVisibility: await evalValue("window.getComputedStyle(document.getElementById('appShell')).visibility")
  };
  report.tvwindowShowCall = await evalValue("(window.__calls||[]).find(function(c){return c.indexOf('show')===0;})||''");
  report.calls = await evalValue('window.__calls || []');
  await shot('06-hdmi-preview.png');
  if (report.hdmiPreview.shellVisibility !== 'hidden') {
    throw new Error('appShell must be hidden during preview, got: ' + report.hdmiPreview.shellVisibility);
  }
  await key(10009);
  await wait(300);

  await send('Page.navigate', { url: 'file://' + path.join(root, 'test/harness-missing.html') });
  await wait(2000);
  report.sourcesUnavailable = await evalValue("document.getElementById('sourcesMsg').textContent");
  await shot('07-sources-unavailable.png');

  report.console = consoleLines;

  if (!report.editMode) {
    throw new Error('edit mode was not enabled during harness run');
  }
  if (!report.afterPin.favourites.includes('com.samsung.tv.cobalt-yt')) {
    throw new Error('pin did not persist YouTube in favourites');
  }
  if (report.tvwindowShowCall.indexOf('0px') < 0) {
    throw new Error('tvwindow.show was not called with px string array rect: ' + report.tvwindowShowCall);
  }
  if (report.launchErrorToast.indexOf('NotFoundError') < 0) {
    throw new Error('expected NotFoundError toast, got: ' + report.launchErrorToast);
  }
  if (!report.hdmiPreview.previewing) {
    throw new Error('HDMI preview did not enter previewing state');
  }

  fs.writeFileSync(path.join(outDir, 'browser-stub-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  ws.close();
  process.exit(0);
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
