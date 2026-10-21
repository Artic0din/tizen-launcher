/* Stub with apps only — no systeminfo VIDEOSOURCE or tvwindow. */
(function () {
  window.__calls = [];
  var apps = [
    { id: '111299001912', name: 'YouTube', iconPath: '', show: true },
    { id: 'LnchMvp001.Launcher', name: 'Launcher', iconPath: '', show: true }
  ];
  var later = function (fn) { setTimeout(fn, 20); };
  window.tizen = {
    application: {
      getAppsInfo: function (ok) { later(function () { ok(apps.slice()); }); },
      launch: function (id, ok) { later(ok); },
      getCurrentApplication: function () { return { hide: function () {} }; }
    }
  };
})();
