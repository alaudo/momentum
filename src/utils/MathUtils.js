// ============================================================
// MathUtils.js — Vector ops, clamping, interpolation
// ============================================================

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

export function vectorFromAngle(angle, magnitude) {
  return {
    x: Math.cos(angle) * magnitude,
    y: Math.sin(angle) * magnitude,
  };
}

export function vectorMagnitude(vx, vy) {
  return Math.sqrt(vx * vx + vy * vy);
}

export function normalizeVector(vx, vy) {
  const mag = vectorMagnitude(vx, vy);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: vx / mag, y: vy / mag };
}

export function dotProduct(ax, ay, bx, by) {
  return ax * bx + ay * by;
}

export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}
