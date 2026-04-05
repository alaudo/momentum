// ============================================================
// SeededRandom.test.js — Deterministic RNG tests
// ============================================================

import { describe, it, expect } from 'vitest';
import SeededRandom from '../../src/utils/SeededRandom.js';

describe('SeededRandom', () => {
  // ----------------------------------------
  // Determinism
  // ----------------------------------------
  describe('determinism', () => {
    it('should produce the same sequence for the same seed', () => {
      const rng1 = new SeededRandom('testSeed-3');
      const rng2 = new SeededRandom('testSeed-3');

      for (let i = 0; i < 50; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('should produce different sequences for different seeds', () => {
      const rng1 = new SeededRandom('seed1-1');
      const rng2 = new SeededRandom('seed2-1');

      let allSame = true;
      for (let i = 0; i < 10; i++) {
        if (rng1.next() !== rng2.next()) {
          allSame = false;
          break;
        }
      }
      expect(allSame).toBe(false);
    });
  });

  // ----------------------------------------
  // next()
  // ----------------------------------------
  describe('next', () => {
    it('should return values in [0, 1)', () => {
      const rng = new SeededRandom('bounds-1');
      for (let i = 0; i < 200; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  // ----------------------------------------
  // range()
  // ----------------------------------------
  describe('range', () => {
    it('should return integers in [min, max] inclusive', () => {
      const rng = new SeededRandom('range-1');
      const results = new Set();
      for (let i = 0; i < 500; i++) {
        const val = rng.range(1, 5);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(5);
        expect(Number.isInteger(val)).toBe(true);
        results.add(val);
      }
      // With 500 samples on a range of 5, we should hit all values
      expect(results.size).toBe(5);
    });

    it('should handle single-value range', () => {
      const rng = new SeededRandom('single-1');
      expect(rng.range(7, 7)).toBe(7);
    });
  });

  // ----------------------------------------
  // rangeFloat()
  // ----------------------------------------
  describe('rangeFloat', () => {
    it('should return floats in [min, max)', () => {
      const rng = new SeededRandom('float-1');
      for (let i = 0; i < 100; i++) {
        const val = rng.rangeFloat(2.0, 8.0);
        expect(val).toBeGreaterThanOrEqual(2.0);
        expect(val).toBeLessThan(8.0);
      }
    });
  });

  // ----------------------------------------
  // pick()
  // ----------------------------------------
  describe('pick', () => {
    it('should pick an element from the array', () => {
      const rng = new SeededRandom('pick-1');
      const arr = ['a', 'b', 'c', 'd'];
      for (let i = 0; i < 20; i++) {
        expect(arr).toContain(rng.pick(arr));
      }
    });

    it('should return undefined for empty array', () => {
      const rng = new SeededRandom('empty-1');
      expect(rng.pick([])).toBeUndefined();
    });

    it('should return undefined for null/undefined', () => {
      const rng = new SeededRandom('null-1');
      expect(rng.pick(null)).toBeUndefined();
      expect(rng.pick(undefined)).toBeUndefined();
    });

    it('should pick the only element from a single-element array', () => {
      const rng = new SeededRandom('one-1');
      expect(rng.pick([42])).toBe(42);
    });
  });

  // ----------------------------------------
  // chance()
  // ----------------------------------------
  describe('chance', () => {
    it('should always return false for probability 0', () => {
      const rng = new SeededRandom('zero-1');
      for (let i = 0; i < 50; i++) {
        expect(rng.chance(0)).toBe(false);
      }
    });

    it('should always return true for probability 1', () => {
      const rng = new SeededRandom('one-1');
      for (let i = 0; i < 50; i++) {
        expect(rng.chance(1)).toBe(true);
      }
    });

    it('should return a mix for probability 0.5 over many samples', () => {
      const rng = new SeededRandom('half-1');
      let trueCount = 0;
      const n = 1000;
      for (let i = 0; i < n; i++) {
        if (rng.chance(0.5)) trueCount++;
      }
      // Should be roughly 50% (+/- 10% tolerance)
      expect(trueCount).toBeGreaterThan(n * 0.35);
      expect(trueCount).toBeLessThan(n * 0.65);
    });
  });

  // ----------------------------------------
  // shuffle()
  // ----------------------------------------
  describe('shuffle', () => {
    it('should return all elements (no loss)', () => {
      const rng = new SeededRandom('shuffle-1');
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = rng.shuffle(original);
      expect(shuffled.sort((a, b) => a - b)).toEqual(original);
    });

    it('should not modify the original array', () => {
      const rng = new SeededRandom('shuffle-2');
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      rng.shuffle(original);
      expect(original).toEqual(copy);
    });

    it('should produce deterministic shuffles', () => {
      const rng1 = new SeededRandom('shuffle-det');
      const rng2 = new SeededRandom('shuffle-det');
      const arr = [1, 2, 3, 4, 5, 6, 7, 8];
      expect(rng1.shuffle(arr)).toEqual(rng2.shuffle(arr));
    });

    it('should handle empty array', () => {
      const rng = new SeededRandom('shuffle-e');
      expect(rng.shuffle([])).toEqual([]);
    });

    it('should handle single element', () => {
      const rng = new SeededRandom('shuffle-s');
      expect(rng.shuffle([42])).toEqual([42]);
    });
  });

  // ----------------------------------------
  // parseSeed()
  // ----------------------------------------
  describe('parseSeed', () => {
    it('should parse standard seed format', () => {
      const result = SeededRandom.parseSeed('alphaOmega-5');
      expect(result.baseSeed).toBe('alphaOmega');
      expect(result.difficulty).toBe(5);
    });

    it('should parse seed with difficulty 1', () => {
      const result = SeededRandom.parseSeed('testSeed-1');
      expect(result.baseSeed).toBe('testSeed');
      expect(result.difficulty).toBe(1);
    });

    it('should parse seed with difficulty 10', () => {
      const result = SeededRandom.parseSeed('abc-10');
      expect(result.baseSeed).toBe('abc');
      expect(result.difficulty).toBe(10);
    });

    it('should handle hyphens in base seed', () => {
      const result = SeededRandom.parseSeed('alpha-beta-3');
      expect(result.baseSeed).toBe('alpha-beta');
      expect(result.difficulty).toBe(3);
    });

    it('should default to difficulty 1 for non-numeric suffix', () => {
      const result = SeededRandom.parseSeed('noNumber');
      expect(result.baseSeed).toBe('noNumber');
      expect(result.difficulty).toBe(1);
    });
  });
});
