// ============================================================
// LevelLoader.test.js — Campaign level loading from JSON
// ============================================================

import { describe, it, expect } from 'vitest';
import LevelLoader from '../../src/level/LevelLoader.js';
import { TERRAIN } from '../../src/config/Constants.js';
import { gridToWorld, getTilePixelSize } from '../../src/utils/CoordinateUtils.js';

describe('LevelLoader', () => {
  const sampleLevelJSON = {
    gridWidth: 3,
    gridHeight: 3,
    tiles: [
      [TERRAIN.SAFE, TERRAIN.SAFE, TERRAIN.SAFE],
      [TERRAIN.SAFE, TERRAIN.WATER, TERRAIN.SAFE],
      [TERRAIN.SAFE, TERRAIN.SAFE, TERRAIN.ABYSS],
    ],
    playerBalls: [
      { gridCol: 0, gridRow: 0, weight: 3, owner: 'player' },
    ],
    enemyBalls: [
      { gridCol: 2, gridRow: 0, weight: 5 },
    ],
    bumpers: [
      { gridCol: 1, gridRow: 0, shape: 'circle' },
    ],
    missionType: 'clear_board',
    missionData: { targetScore: 100 },
  };

  // ----------------------------------------
  // Basic loading
  // ----------------------------------------
  describe('basic loading', () => {
    it('should create a TileGrid with correct dimensions', () => {
      const result = LevelLoader.load(sampleLevelJSON);
      expect(result.grid.width).toBe(3);
      expect(result.grid.height).toBe(3);
    });

    it('should load tile types correctly', () => {
      const result = LevelLoader.load(sampleLevelJSON);
      expect(result.grid.getTile(0, 0).type).toBe(TERRAIN.SAFE);
      expect(result.grid.getTile(1, 1).type).toBe(TERRAIN.WATER);
      expect(result.grid.getTile(2, 2).type).toBe(TERRAIN.ABYSS);
    });

    it('should return missionType', () => {
      const result = LevelLoader.load(sampleLevelJSON);
      expect(result.missionType).toBe('clear_board');
    });

    it('should default missionType to clear_board', () => {
      const result = LevelLoader.load({ gridWidth: 2, gridHeight: 2 });
      expect(result.missionType).toBe('clear_board');
    });
  });

  // ----------------------------------------
  // Coordinate conversion
  // ----------------------------------------
  describe('coordinate conversion', () => {
    it('should convert gridCol/gridRow to world x/y for player balls', () => {
      const result = LevelLoader.load(sampleLevelJSON);
      const expected = gridToWorld(0, 0, getTilePixelSize());
      expect(result.playerBalls[0].x).toBe(expected.x);
      expect(result.playerBalls[0].y).toBe(expected.y);
    });

    it('should convert gridCol/gridRow for enemy balls', () => {
      const result = LevelLoader.load(sampleLevelJSON);
      const expected = gridToWorld(2, 0, getTilePixelSize());
      expect(result.enemyBalls[0].x).toBe(expected.x);
      expect(result.enemyBalls[0].y).toBe(expected.y);
    });

    it('should convert gridCol/gridRow for bumpers', () => {
      const result = LevelLoader.load(sampleLevelJSON);
      const expected = gridToWorld(1, 0, getTilePixelSize());
      expect(result.bumpers[0].x).toBe(expected.x);
      expect(result.bumpers[0].y).toBe(expected.y);
    });

    it('should pass through pre-existing x/y coordinates', () => {
      const level = {
        gridWidth: 3, gridHeight: 3,
        playerBalls: [{ x: 100, y: 200, weight: 1 }],
        enemyBalls: [],
      };
      const result = LevelLoader.load(level);
      expect(result.playerBalls[0].x).toBe(100);
      expect(result.playerBalls[0].y).toBe(200);
    });
  });

  // ----------------------------------------
  // Tile metadata
  // ----------------------------------------
  describe('tile metadata', () => {
    it('should handle object tile data with type and metadata', () => {
      const level = {
        gridWidth: 2, gridHeight: 1,
        tiles: [
          [
            { type: TERRAIN.MODIFIER_PAD, metadata: { modifierDelta: 2 } },
            TERRAIN.SAFE,
          ],
        ],
      };
      const result = LevelLoader.load(level);
      const tile = result.grid.getTile(0, 0);
      expect(tile.type).toBe(TERRAIN.MODIFIER_PAD);
      expect(tile.metadata.modifierDelta).toBe(2);
    });
  });

  // ----------------------------------------
  // Empty/missing data
  // ----------------------------------------
  describe('missing data handling', () => {
    it('should handle missing tiles array', () => {
      const result = LevelLoader.load({ gridWidth: 2, gridHeight: 2 });
      // All tiles should be default SAFE
      expect(result.grid.getTile(0, 0).type).toBe(TERRAIN.SAFE);
    });

    it('should handle missing ball arrays', () => {
      const result = LevelLoader.load({ gridWidth: 2, gridHeight: 2 });
      expect(result.playerBalls).toHaveLength(0);
      expect(result.enemyBalls).toHaveLength(0);
      expect(result.bumpers).toHaveLength(0);
    });
  });
});
