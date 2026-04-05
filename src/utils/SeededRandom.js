// ============================================================
// SeededRandom.js — seedrandom.js wrapper
// ============================================================

import seedrandom from 'seedrandom';

export default class SeededRandom {
  /**
   * @param {string} seed - Seed string, format: "{RandomString}-{DifficultyInt}"
   */
  constructor(seed) {
    this.seed = seed;
    this.rng = seedrandom(seed);
  }

  /** Returns next float in [0, 1) */
  next() {
    return this.rng();
  }

  /** Returns random integer in [min, max] inclusive */
  range(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns random float in [min, max) */
  rangeFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  /** Pick a random element from array */
  pick(array) {
    if (!array || array.length === 0) return undefined;
    return array[this.range(0, array.length - 1)];
  }

  /** Returns true with given probability (0-1) */
  chance(probability) {
    return this.next() < probability;
  }

  /** Fisher-Yates shuffle (in-place, returns array) */
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.range(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Parse seed format: "{string}-{difficulty}" */
  static parseSeed(seedString) {
    const parts = seedString.split('-');
    const difficulty = parseInt(parts[parts.length - 1], 10);
    const baseSeed = parts.slice(0, -1).join('-');
    if (isNaN(difficulty)) {
      return { baseSeed: seedString, difficulty: 1 };
    }
    return { baseSeed, difficulty };
  }
}
