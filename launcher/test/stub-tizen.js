/* Browser stub for launcher harness. Fake data only — not packaged. */
(function () {
  var calls = window.__calls = [];
  function rec(name, args) { calls.push(name + ' ' + JSON.stringify(args)); }
  var later = function (fn) { setTimeout(fn, 25); };

  var apps = [
    { id: '111299001912', name: 'YouTube', iconPath: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="%23f00"/></svg>', show: true },
    { id: '3201907018807', name: 'Netflix', iconPath: '/nonexistent/netflix.png', show: true },
    { id: 'fail.launch.app', name: 'Broken Launch', iconPath: '', show: true },
    { id: '3201606009798', name: 'Stan', iconPath: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="%230f0"/></svg>', show: true },
    { id: 'LnchMvp001.Launcher', name: 'Launcher', iconPath: 'icon.png', show: true },
    { id: 'org.tizen.settings', name: 'Settings', iconPath: '', show: false }
  ];

  function NotFound(msg) { return { name: 'NotFoundError', message: msg }; }

  window.tizen = {
    systeminfo: {
      getPropertyValue: function (prop, ok, err) {
        rec('getPropertyValue', [prop]);
        later(function () {
          if (prop === 'VIDEOSOURCE') {
            ok({ connected: [{ type: 'HDMI', number: 1 }], disconnected: [{ type: 'HDMI', number: 2 }] });
          } else {
            err(NotFound('stub'));
          }
        });
      }
    },
    application: {
      getAppsInfo: function (ok) {
        rec('getAppsInfo', []);
        later(function () { ok(apps.slice()); });
      },
      launch: function (id, ok, err) {
        rec('launch', [id]);
        later(function () {
          if (id === 'fail.launch.app') {
            err(NotFound('No application with id ' + id));
          } else if (apps.some(function (a) { return a.id === id && a.show; })) {
            ok();
          } else {
            err(NotFound('No application with id ' + id));
          }
        });
      },
      getCurrentApplication: function () {
        return {
          appInfo: { id: 'LnchMvp001.Launcher' },
          hide: function () { rec('hide', []); }
        };
      }
    },
    tvwindow: {
      setSource: function (src, ok, err, type) {
        rec('setSource', [src, type]);
        later(function () { ok(src, type); });
      },
      show: function (ok, err, rect, type) {
        rec('show', [rect, type]);
        later(function () { ok(rect, type); });
      },
      hide: function (ok, err, type) {
        rec('hide-window', [type]);
        later(ok);
      }
    }
  };
})();
