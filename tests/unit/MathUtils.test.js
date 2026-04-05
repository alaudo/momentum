// ============================================================
// MathUtils.test.js — Unit tests for vector ops, clamping, interpolation
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  clamp, lerp, distance, angleBetween,
  vectorFromAngle, vectorMagnitude, normalizeVector,
  dotProduct, mapRange,
} from '../../src/utils/MathUtils.js';

describe('MathUtils', () => {
  // ----------------------------------------
  // clamp
  // ----------------------------------------
  describe('clamp', () => {
    it('should return the value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should return min when value is below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should return max when value is above range', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle equal min and max', () => {
      expect(clamp(5, 3, 3)).toBe(3);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-20, -10, -1)).toBe(-10);
    });

    it('should handle zero min/max', () => {
      expect(clamp(-1, 0, 100)).toBe(0);
      expect(clamp(0, 0, 0)).toBe(0);
    });

    it('should handle boundary values exactly', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  // ----------------------------------------
  // lerp
  // ----------------------------------------
  describe('lerp', () => {
    it('should return a when t = 0', () => {
      expect(lerp(10, 20, 0)).toBe(10);
    });

    it('should return b when t = 1', () => {
      expect(lerp(10, 20, 1)).toBe(20);
    });

    it('should return midpoint when t = 0.5', () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
    });

    it('should work with negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
    });

    it('should work with t values beyond 0-1', () => {
      expect(lerp(0, 10, 2)).toBe(20);
      expect(lerp(0, 10, -1)).toBe(-10);
    });

    it('should handle identical a and b', () => {
      expect(lerp(5, 5, 0.5)).toBe(5);
    });
  });

  // ----------------------------------------
  // distance
  // ----------------------------------------
  describe('distance', () => {
    it('should return 0 for identical points', () => {
      expect(distance(5, 5, 5, 5)).toBe(0);
    });

    it('should compute horizontal distance', () => {
      expect(distance(0, 0, 3, 0)).toBe(3);
    });

    it('should compute vertical distance', () => {
      expect(distance(0, 0, 0, 4)).toBe(4);
    });

    it('should compute diagonal distance (3-4-5 triangle)', () => {
      expect(distance(0, 0, 3, 4)).toBe(5);
    });

    it('should be symmetric', () => {
      expect(distance(1, 2, 3, 4)).toBe(distance(3, 4, 1, 2));
    });

    it('should handle negative coordinates', () => {
      expect(distance(-3, -4, 0, 0)).toBe(5);
    });
  });

  // ----------------------------------------
  // angleBetween
  // ----------------------------------------
  describe('angleBetween', () => {
    it('should return 0 for a point to the right', () => {
      expect(angleBetween(0, 0, 1, 0)).toBe(0);
    });

    it('should return PI/2 for a point directly below', () => {
      expect(angleBetween(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2);
    });

    it('should return PI (or -PI) for a point to the left', () => {
      expect(Math.abs(angleBetween(0, 0, -1, 0))).toBeCloseTo(Math.PI);
    });

    it('should return -PI/2 for a point directly above', () => {
      expect(angleBetween(0, 0, 0, -1)).toBeCloseTo(-Math.PI / 2);
    });

    it('should work with non-origin start points', () => {
      expect(angleBetween(5, 5, 6, 5)).toBe(0);
    });
  });

  // ----------------------------------------
  // vectorFromAngle
  // ----------------------------------------
  describe('vectorFromAngle', () => {
    it('should produce a rightward unit vector at angle 0', () => {
      const v = vectorFromAngle(0, 1);
      expect(v.x).toBeCloseTo(1);
      expect(v.y).toBeCloseTo(0);
    });

    it('should produce a downward vector at PI/2', () => {
      const v = vectorFromAngle(Math.PI / 2, 1);
      expect(v.x).toBeCloseTo(0);
      expect(v.y).toBeCloseTo(1);
    });

    it('should scale by magnitude', () => {
      const v = vectorFromAngle(0, 5);
      expect(v.x).toBeCloseTo(5);
      expect(v.y).toBeCloseTo(0);
    });

    it('should produce zero vector with magnitude 0', () => {
      const v = vectorFromAngle(Math.PI / 4, 0);
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });
  });

  // ----------------------------------------
  // vectorMagnitude
  // ----------------------------------------
  describe('vectorMagnitude', () => {
    it('should return 0 for zero vector', () => {
      expect(vectorMagnitude(0, 0)).toBe(0);
    });

    it('should compute magnitude of a 3-4-5 vector', () => {
      expect(vectorMagnitude(3, 4)).toBe(5);
    });

    it('should handle negative components', () => {
      expect(vectorMagnitude(-3, -4)).toBe(5);
    });

    it('should handle unit vectors', () => {
      expect(vectorMagnitude(1, 0)).toBe(1);
      expect(vectorMagnitude(0, 1)).toBe(1);
    });
  });

  // ----------------------------------------
  // normalizeVector
  // ----------------------------------------
  describe('normalizeVector', () => {
    it('should return zero vector for zero input', () => {
      const v = normalizeVector(0, 0);
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it('should produce a unit vector from (3, 4)', () => {
      const v = normalizeVector(3, 4);
      expect(v.x).toBeCloseTo(0.6);
      expect(v.y).toBeCloseTo(0.8);
    });

    it('should produce magnitude 1 for any non-zero input', () => {
      const v = normalizeVector(10, 20);
      const mag = Math.sqrt(v.x * v.x + v.y * v.y);
      expect(mag).toBeCloseTo(1);
    });

    it('should handle negative values', () => {
      const v = normalizeVector(-3, -4);
      expect(v.x).toBeCloseTo(-0.6);
      expect(v.y).toBeCloseTo(-0.8);
    });
  });

  // ----------------------------------------
  // dotProduct
  // ----------------------------------------
  describe('dotProduct', () => {
    it('should return 0 for perpendicular vectors', () => {
      expect(dotProduct(1, 0, 0, 1)).toBe(0);
    });

    it('should return positive for same direction', () => {
      expect(dotProduct(1, 0, 1, 0)).toBe(1);
    });

    it('should return negative for opposite direction', () => {
      expect(dotProduct(1, 0, -1, 0)).toBe(-1);
    });

    it('should compute correctly for general vectors', () => {
      expect(dotProduct(2, 3, 4, 5)).toBe(2 * 4 + 3 * 5);
    });
  });

  // ----------------------------------------
  // mapRange
  // ----------------------------------------
  describe('mapRange', () => {
    it('should map 0 from [0,1] to [0,100]', () => {
      expect(mapRange(0, 0, 1, 0, 100)).toBe(0);
    });

    it('should map 1 from [0,1] to [0,100]', () => {
      expect(mapRange(1, 0, 1, 0, 100)).toBe(100);
    });

    it('should map midpoint correctly', () => {
      expect(mapRange(0.5, 0, 1, 0, 100)).toBe(50);
    });

    it('should handle inverted output range', () => {
      expect(mapRange(0, 0, 1, 100, 0)).toBe(100);
      expect(mapRange(1, 0, 1, 100, 0)).toBe(0);
    });

    it('should handle values outside input range', () => {
      expect(mapRange(2, 0, 1, 0, 100)).toBe(200);
    });

    it('should map difficulty 1 to grid size 5', () => {
      // Simulating the level generator formula
      const size = Math.round(mapRange(0, 0, 1, 5, 14));
      expect(size).toBe(5);
    });
  });
});
