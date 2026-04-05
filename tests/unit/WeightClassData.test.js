// ============================================================
// WeightClassData.test.js — Weight class property lookups
// ============================================================

import { describe, it, expect } from 'vitest';
import { getWeightClass, getAllWeightClasses } from '../../src/config/WeightClassData.js';
import { WEIGHT_CLASS } from '../../src/config/Constants.js';

describe('WeightClassData', () => {
  // ----------------------------------------
  // Class 1: Balloon (1-4)
  // ----------------------------------------
  describe('Class 1: Balloon (weight 1-4)', () => {
    it.each([1, 2, 3, 4])('weight %i should be Balloon class', (w) => {
      const data = getWeightClass(w);
      expect(data.class).toBe(WEIGHT_CLASS.BALLOON);
      expect(data.className).toBe('Balloon');
    });

    it('should have correct mass formula (weight * 0.8)', () => {
      for (let w = 1; w <= 4; w++) {
        expect(getWeightClass(w).mass).toBeCloseTo(w * 0.8);
      }
    });

    it('should have low friction', () => {
      for (let w = 1; w <= 4; w++) {
        expect(getWeightClass(w).friction).toBe(0.001);
      }
    });

    it('should be immune to abyss and water', () => {
      for (let w = 1; w <= 4; w++) {
        const data = getWeightClass(w);
        expect(data.abyssImmune).toBe(true);
        expect(data.waterImmune).toBe(true);
      }
    });

    it('should NOT be immune to spikes', () => {
      for (let w = 1; w <= 4; w++) {
        expect(getWeightClass(w).spikeImmune).toBe(false);
      }
    });

    it('should be affected by fans but not streams', () => {
      for (let w = 1; w <= 4; w++) {
        const data = getWeightClass(w);
        expect(data.fanAffected).toBe(true);
        expect(data.streamAffected).toBe(false);
      }
    });

    it('weight 1-2 should die in 1 spike hit', () => {
      expect(getWeightClass(1).spikeHitsToPerish).toBe(1);
      expect(getWeightClass(2).spikeHitsToPerish).toBe(1);
      expect(getWeightClass(1).maxHP).toBe(1);
      expect(getWeightClass(2).maxHP).toBe(1);
    });

    it('weight 3-4 should die in 2 spike hits', () => {
      expect(getWeightClass(3).spikeHitsToPerish).toBe(2);
      expect(getWeightClass(4).spikeHitsToPerish).toBe(2);
      expect(getWeightClass(3).maxHP).toBe(2);
      expect(getWeightClass(4).maxHP).toBe(2);
    });

    it('restitution should decrease with weight', () => {
      const r1 = getWeightClass(1).restitution;
      const r4 = getWeightClass(4).restitution;
      expect(r1).toBeGreaterThan(r4);
    });
  });

  // ----------------------------------------
  // Class 2: Wooden (5-8)
  // ----------------------------------------
  describe('Class 2: Wooden (weight 5-8)', () => {
    it.each([5, 6, 7, 8])('weight %i should be Wooden class', (w) => {
      const data = getWeightClass(w);
      expect(data.class).toBe(WEIGHT_CLASS.WOODEN);
      expect(data.className).toBe('Wooden');
    });

    it('should have correct mass formula (weight * 1.2)', () => {
      for (let w = 5; w <= 8; w++) {
        expect(getWeightClass(w).mass).toBeCloseTo(w * 1.2);
      }
    });

    it('should NOT be immune to abyss or water', () => {
      for (let w = 5; w <= 8; w++) {
        const data = getWeightClass(w);
        expect(data.abyssImmune).toBe(false);
        expect(data.waterImmune).toBe(false);
      }
    });

    it('should float in water', () => {
      for (let w = 5; w <= 8; w++) {
        expect(getWeightClass(w).floatsInWater).toBe(true);
      }
    });

    it('should be affected by streams but not fans', () => {
      for (let w = 5; w <= 8; w++) {
        const data = getWeightClass(w);
        expect(data.fanAffected).toBe(false);
        expect(data.streamAffected).toBe(true);
      }
    });

    it('should die in 3 spike hits', () => {
      for (let w = 5; w <= 8; w++) {
        expect(getWeightClass(w).spikeHitsToPerish).toBe(3);
        expect(getWeightClass(w).maxHP).toBe(3);
      }
    });
  });

  // ----------------------------------------
  // Class 3: Heavy (9-12)
  // ----------------------------------------
  describe('Class 3: Heavy (weight 9-12)', () => {
    it.each([9, 10, 11, 12])('weight %i should be Heavy class', (w) => {
      const data = getWeightClass(w);
      expect(data.class).toBe(WEIGHT_CLASS.HEAVY);
      expect(data.className).toBe('Heavy');
    });

    it('should have correct mass formula (weight * 1.8)', () => {
      for (let w = 9; w <= 12; w++) {
        expect(getWeightClass(w).mass).toBeCloseTo(w * 1.8);
      }
    });

    it('should be immune to spikes', () => {
      for (let w = 9; w <= 12; w++) {
        expect(getWeightClass(w).spikeImmune).toBe(true);
      }
    });

    it('should NOT be immune to abyss or water', () => {
      for (let w = 9; w <= 12; w++) {
        const data = getWeightClass(w);
        expect(data.abyssImmune).toBe(false);
        expect(data.waterImmune).toBe(false);
      }
    });

    it('should not be affected by fans or streams', () => {
      for (let w = 9; w <= 12; w++) {
        const data = getWeightClass(w);
        expect(data.fanAffected).toBe(false);
        expect(data.streamAffected).toBe(false);
      }
    });

    it('should have infinite HP', () => {
      for (let w = 9; w <= 12; w++) {
        expect(getWeightClass(w).maxHP).toBe(Infinity);
        expect(getWeightClass(w).spikeHitsToPerish).toBe(Infinity);
      }
    });
  });

  // ----------------------------------------
  // Edge cases & clamping
  // ----------------------------------------
  describe('clamping & edge cases', () => {
    it('should clamp weight below 1 to weight 1', () => {
      const data = getWeightClass(0);
      expect(data.weight).toBe(1);
      expect(data.class).toBe(WEIGHT_CLASS.BALLOON);
    });

    it('should clamp weight above 12 to weight 12', () => {
      const data = getWeightClass(15);
      expect(data.weight).toBe(12);
      expect(data.class).toBe(WEIGHT_CLASS.HEAVY);
    });

    it('should round fractional weights', () => {
      const data = getWeightClass(4.6);
      expect(data.weight).toBe(5);
      expect(data.class).toBe(WEIGHT_CLASS.WOODEN);
    });

    it('should handle negative weights', () => {
      const data = getWeightClass(-3);
      expect(data.weight).toBe(1);
    });
  });

  // ----------------------------------------
  // getAllWeightClasses
  // ----------------------------------------
  describe('getAllWeightClasses', () => {
    it('should return 12 entries', () => {
      expect(getAllWeightClasses()).toHaveLength(12);
    });

    it('should cover all weights 1-12', () => {
      const all = getAllWeightClasses();
      for (let i = 0; i < 12; i++) {
        expect(all[i].weight).toBe(i + 1);
      }
    });

    it('should have correct class distribution (4 Balloon, 4 Wooden, 4 Heavy)', () => {
      const all = getAllWeightClasses();
      const balloons = all.filter(d => d.class === WEIGHT_CLASS.BALLOON);
      const wooden = all.filter(d => d.class === WEIGHT_CLASS.WOODEN);
      const heavy = all.filter(d => d.class === WEIGHT_CLASS.HEAVY);
      expect(balloons).toHaveLength(4);
      expect(wooden).toHaveLength(4);
      expect(heavy).toHaveLength(4);
    });
  });
});
