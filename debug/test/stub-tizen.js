/* Browser-only stub of the Tizen APIs the debug launcher uses. NOT packaged. Fake data only. */
(function () {
  var calls = window.__calls = [];
  function rec(n, a) { calls.push(n + ' ' + JSON.stringify(a)); }
  var later = function (f) { setTimeout(f, 20); };
  var apps = [
    { id: '111299001912', name: 'YouTube', iconPath: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="red"/></svg>', show: true },
    { id: '3201907018807', name: 'Netflix', iconPath: '/nonexistent/netflix.png', show: true },
    { id: 'org.tizen.settings', name: 'Settings', iconPath: '', show: false },
    { id: 'LnchDbg001.LauncherDebug', name: 'Launcher Debug', iconPath: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="blue"/></svg>', show: true }
  ];
  var keys = [{ name: 'ColorF0Red', code: 403 }, { name: 'MediaPlayPause', code: 10252 }, { name: 'ChannelUp', code: 427 },
    { name: 'Source', code: 10072 }, { name: 'Exit', code: 10182 }, { name: 'VolumeUp', code: 447 }, { name: 'Info', code: 457 }];
  function NotFound(m) { return { name: 'NotFoundError', message: m }; }
  function TypeMismatch(m) { return { name: 'TypeMismatchError', message: m }; }
  function validShowRect(r) {
    return Array.isArray(r) && r.length === 4 && r.every(function (s) { return typeof s === 'string'; });
  }
  window.tizen = {
    systeminfo: {
      getCapability: function (k) { rec('getCapability', [k]); return '8.0'; },
      getPropertyValue: function (p, ok) { rec('getPropertyValue', [p]); later(function () {
        if (p === 'BUILD') ok({ model: 'STUB-MODEL', buildVersion: 'STUB-BUILD' });
        if (p === 'VIDEOSOURCE') ok({ connected: [{ type: 'TV', number: 1 }, { type: 'HDMI', number: 1 }], disconnected: [{ type: 'HDMI', number: 2 }] });
      }); }
    },
    application: {
      getAppsInfo: function (ok) { rec('getAppsInfo', []); later(function () { ok(apps); }); },
      launch: function (id, ok, err) { rec('launch', [id]); later(function () { apps.some(function (a) { return a.id === id; }) ? ok() : err(NotFound('No application with id ' + id)); }); },
      getCurrentApplication: function () { return { hide: function () { rec('hide', []); }, exit: function () { rec('exit', []); } }; }
    },
    tvinputdevice: {
      getSupportedKeys: function () { rec('getSupportedKeys', []); return keys; },
      registerKey: function (n) { rec('registerKey', [n]); if (n === 'Info') throw { name: 'InvalidValuesError', message: 'stub refuses Info' }; },
      unregisterKey: function (n) { rec('unregisterKey', [n]); }
    },
    tvwindow: {
      getAvailableWindows: function (ok) { rec('getAvailableWindows', []); later(function () { ok(['MAIN']); }); },
      setSource: function (s, ok, err, t) { rec('setSource', [s, t]); later(function () { s.type === 'HDMI' ? ok(s, t) : err({ name: 'NotSupportedError', message: 'stub: no tuner' }); }); },
      show: function (ok, err, r, t) {
        rec('show', [r, t]);
        later(function () {
          if (!validShowRect(r)) { err(TypeMismatch('rect must be an array of 4 strings (e.g. 0px, 0px, 960px, 540px)')); return; }
          ok(r, t);
        });
      },
      hide: function (ok, err, t) { rec('hide-window', [t]); later(ok); }
    }
  };
})();
