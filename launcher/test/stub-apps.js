/* Generates a TV-like app list for browser stubs (not packaged). */
(function (root, factory) {
  var apps = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = apps;
  } else {
    root.__stubApps = apps;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  var TINY_ICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="%23666"/></svg>';
  var apps = [
    { id: 'com.samsung.tv.cobalt-yt', name: 'YouTube', iconPath: TINY_ICON, show: true },
    { id: 'org.tizen.netflix-app', name: 'Netflix', iconPath: '/stub/unreachable/netflix.png', show: true },
    { id: 'org.tizen.primevideo', name: 'Prime Video', iconPath: TINY_ICON, show: true },
    { id: 'org.tizen.primevideo-dummy', name: 'Prime Video Dummy', iconPath: '', show: true },
    { id: 'LnchMvp001.Launcher', name: 'Launcher', iconPath: 'icon.png', show: true, packageId: 'LnchMvp001' },
    { id: 'org.tizen.settings', name: 'Settings', iconPath: '', show: false }
  ];

  var okIcons = 2;
  var badIcons = 1;
  var noIcons = 1;

  while (apps.length < 555) {
    var show = apps.filter(function (a) { return a.show; }).length < 256;
    var iconPath = '';
    if (show) {
      if (okIcons < 172) {
        iconPath = TINY_ICON;
        okIcons++;
      } else if (badIcons < 103) {
        iconPath = '/stub/broken/' + apps.length + '.png';
        badIcons++;
      } else {
        noIcons++;
      }
    }
    apps.push({
      id: 'stub.app.' + apps.length,
      name: 'Stub App ' + apps.length,
      iconPath: iconPath,
      show: show
    });
  }

  return apps;
}));
