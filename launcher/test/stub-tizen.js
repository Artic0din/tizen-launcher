/* Browser stub for launcher harness. Fake data only — not packaged. */
(function () {
  var calls = window.__calls = [];
  function rec(name, args) { calls.push(name + ' ' + JSON.stringify(args)); }
  var later = function (fn) { setTimeout(fn, 25); };

  var apps = window.__stubApps;

  function NotFound(msg) { return { name: 'NotFoundError', message: msg }; }
  function TypeMismatch(msg) { return { name: 'TypeMismatchError', message: msg }; }

  window.tizen = {
    systeminfo: {
      getPropertyValue: function (prop, ok, err) {
        rec('getPropertyValue', [prop]);
        later(function () {
          if (prop === 'VIDEOSOURCE') {
            ok({
              connected: [{ type: 'HDMI', number: 1 }, { type: 'TV', number: 1 }],
              disconnected: [{ type: 'HDMI', number: 2 }]
            });
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
          if (id === 'org.tizen.primevideo-dummy') {
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
          appInfo: { id: 'LnchMvp001.Launcher', packageId: 'LnchMvp001' },
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
        later(function () {
          var valid = window.validateTvWindowRect(rect);
          if (!valid.valid) {
            err(TypeMismatch('Rect must be a string array'));
            return;
          }
          ok(rect, type);
        });
      },
      hide: function (ok, err, type) {
        rec('hide-window', [type]);
        later(ok);
      }
    }
  };
})();
