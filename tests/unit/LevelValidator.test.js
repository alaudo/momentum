// ============================================================
// LevelValidator.test.js — Level playability validation
// ============================================================

import { describe, it, expect } from 'vitest';
import LevelValidator from '../../src/level/LevelValidator.js';
import TileGrid from '../../src/level/TileGrid.js';
import { TERRAIN } from '../../src/config/Constants.js';
import { gridToWorld } from '../../src/utils/CoordinateUtils.js';

function makeBallAtGrid(col, row, owner = 'player') {
  const pos = gridToWorld(col, row);
  return { x: pos.x, y: pos.y, owner };
}

describe('LevelValidator', () => {
  // ----------------------------------------
  // Valid levels
  // ----------------------------------------
  describe('valid levels', () => {
    it('should validate a simple valid level', () => {
      const grid = new TileGrid(5, 5);
      const playerBalls = [makeBallAtGrid(0, 0, 'player')];
      const enemyBalls = [makeBallAtGrid(4, 4, 'enemy')];

      const result = LevelValidator.validate({ grid, playerBalls, enemyBalls });
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  // ----------------------------------------
  // Missing balls
  // ----------------------------------------
  describe('missing balls', () => {
    it('should fail with no player balls', () => {
      const grid = new TileGrid(5, 5);
      const result = LevelValidator.validate({
        grid,
        playerBalls: [],
        enemyBalls: [makeBallAtGrid(2, 2, 'enemy')],
      });
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No player balls');
    });

    it('should fail with no enemy balls', () => {
      const grid = new TileGrid(5, 5);
      const result = LevelValidator.validate({
        grid,
        playerBalls: [makeBallAtGrid(0, 0, 'player')],
        enemyBalls: [],
      });
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No enemy balls');
    });

    it('should fail with null playerBalls', () => {
      const grid = new TileGrid(5, 5);
      const result = LevelValidator.validate({
        grid,
        playerBalls: null,
        enemyBalls: [makeBallAtGrid(2, 2, 'enemy')],
      });
      expect(result.valid).toBe(false);
    });
  });

  // ----------------------------------------
  // Balls on solid tiles
  // ----------------------------------------
  describe('balls on solid tiles', () => {
    it('should fail when a ball is on a bouncy tile (solid)', () => {
      const grid = new TileGrid(5, 5);
      grid.setTile(0, 0, TERRAIN.BOUNCY_ROUND);
      const playerBalls = [makeBallAtGrid(0, 0, 'player')];
      const enemyBalls = [makeBallAtGrid(4, 4, 'enemy')];

      const result = LevelValidator.validate({ grid, playerBalls, enemyBalls });
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('solid tile'))).toBe(true);
    });
  });

  // ----------------------------------------
  // Reachability
  // ----------------------------------------
  describe('reachability', () => {
    it('should fail when player cannot reach any enemy', () => {
      const grid = new TileGrid(5, 5);
      // Block the middle with solid tiles
      for (let r = 0; r < 5; r++) {
        grid.setTile(2, r, TERRAIN.BOUNCY_ROUND);
      }
      const playerBalls = [makeBallAtGrid(0, 0, 'player')];
      const enemyBalls = [makeBallAtGrid(4, 4, 'enemy')];

      const result = LevelValidator.validate({ grid, playerBalls, enemyBalls });
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Player cannot reach any enemy ball');
    });

    it('should pass when player can reach enemy through hazard tiles', () => {
      const grid = new TileGrid(5, 5);
      // Fill middle row with abyss (walkable, not solid)
      for (let c = 0; c < 5; c++) {
        grid.setTile(c, 2, TERRAIN.ABYSS);
      }
      const playerBalls = [makeBallAtGrid(0, 0, 'player')];
      const enemyBalls = [makeBallAtGrid(4, 4, 'enemy')];

      const result = LevelValidator.validate({ grid, playerBalls, enemyBalls });
      expect(result.valid).toBe(true);
    });
  });
});
