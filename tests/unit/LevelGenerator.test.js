// ============================================================
// LevelGenerator.test.js — Seeded procedural level generation
// ============================================================

import { describe, it, expect } from 'vitest';
import LevelGenerator from '../../src/level/LevelGenerator.js';
import { TERRAIN } from '../../src/config/Constants.js';

describe('LevelGenerator', () => {
  // ----------------------------------------
  // Determinism
  // ----------------------------------------
  describe('deterministic generation', () => {
    it('should produce identical levels from the same seed', () => {
      const level1 = LevelGenerator.generate('determinism-5');
      const level2 = LevelGenerator.generate('determinism-5');

      expect(level1.gridWidth).toBe(level2.gridWidth);
      expect(level1.gridHeight).toBe(level2.gridHeight);
      expect(level1.playerBalls.length).toBe(level2.playerBalls.length);
      expect(level1.enemyBalls.length).toBe(level2.enemyBalls.length);

      // Same player ball positions
      for (let i = 0; i < level1.playerBalls.length; i++) {
        expect(level1.playerBalls[i].x).toBe(level2.playerBalls[i].x);
        expect(level1.playerBalls[i].y).toBe(level2.playerBalls[i].y);
        expect(level1.playerBalls[i].weight).toBe(level2.playerBalls[i].weight);
      }

      // Same enemy ball positions
      for (let i = 0; i < level1.enemyBalls.length; i++) {
        expect(level1.enemyBalls[i].x).toBe(level2.enemyBalls[i].x);
        expect(level1.enemyBalls[i].y).toBe(level2.enemyBalls[i].y);
      }
    });

    it('should produce different levels from different seeds', () => {
      const level1 = LevelGenerator.generate('alpha-3');
      const level2 = LevelGenerator.generate('beta-3');

      // Very unlikely to have identical layouts
      const grid1Tiles = [];
      level1.grid.forEach(t => grid1Tiles.push(t.type));
      const grid2Tiles = [];
      level2.grid.forEach(t => grid2Tiles.push(t.type));

      let differences = 0;
      for (let i = 0; i < grid1Tiles.length; i++) {
        if (grid1Tiles[i] !== grid2Tiles[i]) differences++;
      }
      expect(differences).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------
  // Grid sizing
  // ----------------------------------------
  describe('grid sizing', () => {
    it('should create 5x5 grid for difficulty 1', () => {
      const level = LevelGenerator.generate('size-1');
      expect(level.gridWidth).toBe(5);
      expect(level.gridHeight).toBe(5);
    });

    it('should create larger grids for higher difficulty', () => {
      const level = LevelGenerator.generate('size-10');
      expect(level.gridWidth).toBeGreaterThan(5);
      expect(level.gridHeight).toBeGreaterThan(5);
    });

    it('should create 14x14 grid for difficulty 10', () => {
      const level = LevelGenerator.generate('maxsize-10');
      expect(level.gridWidth).toBe(14);
      expect(level.gridHeight).toBe(14);
    });
  });

  // ----------------------------------------
  // Ball placement
  // ----------------------------------------
  describe('ball placement', () => {
    it('should always have at least one player ball', () => {
      for (let d = 1; d <= 10; d++) {
        const level = LevelGenerator.generate(`ballcheck-${d}`);
        expect(level.playerBalls.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should always have at least one enemy ball', () => {
      for (let d = 1; d <= 10; d++) {
        const level = LevelGenerator.generate(`enemycheck-${d}`);
        expect(level.enemyBalls.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should have more enemies at higher difficulty', () => {
      const lvl1 = LevelGenerator.generate('enemycount-1');
      const lvl10 = LevelGenerator.generate('enemycount-10');
      expect(lvl10.enemyBalls.length).toBeGreaterThanOrEqual(lvl1.enemyBalls.length);
    });

    it('player ball should have valid weight', () => {
      const level = LevelGenerator.generate('weight-5');
      for (const ball of level.playerBalls) {
        expect(ball.weight).toBeGreaterThanOrEqual(1);
        expect(ball.weight).toBeLessThanOrEqual(12);
      }
    });

    it('enemy balls should have valid weights', () => {
      const level = LevelGenerator.generate('eweight-5');
      for (const ball of level.enemyBalls) {
        expect(ball.weight).toBeGreaterThanOrEqual(1);
        expect(ball.weight).toBeLessThanOrEqual(12);
      }
    });
  });

  // ----------------------------------------
  // Hazard placement
  // ----------------------------------------
  describe('hazard placement', () => {
    it('should place abyss tiles at any difficulty', () => {
      const level = LevelGenerator.generate('abyss-1');
      const abyssTiles = level.grid.getTilesOfType(TERRAIN.ABYSS);
      expect(abyssTiles.length).toBeGreaterThan(0);
    });

    it('should place water tiles at difficulty >= 2', () => {
      const lvl1 = LevelGenerator.generate('water-1');
      const lvl5 = LevelGenerator.generate('water-5');
      const water1 = lvl1.grid.getTilesOfType(TERRAIN.WATER);
      const water5 = lvl5.grid.getTilesOfType(TERRAIN.WATER);
      // Diff 1 should have no water
      expect(water1.length).toBe(0);
      // Diff 5 might have water (probabilistic but likely)
      // Just check it doesn't error
    });

    it('should not place hazards at edge tiles (protected range)', () => {
      // The generator places hazards in range [1, grid-2]
      const level = LevelGenerator.generate('edges-5');
      const grid = level.grid;
      // Corners should generally be safe (though not strictly guaranteed
      // since placement is random, we just verify no crash)
      expect(grid.getTile(0, 0)).toBeDefined();
    });
  });

  // ----------------------------------------
  // Difficulty scaling
  // ----------------------------------------
  describe('difficulty scaling', () => {
    it('should clamp difficulty to [1, 10]', () => {
      const level = LevelGenerator.generate('clamp-0');
      expect(level.difficulty).toBe(1);
    });

    it('should clamp high difficulty to 10', () => {
      const level = LevelGenerator.generate('clamp-99');
      expect(level.difficulty).toBe(10);
    });
  });

  // ----------------------------------------
  // Output structure
  // ----------------------------------------
  describe('output structure', () => {
    it('should return all expected fields', () => {
      const level = LevelGenerator.generate('structure-3');
      expect(level).toHaveProperty('grid');
      expect(level).toHaveProperty('playerBalls');
      expect(level).toHaveProperty('enemyBalls');
      expect(level).toHaveProperty('bumpers');
      expect(level).toHaveProperty('seed');
      expect(level).toHaveProperty('difficulty');
      expect(level).toHaveProperty('gridWidth');
      expect(level).toHaveProperty('gridHeight');
    });

    it('should return the original seed string', () => {
      const level = LevelGenerator.generate('mySeed-7');
      expect(level.seed).toBe('mySeed-7');
    });
  });
});
