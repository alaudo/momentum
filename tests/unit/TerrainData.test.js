// ============================================================
// TerrainData.test.js — Terrain definitions & direction vectors
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTerrainDef, getDirectionVector } from '../../src/config/TerrainData.js';
import TERRAIN_DEFS from '../../src/config/TerrainData.js';
import { TERRAIN } from '../../src/config/Constants.js';

describe('TerrainData', () => {
  // ----------------------------------------
  // getTerrainDef
  // ----------------------------------------
  describe('getTerrainDef', () => {
    it('should return SAFE terrain definition', () => {
      const def = getTerrainDef(TERRAIN.SAFE);
      expect(def.id).toBe('safe');
      expect(def.isHazard).toBe(false);
      expect(def.friction).toBe(0.01);
      expect(def.isSolid).toBe(false);
    });

    it('should return SAFE_SAND with higher friction', () => {
      const def = getTerrainDef(TERRAIN.SAFE_SAND);
      expect(def.friction).toBe(0.05);
      expect(def.isHazard).toBe(false);
    });

    it('should return SAFE_ICE with very low friction', () => {
      const def = getTerrainDef(TERRAIN.SAFE_ICE);
      expect(def.friction).toBe(0.0005);
      expect(def.isHazard).toBe(false);
    });

    it('should identify ABYSS as hazard', () => {
      const def = getTerrainDef(TERRAIN.ABYSS);
      expect(def.isHazard).toBe(true);
      expect(def.hazardType).toBe('abyss');
    });

    it('should identify WATER as hazard', () => {
      const def = getTerrainDef(TERRAIN.WATER);
      expect(def.isHazard).toBe(true);
      expect(def.hazardType).toBe('water');
    });

    it('should identify SPIKES as hazard', () => {
      const def = getTerrainDef(TERRAIN.SPIKES);
      expect(def.isHazard).toBe(true);
      expect(def.hazardType).toBe('spikes');
    });

    it('should identify MODIFIER_PAD correctly', () => {
      const def = getTerrainDef(TERRAIN.MODIFIER_PAD);
      expect(def.isModifier).toBe(true);
      expect(def.isHazard).toBe(false);
    });

    it('should identify BOUNCY_ROUND as solid', () => {
      const def = getTerrainDef(TERRAIN.BOUNCY_ROUND);
      expect(def.isBouncy).toBe(true);
      expect(def.isSolid).toBe(true);
    });

    it('should identify BOUNCY_SQUARE as solid', () => {
      const def = getTerrainDef(TERRAIN.BOUNCY_SQUARE);
      expect(def.isBouncy).toBe(true);
      expect(def.isSolid).toBe(true);
    });

    it('should fallback to SAFE for unknown terrain types', () => {
      const def = getTerrainDef('unknown_type');
      expect(def.id).toBe(TERRAIN.SAFE);
    });
  });

  // ----------------------------------------
  // Fan terrain definitions
  // ----------------------------------------
  describe('fan terrain', () => {
    it.each(['n', 's', 'e', 'w'])('fan_%s should be a fan tile', (dir) => {
      const def = getTerrainDef(`fan_${dir}`);
      expect(def.isFan).toBe(true);
      expect(def.fanDirection).toBe(dir);
      expect(def.isHazard).toBe(false);
      expect(def.isSolid).toBe(false);
    });
  });

  // ----------------------------------------
  // Stream terrain definitions
  // ----------------------------------------
  describe('stream terrain', () => {
    it.each(['n', 's', 'e', 'w'])('stream_%s should be a stream tile', (dir) => {
      const def = getTerrainDef(`stream_${dir}`);
      expect(def.isStream).toBe(true);
      expect(def.streamDirection).toBe(dir);
      expect(def.isHazard).toBe(false);
      expect(def.isSolid).toBe(false);
    });
  });

  // ----------------------------------------
  // getDirectionVector
  // ----------------------------------------
  describe('getDirectionVector', () => {
    it('north should be (0, -1)', () => {
      const v = getDirectionVector('n');
      expect(v.x).toBe(0);
      expect(v.y).toBe(-1);
    });

    it('south should be (0, 1)', () => {
      const v = getDirectionVector('s');
      expect(v.x).toBe(0);
      expect(v.y).toBe(1);
    });

    it('east should be (1, 0)', () => {
      const v = getDirectionVector('e');
      expect(v.x).toBe(1);
      expect(v.y).toBe(0);
    });

    it('west should be (-1, 0)', () => {
      const v = getDirectionVector('w');
      expect(v.x).toBe(-1);
      expect(v.y).toBe(0);
    });

    it('should return zero vector for unknown direction', () => {
      const v = getDirectionVector('x');
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });
  });
});
