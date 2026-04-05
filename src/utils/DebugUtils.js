// ============================================================
// DebugUtils.js — Debug overlays, physics visualization
// ============================================================

let debugEnabled = false;

export function isDebugEnabled() {
  return debugEnabled;
}

export function setDebugEnabled(enabled) {
  debugEnabled = enabled;
}

export function initDebug() {
  const params = new URLSearchParams(window.location.search);
  debugEnabled = params.get('debug') === 'true';
}

export function debugLog(...args) {
  if (debugEnabled) {
    console.log('[DEBUG]', ...args);
  }
}

export function debugDrawGrid(graphics, gridWidth, gridHeight, tilePixelSize, wallThickness) {
  if (!debugEnabled) return;

  graphics.lineStyle(1, 0x333333, 0.3);
  for (let col = 0; col <= gridWidth; col++) {
    const x = wallThickness + col * tilePixelSize;
    graphics.lineBetween(x, wallThickness, x, wallThickness + gridHeight * tilePixelSize);
  }
  for (let row = 0; row <= gridHeight; row++) {
    const y = wallThickness + row * tilePixelSize;
    graphics.lineBetween(wallThickness, y, wallThickness + gridWidth * tilePixelSize, y);
  }
}
