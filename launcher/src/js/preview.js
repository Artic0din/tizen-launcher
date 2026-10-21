'use strict';

var FALLBACK_ICON = 'icon.png';

function fullScreenPreviewRect() {
  return ['0px', '0px', '1920px', '1080px'];
}

function validateTvWindowRect(rect) {
  if (!Array.isArray(rect)) {
    return { valid: false, errorName: 'TypeMismatchError' };
  }
  if (rect.length !== 4) {
    return { valid: false, errorName: 'TypeMismatchError' };
  }
  return { valid: true };
}

function iconLoadPlan(iconPath) {
  if (iconPath === undefined || iconPath === null || String(iconPath).trim() === '') {
    return { src: FALLBACK_ICON, remote: false };
  }
  var src = /^(file|https?|data):/.test(iconPath) ? iconPath : 'file://' + iconPath;
  return { src: src, remote: true };
}

var previewExports = {
  FALLBACK_ICON: FALLBACK_ICON,
  fullScreenPreviewRect: fullScreenPreviewRect,
  validateTvWindowRect: validateTvWindowRect,
  iconLoadPlan: iconLoadPlan
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = previewExports;
} else if (typeof window !== 'undefined') {
  window.FALLBACK_ICON = FALLBACK_ICON;
  window.fullScreenPreviewRect = fullScreenPreviewRect;
  window.validateTvWindowRect = validateTvWindowRect;
  window.iconLoadPlan = iconLoadPlan;
}
