/* Launcher MVP for Samsung TV (public privileges only). Plain JS, no key registration. */
(function () {
  'use strict';

  var APP_ID = 'LnchMvp001.Launcher';
  var GRID_COLUMNS = 8;
  var FOCUS_EDIT = 'focus:edit';
  var toastTimer = null;

  var state = {
    apps: [],
    favouriteIds: [],
    sources: [],
    sourcesError: null,
    editMode: false,
    pickedUpId: null,
    focusId: FOCUS_EDIT,
    previewing: false,
    previewPending: false,
    previewSourceKey: null,
    previewSeq: 0,
    appsError: null
  };

  function $(id) { return document.getElementById(id); }

  function errName(e) {
    return e && e.name ? e.name : 'Error';
  }

  function hasApi(path) {
    var o = window;
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i++) {
      if (!o || !(parts[i] in o)) {
        return false;
      }
      o = o[parts[i]];
    }
    return true;
  }

  function readFavouritesFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavourites() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.favouriteIds));
    } catch (e) { /* ignore quota errors */ }
  }

  function showToast(text) {
    var el = $('toast');
    el.textContent = text;
    el.classList.remove('hidden');
    el.classList.add('show');
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(function () {
      el.classList.add('hidden');
      el.classList.remove('show');
    }, 3200);
  }

  function attachTileIcon(btn, iconPath) {
    var plan = iconLoadPlan(iconPath);
    var img = document.createElement('img');
    img.alt = '';
    img.src = plan.src;
    if (plan.remote) {
      img.onerror = function () {
        img.onerror = null;
        img.src = FALLBACK_ICON;
      };
    }
    btn.insertBefore(img, btn.firstChild);
  }

  function sourceLabel(source) {
    if (source.type === 'TV') {
      return 'Live TV preview';
    }
    return 'HDMI ' + source.number + ' preview';
  }

  function sourceFocusId(source) {
    return 'focus:src:' + source.type + ':' + source.number;
  }

  function appFocusId(appId) {
    return 'focus:app:' + appId;
  }

  function favFocusId(appId) {
    return 'focus:fav:' + appId;
  }

  function favRemoveFocusId(appId) {
    return 'focus:favrm:' + appId;
  }

  function appById(id) {
    for (var i = 0; i < state.apps.length; i++) {
      if (state.apps[i].id === id) {
        return state.apps[i];
      }
    }
    return null;
  }

  function installedIds() {
    return state.apps.map(function (a) { return a.id; });
  }

  function syncFavourites() {
    state.favouriteIds = pruneFavourites(state.favouriteIds, installedIds());
    saveFavourites();
  }

  function buildFocusRows() {
    var rows = [[FOCUS_EDIT]];
    var favRow = [];
    state.favouriteIds.forEach(function (id) {
      favRow.push(favFocusId(id));
      if (state.editMode) {
        favRow.push(favRemoveFocusId(id));
      }
    });
    if (favRow.length) {
      rows.push(favRow);
    }
    if (state.sources.length) {
      rows.push(state.sources.map(function (s) { return sourceFocusId(s); }));
    } else if ($('sourcesMsg') && !$('sourcesMsg').classList.contains('hidden')) {
      rows.push(['focus:sources-msg']);
    }
    var appIds = state.apps.map(function (a) { return appFocusId(a.id); });
    var appRows = chunkIntoRows(appIds, GRID_COLUMNS);
    appRows.forEach(function (r) { rows.push(r); });
    return rows;
  }

  function ensureFocusValid() {
    var rows = buildFocusRows();
    var ids = [];
    rows.forEach(function (row) {
      row.forEach(function (id) { ids.push(id); });
    });
    if (state.focusId && ids.indexOf(state.focusId) >= 0) {
      return;
    }
    state.focusId = firstFocusId(rows) || FOCUS_EDIT;
  }

  function applyFocusDom() {
    var nodes = document.querySelectorAll('.f');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.remove('focus');
    }
    var el = document.querySelector('[data-focus-id="' + state.focusId + '"]');
    if (el) {
      el.classList.add('focus');
      el.focus();
      if (el.scrollIntoView) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  }

  function setFocus(focusId) {
    state.focusId = focusId;
    applyFocusDom();
  }

  function navigate(direction) {
    var rows = buildFocusRows();
    var next = moveFocus(rows, state.focusId, direction);
    if (next !== state.focusId) {
      setFocus(next);
      return true;
    }
    return false;
  }

  function renderEditUi() {
    var editing = state.editMode;
    $('btnEdit').textContent = editing ? 'Done editing favourites' : 'Edit favourites';
    $('btnEdit').setAttribute('aria-pressed', editing ? 'true' : 'false');
    $('editHint').classList.toggle('hidden', !editing);
    document.body.classList.toggle('edit-mode', editing);
    if (!editing) {
      state.pickedUpId = null;
    }
  }

  function makeTile(opts) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'f tile' + (opts.extraClass ? ' ' + opts.extraClass : '');
    btn.setAttribute('data-focus-id', opts.focusId);
    if (opts.label) {
      var span = document.createElement('span');
      span.className = 'label';
      span.textContent = opts.label;
      btn.appendChild(span);
    }
    if (opts.iconPath !== undefined) {
      attachTileIcon(btn, opts.iconPath);
    }
    btn.addEventListener('click', opts.onActivate || function () {});
    return btn;
  }

  function renderFavourites() {
    var box = $('favourites');
    box.innerHTML = '';
    var empty = $('favEmpty');
    if (!state.favouriteIds.length) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    state.favouriteIds.forEach(function (id) {
      var app = appById(id);
      if (!app) {
        return;
      }
      var tile = makeTile({
        focusId: favFocusId(id),
        label: app.name,
        iconPath: app.iconPath,
        extraClass: state.pickedUpId === id ? 'picked' : '',
        onActivate: function () { onFavouriteActivate(id); }
      });
      box.appendChild(tile);
      if (state.editMode) {
        var rm = makeTile({
          focusId: favRemoveFocusId(id),
          label: 'Remove',
          extraClass: 'remove',
          onActivate: function () { removeFavourite(id); }
        });
        box.appendChild(rm);
      }
    });
  }

  function renderSources() {
    var box = $('sources');
    var msg = $('sourcesMsg');
    box.innerHTML = '';
    msg.classList.add('hidden');
    msg.classList.remove('err');
    if (state.sourcesError) {
      msg.textContent = state.sourcesError;
      msg.classList.remove('hidden');
      msg.classList.add('err');
      msg.setAttribute('data-focus-id', 'focus:sources-msg');
      msg.classList.add('f');
      msg.tabIndex = -1;
      return;
    }
    msg.classList.remove('f');
    msg.removeAttribute('data-focus-id');
    state.sources.forEach(function (s) {
      var tile = makeTile({
        focusId: sourceFocusId(s),
        label: sourceLabel(s),
        onActivate: function () { startSourcePreview(s); }
      });
      box.appendChild(tile);
    });
  }

  function renderApps() {
    var box = $('apps');
    var frag = document.createDocumentFragment();
    state.apps.forEach(function (app) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'f tile';
      btn.setAttribute('data-focus-id', appFocusId(app.id));
      btn.setAttribute('data-app-id', app.id);
      attachTileIcon(btn, app.iconPath);
      var label = document.createElement('span');
      label.className = 'label';
      label.textContent = app.name;
      btn.appendChild(label);
      if (state.editMode && state.favouriteIds.indexOf(app.id) >= 0) {
        var badge = document.createElement('span');
        badge.className = 'badge-pin';
        badge.textContent = 'Pinned';
        btn.appendChild(badge);
      }
      frag.appendChild(btn);
    });
    box.replaceChildren(frag);
  }

  function onAppsGridClick(ev) {
    var btn = ev.target.closest('[data-app-id]');
    if (!btn) {
      return;
    }
    var app = appById(btn.getAttribute('data-app-id'));
    if (app) {
      onAppActivate(app);
    }
  }

  function renderAppsError() {
    var el = $('appsError');
    if (!el) {
      return;
    }
    if (state.appsError) {
      el.textContent = state.appsError;
      el.classList.remove('hidden');
    } else {
      el.textContent = '';
      el.classList.add('hidden');
    }
  }

  function renderAll() {
    renderEditUi();
    renderFavourites();
    renderSources();
    renderAppsError();
    renderApps();
    ensureFocusValid();
    applyFocusDom();
  }

  function removeFavourite(appId) {
    state.favouriteIds = unpinFavourite(state.favouriteIds, appId);
    if (state.pickedUpId === appId) {
      state.pickedUpId = null;
    }
    saveFavourites();
    renderAll();
  }

  function onFavouriteActivate(appId) {
    if (!state.editMode) {
      launchApp(appId);
      return;
    }
    if (state.pickedUpId === appId) {
      state.pickedUpId = null;
      renderFavourites();
      applyFocusDom();
      return;
    }
    if (state.pickedUpId) {
      state.pickedUpId = null;
      renderFavourites();
      applyFocusDom();
      return;
    }
    state.pickedUpId = appId;
    renderFavourites();
    applyFocusDom();
  }

  function onAppActivate(app) {
    if (state.editMode) {
      state.favouriteIds = togglePin(state.favouriteIds, app.id);
      saveFavourites();
      renderAll();
      return;
    }
    launchApp(app.id);
  }

  function launchApp(appId) {
    if (!hasApi('tizen.application.launch')) {
      showToast('NotSupportedError');
      return;
    }
    try {
      tizen.application.launch(appId, function () {
        /* app hidden by platform when target launches */
      }, function (e) {
        showToast(errName(e));
      });
    } catch (e) {
      showToast(errName(e));
    }
  }

  function loadApps(callback) {
    if (!hasApi('tizen.application.getAppsInfo')) {
      state.appsError = 'Could not load installed apps (getAppsInfo unavailable).';
      if (callback) {
        callback();
      }
      return;
    }
    try {
      tizen.application.getAppsInfo(function (list) {
        state.appsError = null;
        state.apps = list.filter(function (a) {
          return a.show && a.id !== APP_ID && a.packageId !== 'LnchMvp001';
        }).sort(function (a, b) {
          return String(a.name).localeCompare(String(b.name));
        });
        syncFavourites();
        if (callback) {
          callback();
        }
      }, function (e) {
        state.appsError = 'Could not refresh installed apps. Showing the last loaded list (' +
          errName(e) + ').';
        if (callback) {
          callback();
        }
      });
    } catch (e) {
      state.appsError = 'Could not refresh installed apps. Showing the last loaded list (' +
        errName(e) + ').';
      if (callback) {
        callback();
      }
    }
  }

  function loadSources(callback) {
    state.sources = [];
    state.sourcesError = null;
    if (!hasApi('tizen.systeminfo.getPropertyValue') || !hasApi('tizen.tvwindow')) {
      state.sourcesError = 'HDMI and Live TV preview are not available on this device (systeminfo or tvwindow missing).';
      if (callback) {
        callback();
      }
      return;
    }
    try {
      tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (vs) {
        var connected = (vs && vs.connected) ? vs.connected.slice() : [];
        state.sources = connected;
        if (!connected.length) {
          state.sourcesError = 'No connected video sources reported by the TV.';
        }
        if (callback) {
          callback();
        }
      }, function (e) {
        state.sourcesError = 'Could not read video sources: ' + errName(e);
        if (callback) {
          callback();
        }
      });
    } catch (e) {
      state.sourcesError = 'Could not read video sources: ' + errName(e);
      if (callback) {
        callback();
      }
    }
  }

  function stopPreview(focusBack) {
    var seq = ++state.previewSeq;
    state.previewing = false;
    state.previewPending = false;
    document.body.classList.remove('previewing');
    if (!hasApi('tizen.tvwindow.hide')) {
      if (focusBack) {
        applyFocusDom();
      }
      return;
    }
    try {
      tizen.tvwindow.hide(function () {
        if (seq !== state.previewSeq) {
          return;
        }
        if (focusBack) {
          applyFocusDom();
        }
      }, function () {
        if (focusBack) {
          applyFocusDom();
        }
      }, 'MAIN');
    } catch (e) {
      if (focusBack) {
        applyFocusDom();
      }
    }
  }

  function cancelPreviewOperations(focusBack) {
    state.previewSeq++;
    state.previewPending = false;
    state.previewing = false;
    document.body.classList.remove('previewing');
    if (!hasApi('tizen.tvwindow.hide')) {
      if (focusBack) {
        applyFocusDom();
      }
      return;
    }
    try {
      tizen.tvwindow.hide(function () {
        if (focusBack) {
          applyFocusDom();
        }
      }, function () {
        if (focusBack) {
          applyFocusDom();
        }
      }, 'MAIN');
    } catch (e) {
      if (focusBack) {
        applyFocusDom();
      }
    }
  }

  function startSourcePreview(source) {
    if (!hasApi('tizen.tvwindow.setSource')) {
      showToast('NotSupportedError');
      return;
    }
    var key = source.type + ':' + source.number;
    state.previewSourceKey = key;
    state.previewPending = true;
    var op = ++state.previewSeq;
    try {
      tizen.tvwindow.setSource(source, function () {
        if (op !== state.previewSeq) {
          return;
        }
        tizen.tvwindow.show(function () {
          if (op !== state.previewSeq) {
            return;
          }
          state.previewPending = false;
          state.previewing = true;
          document.body.classList.add('previewing');
        }, function (e) {
          if (op !== state.previewSeq) {
            return;
          }
          state.previewPending = false;
          showToast(errName(e));
        }, fullScreenPreviewRect(), 'MAIN');
      }, function (e) {
        if (op !== state.previewSeq) {
          return;
        }
        state.previewPending = false;
        showToast(errName(e));
      }, 'MAIN');
    } catch (e) {
      state.previewPending = false;
      showToast(errName(e));
    }
  }

  function toggleEditMode() {
    state.editMode = !state.editMode;
    state.pickedUpId = null;
    renderAll();
  }

  function hideApp() {
    if (state.previewPending || state.previewing) {
      cancelPreviewOperations(false);
    }
    try {
      tizen.application.getCurrentApplication().hide();
    } catch (e) {
      showToast(errName(e));
    }
  }

  function onKeyDown(ev) {
    var code = ev.keyCode;
    if (ev.repeat && (code === KEY.ENTER || code === KEY.BACK)) {
      return;
    }
    if (state.previewing) {
      if (code === KEY.BACK || code === KEY.ENTER) {
        ev.preventDefault();
        stopPreview(true);
      }
      return;
    }

    var handled = false;

    if (state.editMode && state.pickedUpId && (code === KEY.LEFT || code === KEY.RIGHT)) {
      var dir = code === KEY.LEFT ? 'left' : 'right';
      state.favouriteIds = moveFavourite(state.favouriteIds, state.pickedUpId, dir);
      saveFavourites();
      renderFavourites();
      applyFocusDom();
      handled = true;
    } else {
      var direction = directionFromKeyCode(code);
      if (direction) {
        handled = navigate(direction);
      }
    }

    if (code === KEY.ENTER) {
      handled = true;
      var active = document.querySelector('[data-focus-id="' + state.focusId + '"]');
      if (active && active.click) {
        active.click();
      }
    }

    if (code === KEY.BACK) {
      handled = true;
      ev.preventDefault();
      if (state.previewPending) {
        cancelPreviewOperations(true);
        return;
      }
      if (state.editMode) {
        state.editMode = false;
        state.pickedUpId = null;
        renderAll();
        return;
      }
      hideApp();
      return;
    }

    if (shouldPreventDefault(code, handled)) {
      ev.preventDefault();
    }
  }

  function refresh() {
    var keepFocus = state.focusId;
    loadApps(function () {
      loadSources(function () {
        state.focusId = keepFocus;
        renderAll();
      });
    });
  }

  function init() {
    state.favouriteIds = readFavouritesFromStorage();
    $('btnEdit').setAttribute('data-focus-id', FOCUS_EDIT);
    $('btnEdit').addEventListener('click', toggleEditMode);
    $('apps').addEventListener('click', onAppsGridClick);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    });

    loadApps(function () {
      loadSources(function () {
        state.focusId = FOCUS_EDIT;
        renderAll();
      });
    });
  }

  window.__launcher = {
    getState: function () { return state; },
    buildFocusRows: buildFocusRows,
    navigate: navigate,
    setFocus: setFocus,
    renderAll: renderAll,
    refresh: refresh,
    onKeyDown: onKeyDown
  };

  window.onerror = function (msg) {
    showToast(String(msg).slice(0, 80));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
