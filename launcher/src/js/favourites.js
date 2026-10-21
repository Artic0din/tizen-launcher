'use strict';

var STORAGE_KEY = 'launcher.favourites.v1';

function pruneFavourites(favouriteIds, installedIds) {
  var installed = Object.create(null);
  installedIds.forEach(function (id) { installed[id] = true; });
  return favouriteIds.filter(function (id) { return installed[id]; });
}

function pinFavourite(favouriteIds, appId) {
  if (favouriteIds.indexOf(appId) >= 0) {
    return favouriteIds.slice();
  }
  return favouriteIds.concat([appId]);
}

function unpinFavourite(favouriteIds, appId) {
  return favouriteIds.filter(function (id) { return id !== appId; });
}

function togglePin(favouriteIds, appId) {
  if (favouriteIds.indexOf(appId) >= 0) {
    return unpinFavourite(favouriteIds, appId);
  }
  return pinFavourite(favouriteIds, appId);
}

function moveFavourite(favouriteIds, appId, direction) {
  var i = favouriteIds.indexOf(appId);
  if (i < 0) {
    return favouriteIds.slice();
  }
  var j = direction === 'left' ? i - 1 : i + 1;
  if (j < 0 || j >= favouriteIds.length) {
    return favouriteIds.slice();
  }
  var next = favouriteIds.slice();
  var swap = next[j];
  next[j] = next[i];
  next[i] = swap;
  return next;
}

var exportsObj = {
  STORAGE_KEY: STORAGE_KEY,
  pruneFavourites: pruneFavourites,
  pinFavourite: pinFavourite,
  unpinFavourite: unpinFavourite,
  togglePin: togglePin,
  moveFavourite: moveFavourite
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exportsObj;
} else if (typeof window !== 'undefined') {
  window.STORAGE_KEY = STORAGE_KEY;
  window.pruneFavourites = pruneFavourites;
  window.pinFavourite = pinFavourite;
  window.unpinFavourite = unpinFavourite;
  window.togglePin = togglePin;
  window.moveFavourite = moveFavourite;
}
