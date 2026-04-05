// ============================================================
// WeightClassData.js — Weight class definitions (1-12)
// ============================================================

import { WEIGHT_CLASS } from './Constants.js';

/**
 * Returns the weight class data for a given ball weight (1-12).
 * @param {number} weight - Ball weight (1-12)
 * @returns {object} Class properties
 */
export function getWeightClass(weight) {
  const w = Math.max(1, Math.min(12, Math.round(weight)));

  if (w <= 4) {
    // Class 1: Balloon / Flying
    return {
      weight: w,
      class: WEIGHT_CLASS.BALLOON,
      className: 'Balloon',
      mass: w * 0.8,
      friction: 0.001,
      frictionAir: 0.015 + (w * 0.003),
      restitution: 0.75 - (w * 0.02),
      maxHP: w <= 2 ? 1 : 2,
      abyssImmune: true,
      waterImmune: true,
      spikeImmune: false,
      fanAffected: true,
      streamAffected: false,
      spikeHitsToPerish: w <= 2 ? 1 : 2,
      color: getWeightColor(w),
      radiusScale: 0.7 + (w * 0.03),
    };
  } else if (w <= 8) {
    // Class 2: Wooden
    return {
      weight: w,
      class: WEIGHT_CLASS.WOODEN,
      className: 'Wooden',
      mass: w * 1.2,
      friction: 0.01 + ((w - 5) * 0.005),
      frictionAir: 0.03 + ((w - 5) * 0.005),
      restitution: 0.5 - ((w - 5) * 0.03),
      maxHP: 3,
      abyssImmune: false,
      waterImmune: false,  // floats (handled specially)
      spikeImmune: false,
      fanAffected: false,
      streamAffected: true,
      spikeHitsToPerish: 3,
      floatsInWater: true,
      color: getWeightColor(w),
      radiusScale: 0.82 + ((w - 5) * 0.04),
    };
  } else {
    // Class 3: Heavy
    return {
      weight: w,
      class: WEIGHT_CLASS.HEAVY,
      className: 'Heavy',
      mass: w * 1.8,
      friction: 0.02 + ((w - 9) * 0.008),
      frictionAir: 0.04 + ((w - 9) * 0.008),
      restitution: 0.3 - ((w - 9) * 0.03),
      maxHP: Infinity,
      abyssImmune: false,
      waterImmune: false,
      spikeImmune: true,
      fanAffected: false,
      streamAffected: false,
      spikeHitsToPerish: Infinity,
      color: getWeightColor(w),
      radiusScale: 0.95 + ((w - 9) * 0.04),
    };
  }
}

/**
 * Returns a color tint based on weight
 */
function getWeightColor(weight) {
  // Light colors for light balls, darker for heavy
  const colors = [
    0xffffff, // 1 - white
    0xe0f7fa, // 2 - very light cyan
    0xb2ebf2, // 3 - light cyan
    0x80deea, // 4 - cyan
    0xc8a86e, // 5 - light wood
    0xb08850, // 6 - medium wood
    0x8d6e3f, // 7 - dark wood
    0x6d5230, // 8 - darker wood
    0x78909c, // 9 - blue grey
    0x607d8b, // 10 - dark blue grey
    0x455a64, // 11 - darker
    0x37474f, // 12 - darkest
  ];
  return colors[weight - 1] || 0xffffff;
}

/**
 * Get all weight class definitions in a flat array
 */
export function getAllWeightClasses() {
  const result = [];
  for (let w = 1; w <= 12; w++) {
    result.push(getWeightClass(w));
  }
  return result;
}
