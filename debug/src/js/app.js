/* Launcher Debug: prints what a public-certificate web app can do on this TV.
   No frameworks. Public privileges only. Never registers Exit or Home. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var VERSION = '0.1.0';
  // Keys we never register: Exit/Home belong to the platform; volume/power must keep working.
  var NEVER_REGISTER = ['Exit', 'Home', 'VolumeUp', 'VolumeDown', 'VolumeMute', 'Power', 'PowerOff'];
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009, IME_DONE: 65376, IME_CANCEL: 65385 };
  var keyNames = {};      // code -> name, from getSupportedKeys()
  var apps = [];
  var preview = { source: null, on: false, full: false };

  function ts() { var d = new Date(); return d.toTimeString().slice(0, 8); }
  function errText(e) { return e ? ((e.name || 'Error') + ': ' + (e.message || String(e))) : 'unknown error'; }
  function lines(el, text, max) {
    var t = (ts() + ' ' + text + '\n' + el.textContent).split('\n').slice(0, max).join('\n');
    el.textContent = t;
  }
  function log(text) { lines($('log'), text, 14); if (window.console) console.log('[dbg] ' + text); }
  function result(id, text, ok) {
    var el = $(id); el.textContent = text;
    el.className = 'result' + (ok === true ? ' ok' : ok === false ? ' err' : '');
    log(text.split('\n')[0]);
  }
  function quietResult(id, text, ok) { // same as result() but not logged (icon counters)
    var el = $(id); el.textContent = text;
    el.className = 'result' + (ok === true ? ' ok' : ok === false ? ' err' : '');
  }
  function has(path) {
    var o = window;
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i++) { if (!o || !(parts[i] in o)) return false; o = o[parts[i]]; }
    return true;
  }
  window.onerror = function (msg, src, line) { log('JS error: ' + msg + ' @' + line); };

  /* ---------- focus (D-pad) ---------- */
  function focusables() {
    return Array.prototype.filter.call(document.querySelectorAll('.f'), function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
  }
  function moveFocus(step) {
    var list = focusables(); if (!list.length) return;
    var i = list.indexOf(document.activeElement);
    i = i < 0 ? 0 : Math.max(0, Math.min(list.length - 1, i + step));
    list[i].focus();
    if (list[i].scrollIntoView) list[i].scrollIntoView({ block: 'nearest' });
  }

  /* ---------- device info ---------- */
  function deviceInfo() {
    if (!has('tizen.systeminfo')) { $('device').textContent = 'Device: tizen.systeminfo NOT available (not running on a Tizen TV?)'; return; }
    var pv = '?';
    try { pv = tizen.systeminfo.getCapability('http://tizen.org/feature/platform.version'); } catch (e) { pv = errText(e); }
    $('device').textContent = 'Tizen platform version: ' + pv;
    try {
      tizen.systeminfo.getPropertyValue('BUILD', function (b) {
        $('device').textContent = 'Tizen platform version: ' + pv + ' | model: ' + b.model + ' | build: ' + b.buildVersion;
      }, function (e) { log('BUILD: ' + errText(e)); });
    } catch (e) { log('BUILD: ' + errText(e)); }
  }

  /* ---------- D. installed apps ---------- */
  function iconSrc(p) { if (!p) return ''; return /^(file|https?|data):/.test(p) ? p : 'file://' + p; }
  function loadApps() {
    $('apps').innerHTML = '';
    if (!has('tizen.application.getAppsInfo')) { result('appsSummary', 'Apps: tizen.application.getAppsInfo NOT available', false); return; }
    result('appsSummary', 'Apps: calling getAppsInfo()...');
    try {
      tizen.application.getAppsInfo(function (list) {
        apps = list.slice().sort(function (a, b) { return (b.show - a.show) || String(a.name).localeCompare(String(b.name)); });
        var shown = apps.filter(function (a) { return a.show; }).length;
        var iconOk = 0, iconBad = 0, iconNone = 0;
        function summary(quiet) {
          (quiet ? quietResult : result)('appsSummary', 'Apps: getAppsInfo OK. total ' + apps.length + ', show=true ' + shown +
            '\nIcons: loaded ' + iconOk + ', failed ' + iconBad + ', no iconPath ' + iconNone, true);
        }
        apps.forEach(function (a) {
          var b = document.createElement('button');
          b.className = 'f app' + (a.show ? '' : ' hidden');
          var img = document.createElement('img');
          if (a.iconPath) {
            img.onload = function () { iconOk++; summary(true); };
            img.onerror = function () { iconBad++; img.style.visibility = 'hidden'; summary(true); };
            img.src = iconSrc(a.iconPath);
          } else { iconNone++; img.style.visibility = 'hidden'; }
          var name = document.createElement('span'); name.textContent = a.name + (a.show ? '' : ' (hidden)');
          var id = document.createElement('span'); id.className = 'id'; id.textContent = a.id;
          b.appendChild(img); b.appendChild(name); b.appendChild(id);
          b.onclick = function () { $('appid').value = a.id; launch(a.id, a.name); };
          $('apps').appendChild(b);
        });
        summary();
        buildQuick();
      }, function (e) { result('appsSummary', 'Apps: getAppsInfo ERROR ' + errText(e), false); });
    } catch (e) { result('appsSummary', 'Apps: getAppsInfo threw ' + errText(e), false); }
  }

  /* ---------- A. launch ---------- */
  function launch(id, label) {
    id = (id || '').trim();
    if (!id) { result('launchResult', 'Launch: type an app ID first', false); return; }
    var what = (label ? label + ' ' : '') + '[' + id + ']';
    if (!has('tizen.application.launch')) { result('launchResult', 'Launch ' + what + ': tizen.application.launch NOT available', false); return; }
    result('launchResult', 'Launch ' + what + ': calling launch()...');
    try {
      tizen.application.launch(id, function () { result('launchResult', 'Launch ' + what + ': SUCCESS (success callback fired)', true); },
        function (e) { result('launchResult', 'Launch ' + what + ': ERROR ' + errText(e), false); });
    } catch (e) { result('launchResult', 'Launch ' + what + ': threw ' + errText(e), false); }
  }
  function buildQuick() {
    var box = $('quick'); box.innerHTML = '';
    [['YouTube', /youtube/i], ['Netflix', /netflix/i], ['Prime Video', /prime/i]].forEach(function (q) {
      var a = apps.filter(function (x) { return x.show && q[1].test(x.name); })[0];
      var b = document.createElement('button'); b.className = 'f';
      if (a) { b.textContent = 'Launch ' + q[0]; b.onclick = function () { $('appid').value = a.id; launch(a.id, a.name); }; }
      else { b.textContent = q[0] + ': not installed'; b.disabled = true; }
      box.appendChild(b);
    });
  }

  /* ---------- B. keys ---------- */
  function supportedKeys() {
    if (!has('tizen.tvinputdevice.getSupportedKeys')) { result('keysSummary', 'Supported keys: tizen.tvinputdevice NOT available', false); return []; }
    try {
      var keys = tizen.tvinputdevice.getSupportedKeys();
      keyNames = {};
      keys.forEach(function (k) { keyNames[k.code] = k.name; });
      result('keysSummary', 'Supported keys: getSupportedKeys OK, ' + keys.length + ' keys (not yet registered)', true);
      $('keysList').textContent = keys.map(function (k) { return k.name + ':' + k.code; }).join('  ');
      return keys;
    } catch (e) { result('keysSummary', 'Supported keys: threw ' + errText(e), false); return []; }
  }
  function registerKeys() {
    var keys = supportedKeys(), ok = [], bad = [], skipped = [];
    keys.forEach(function (k) {
      if (NEVER_REGISTER.indexOf(k.name) >= 0) { skipped.push(k.name); return; }
      try { tizen.tvinputdevice.registerKey(k.name); ok.push(k.name); } catch (e) { bad.push(k.name + ' (' + errText(e) + ')'); }
    });
    var src = keys.some(function (k) { return k.name === 'Source'; });
    result('keysSummary', 'Registered ' + ok.length + '/' + keys.length + '. Failed: ' + (bad.join(', ') || 'none') +
      '\nSkipped by policy (platform keys): ' + (skipped.join(', ') || 'none') +
      '\nSource in supported list: ' + (src ? 'YES, registered=' + (ok.indexOf('Source') >= 0 ? 'YES' : 'NO') : 'NO') +
      '\nNow press keys: each one that reaches the app shows in "Key presses".', bad.length === 0);
  }
  function unregisterKeys() {
    var n = 0;
    Object.keys(keyNames).forEach(function (c) {
      try { tizen.tvinputdevice.unregisterKey(keyNames[c]); n++; } catch (e) { /* not registered */ }
    });
    result('keysSummary', 'Unregistered ' + n + ' keys. Only arrows/OK/Back reach the app now.');
  }

  /* ---------- C. HDMI / Live TV preview ---------- */
  function previewRect() {
    if (preview.full) return ['0px', '0px', '1920px', '1080px'];
    var r = $('preview').getBoundingClientRect();
    return [Math.round(r.left) + 'px', Math.round(r.top) + 'px', Math.round(r.width) + 'px', Math.round(r.height) + 'px'];
  }
  function srcLabel(s) { return s.type + ' ' + s.number; }
  function findSources() {
    var box = $('sourceButtons'); box.innerHTML = '';
    if (!has('tizen.tvwindow')) { result('tvResult', 'Preview: tizen.tvwindow NOT available', false); return; }
    try {
      tizen.tvwindow.getAvailableWindows(function (w) { log('tvwindow windows: ' + JSON.stringify(w)); }, function (e) { log('getAvailableWindows ERROR ' + errText(e)); });
    } catch (e) { log('getAvailableWindows threw ' + errText(e)); }
    try {
      tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (vs) {
        var con = vs.connected || [], dis = vs.disconnected || [];
        con.forEach(function (s) {
          var b = document.createElement('button'); b.className = 'f'; b.textContent = 'Preview ' + srcLabel(s);
          b.onclick = function () { startPreview(s); };
          box.appendChild(b);
        });
        result('tvResult', 'Sources: connected ' + (con.map(srcLabel).join(', ') || 'none') +
          '\nDisconnected: ' + (dis.map(srcLabel).join(', ') || 'none'), con.length > 0);
      }, function (e) { result('tvResult', 'Sources: VIDEOSOURCE ERROR ' + errText(e), false); });
    } catch (e) { result('tvResult', 'Sources: VIDEOSOURCE threw ' + errText(e), false); }
  }
  function startPreview(s) {
    result('tvResult', 'Preview ' + srcLabel(s) + ': calling setSource()...');
    try {
      tizen.tvwindow.setSource(s, function (src, type) {
        preview.source = s;
        showWindow('setSource ' + srcLabel(s) + ' OK (window ' + type + ')');
      }, function (e) { result('tvResult', 'Preview ' + srcLabel(s) + ': setSource ERROR ' + errText(e), false); }, 'MAIN');
    } catch (e) { result('tvResult', 'Preview ' + srcLabel(s) + ': setSource threw ' + errText(e), false); }
  }
  function showWindow(prefix) {
    var rect = previewRect();
    document.body.classList.add('pv');
    try {
      tizen.tvwindow.show(function () {
        preview.on = true;
        result('tvResult', prefix + '\nshow() OK at ' + rect.join(',') +
          '\nNOW CHECK BY EYE: picture in the green box? sound? Do arrows/Back still work?', true);
      }, function (e) { result('tvResult', prefix + '\nshow() ERROR ' + errText(e), false); }, rect, 'MAIN');
    } catch (e) { result('tvResult', prefix + '\nshow() threw ' + errText(e), false); }
  }
  function toggleFull() {
    if (!preview.source) { result('tvResult', 'Full window: start a preview first', false); return; }
    preview.full = !preview.full;
    document.body.classList.toggle('full', preview.full);
    showWindow('Full window ' + (preview.full ? 'ON (Back returns)' : 'OFF'));
    if (!preview.full) $('btnFull').focus(); // hidden UI drops focus while full
  }
  function stopPreview() {
    preview.full = false; document.body.classList.remove('full');
    if (!has('tizen.tvwindow')) return;
    try {
      tizen.tvwindow.hide(function () { preview.on = false; document.body.classList.remove('pv'); result('tvResult', 'Preview stopped (hide OK)', true); },
        function (e) { result('tvResult', 'hide ERROR ' + errText(e), false); }, 'MAIN');
    } catch (e) { result('tvResult', 'hide threw ' + errText(e), false); }
  }

  /* ---------- keys and remote ---------- */
  document.addEventListener('keydown', function (ev) {
    var c = ev.keyCode;
    var name = keyNames[c] || ({ 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown', 13: 'Enter', 10009: 'Back' })[c] || ev.key || '?';
    lines($('keylog'), 'keydown code=' + c + ' name=' + name, 8);
    var inInput = document.activeElement && document.activeElement.tagName === 'INPUT';
    switch (c) {
      case KEY.UP: moveFocus(-1); ev.preventDefault(); break;
      case KEY.DOWN: moveFocus(1); ev.preventDefault(); break;
      case KEY.LEFT: if (!inInput) { moveFocus(-1); ev.preventDefault(); } break;
      case KEY.RIGHT: if (!inInput) { moveFocus(1); ev.preventDefault(); } break;
      case KEY.ENTER:
        if (inInput) { $('btnLaunch').focus(); } else if (document.activeElement && document.activeElement.click) { document.activeElement.click(); }
        ev.preventDefault(); break;
      case KEY.IME_DONE: case KEY.IME_CANCEL: $('btnLaunch').focus(); break;
      case KEY.BACK:
        ev.preventDefault();
        if (inInput) { $('btnLaunch').focus(); }
        else if (preview.full) { toggleFull(); }
        else {
          log('Back on main screen: hide() (app stays in background)');
          try { tizen.application.getCurrentApplication().hide(); } catch (e) { log('hide threw ' + errText(e)); }
        }
        break;
    }
  });

  function init() {
    $('ver').textContent = 'v' + VERSION;
    $('btnLaunch').onclick = function () { launch($('appid').value); };
    $('btnRegister').onclick = registerKeys;
    $('btnUnregister').onclick = unregisterKeys;
    $('btnSources').onclick = findSources;
    $('btnFull').onclick = toggleFull;
    $('btnHide').onclick = stopPreview;
    $('btnApps').onclick = loadApps;
    deviceInfo();
    supportedKeys();
    loadApps();
    $('btnLaunch').focus();
    log('ready');
  }
  window.__dbg = { launch: launch, registerKeys: registerKeys, findSources: findSources, startPreview: startPreview, loadApps: loadApps };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
