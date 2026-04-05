// ============================================================
// TileGrid.test.js — Grid data structure tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import TileGrid from '../../src/level/TileGrid.js';
import { TERRAIN } from '../../src/config/Constants.js';

describe('TileGrid', () => {
  let grid;

  beforeEach(() => {
    grid = new TileGrid(5, 5);
  });

  // ----------------------------------------
  // Constructor
  // ----------------------------------------
  describe('constructor', () => {
    it('should create a grid with correct dimensions', () => {
      expect(grid.width).toBe(5);
      expect(grid.height).toBe(5);
    });

    it('should initialize all tiles as SAFE ground', () => {
      grid.forEach((tile) => {
        expect(tile.type).toBe(TERRAIN.SAFE);
      });
    });

    it('should have correct row/col on each tile', () => {
      const tile = grid.getTile(3, 2);
      expect(tile.col).toBe(3);
      expect(tile.row).toBe(2);
    });
  });

  // ----------------------------------------
  // getTile / setTile
  // ----------------------------------------
  describe('getTile / setTile', () => {
    it('should get tile at valid position', () => {
      const tile = grid.getTile(0, 0);
      expect(tile).toBeDefined();
      expect(tile.type).toBe(TERRAIN.SAFE);
    });

    it('should return null for out-of-bounds positions', () => {
      expect(grid.getTile(-1, 0)).toBeNull();
      expect(grid.getTile(0, -1)).toBeNull();
      expect(grid.getTile(5, 0)).toBeNull();
      expect(grid.getTile(0, 5)).toBeNull();
    });

    it('should set tile type', () => {
      grid.setTile(2, 2, TERRAIN.WATER);
      expect(grid.getTile(2, 2).type).toBe(TERRAIN.WATER);
    });

    it('should set tile with metadata', () => {
      grid.setTile(1, 1, TERRAIN.MODIFIER_PAD, { modifierDelta: 3 });
      const tile = grid.getTile(1, 1);
      expect(tile.type).toBe(TERRAIN.MODIFIER_PAD);
      expect(tile.metadata.modifierDelta).toBe(3);
    });

    it('should merge metadata on setTile', () => {
      grid.setTile(1, 1, TERRAIN.SAFE, { hasBumper: true });
      grid.setTile(1, 1, TERRAIN.SAFE, { extra: 'data' });
      const tile = grid.getTile(1, 1);
      expect(tile.metadata.hasBumper).toBe(true);
      expect(tile.metadata.extra).toBe('data');
    });

    it('should silently ignore setTile for out-of-bounds', () => {
      expect(() => grid.setTile(-1, 0, TERRAIN.ABYSS)).not.toThrow();
    });
  });

  // ----------------------------------------
  // getTerrainAt
  // ----------------------------------------
  describe('getTerrainAt', () => {
    it('should return terrain definition for the tile', () => {
      grid.setTile(1, 1, TERRAIN.ABYSS);
      const def = grid.getTerrainAt(1, 1);
      expect(def.isHazard).toBe(true);
      expect(def.hazardType).toBe('abyss');
    });

    it('should default to SAFE for out-of-bounds', () => {
      const def = grid.getTerrainAt(-1, -1);
      expect(def.id).toBe(TERRAIN.SAFE);
    });
  });

  // ----------------------------------------
  // forEach
  // ----------------------------------------
  describe('forEach', () => {
    it('should iterate all tiles', () => {
      let count = 0;
      grid.forEach(() => count++);
      expect(count).toBe(25); // 5x5
    });

    it('should pass tile, col, row to callback', () => {
      const positions = [];
      grid.forEach((tile, col, row) => {
        positions.push({ col, row });
      });
      expect(positions).toContainEqual({ col: 0, row: 0 });
      expect(positions).toContainEqual({ col: 4, row: 4 });
    });
  });

  // ----------------------------------------
  // getTilesOfType
  // ----------------------------------------
  describe('getTilesOfType', () => {
    it('should return all tiles of specified type', () => {
      grid.setTile(0, 0, TERRAIN.ABYSS);
      grid.setTile(1, 1, TERRAIN.ABYSS);
      grid.setTile(2, 2, TERRAIN.WATER);
      const abyssTiles = grid.getTilesOfType(TERRAIN.ABYSS);
      expect(abyssTiles).toHaveLength(2);
    });

    it('should return empty array when no tiles of type exist', () => {
      expect(grid.getTilesOfType(TERRAIN.SPIKES)).toHaveLength(0);
    });
  });

  // ----------------------------------------
  // getSafeTiles
  // ----------------------------------------
  describe('getSafeTiles', () => {
    it('should return only non-hazard, non-solid tiles', () => {
      grid.setTile(0, 0, TERRAIN.ABYSS);
      grid.setTile(1, 1, TERRAIN.BOUNCY_ROUND);
      const safe = grid.getSafeTiles();
      expect(safe).toHaveLength(23); // 25 - 2
    });

    it('should include sand and ice variants', () => {
      grid.setTile(0, 0, TERRAIN.SAFE_SAND);
      grid.setTile(1, 1, TERRAIN.SAFE_ICE);
      const safe = grid.getSafeTiles();
      expect(safe).toHaveLength(25);
    });
  });

  // ----------------------------------------
  // isWalkable
  // ----------------------------------------
  describe('isWalkable', () => {
    it('should return true for safe ground', () => {
      expect(grid.isWalkable(0, 0)).toBe(true);
    });

    it('should return true for hazard tiles (not solid)', () => {
      grid.setTile(0, 0, TERRAIN.ABYSS);
      expect(grid.isWalkable(0, 0)).toBe(true);
    });

    it('should return false for solid tiles (bouncers)', () => {
      grid.setTile(0, 0, TERRAIN.BOUNCY_ROUND);
      expect(grid.isWalkable(0, 0)).toBe(false);
    });

    it('should return false for out-of-bounds', () => {
      expect(grid.isWalkable(-1, 0)).toBe(false);
      expect(grid.isWalkable(5, 5)).toBe(false);
    });
  });

  // ----------------------------------------
  // floodFill
  // ----------------------------------------
  describe('floodFill', () => {
    it('should reach all tiles on an empty grid', () => {
      const visited = grid.floodFill(0, 0);
      expect(visited.size).toBe(25);
    });

    it('should not cross solid tiles', () => {
      // Create a wall of solid tiles at col 2
      for (let r = 0; r < 5; r++) {
        grid.setTile(2, r, TERRAIN.BOUNCY_ROUND);
      }
      const visited = grid.floodFill(0, 0);
      // Should only reach cols 0-1 (2 * 5 = 10 tiles)
      expect(visited.size).toBe(10);
    });

    it('should cross hazard tiles (not solid)', () => {
      grid.setTile(1, 0, TERRAIN.ABYSS);
      grid.setTile(2, 0, TERRAIN.WATER);
      const visited = grid.floodFill(0, 0);
      expect(visited.size).toBe(25);
    });

    it('should handle single-tile grid', () => {
      const tiny = new TileGrid(1, 1);
      const visited = tiny.floodFill(0, 0);
      expect(visited.size).toBe(1);
    });

    it('should handle starting on solid tile', () => {
      grid.setTile(0, 0, TERRAIN.BOUNCY_ROUND);
      const visited = grid.floodFill(0, 0);
      expect(visited.size).toBe(0);
    });
  });
});
