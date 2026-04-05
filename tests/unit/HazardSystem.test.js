// ============================================================
// HazardSystem.test.js — Hazard detection and resolution
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import HazardSystem from '../../src/systems/HazardSystem.js';
import GameState from '../../src/state/GameState.js';
import TileGrid from '../../src/level/TileGrid.js';
import { TERRAIN, WEIGHT_CLASS } from '../../src/config/Constants.js';
import { gridToWorld } from '../../src/utils/CoordinateUtils.js';
import { getWeightClass } from '../../src/config/WeightClassData.js';

// Mock EventBus
vi.mock('../../src/state/EventBus.js', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn(), removeAllListeners: vi.fn() },
}));

function makeBall(id, weight, owner, col, row) {
  const pos = gridToWorld(col, row);
  const weightData = getWeightClass(weight);
  return {
    id,
    owner,
    weight,
    weightData,
    hp: weightData.maxHP,
    maxHP: weightData.maxHP,
    isDestroyed: false,
    isFloating: false,
    radiusPixels: 18,
    get x() { return pos.x; },
    get y() { return pos.y; },
    body: { position: pos, velocity: { x: 0, y: 0 } },
    damage(amount) {
      this.hp -= amount;
      return this.hp <= 0;
    },
    destroy() { this.isDestroyed = true; },
  };
}

describe('HazardSystem', () => {
  let gameState;
  let hazardSystem;
  let mockEffects;

  beforeEach(() => {
    gameState = new GameState();
    gameState.grid = new TileGrid(5, 5);
    mockEffects = {
      abyssDeath: vi.fn(),
      waterDeath: vi.fn(),
      spikeDeath: vi.fn(),
      damageFlash: vi.fn(),
    };
    hazardSystem = new HazardSystem({
      matter: { body: { setVelocity: vi.fn(), set: vi.fn() } },
    }, gameState, mockEffects);
  });

  // ----------------------------------------
  // Abyss hazard
  // ----------------------------------------
  describe('abyss', () => {
    it('should destroy Class 2 (Wooden) balls on abyss', () => {
      gameState.grid.setTile(2, 2, TERRAIN.ABYSS);
      const ball = makeBall(1, 6, 'enemy', 2, 2); // weight 6 = Wooden
      gameState.addBall(ball);

      hazardSystem.checkHazards();
      hazardSystem.resolve();

      expect(ball.isDestroyed).toBe(true);
      expect(mockEffects.abyssDeath).toHaveBeenCalled();
    });

    it('should destroy Class 3 (Heavy) balls on abyss', () => {
      gameState.grid.setTile(2, 2, TERRAIN.ABYSS);
      const ball = makeBall(1, 10, 'enemy', 2, 2);
      gameState.addBall(ball);

      hazardSystem.checkHazards();
      hazardSystem.resolve();

      expect(ball.isDestroyed).toBe(true);
    });

    it('should NOT destroy Class 1 (Balloon) balls on abyss — flies over', () => {
      gameState.grid.setTile(2, 2, TERRAIN.ABYSS);
      const ball = makeBall(1, 2, 'player', 2, 2); // weight 2 = Balloon
      gameState.addBall(ball);

      hazardSystem.checkHazards();
      hazardSystem.resolve();

      expect(ball.isDestroyed).toBe(false);
    });
  });

  // ----------------------------------------
  // Water hazard
  // ----------------------------------------
  describe('water', () => {
    it('should NOT destroy Class 1 (Balloon) balls — flies over', () => {
      gameState.grid.setTile(2, 2, TERRAIN.WATER);
      const ball = makeBall(1, 1, 'player', 2, 2);
      gameState.addBall(ball);

      hazardSystem.checkHazards();
      hazardSystem.resolve();

      expect(ball.isDestroyed).toBe(false);
      expect(ball.isFloating).toBe(false);
    });

    it('should make Class 2 (Wooden) balls float', () => {
      gameState.grid.setTile(2, 2, TERRAIN.WATER);
      const ball = makeBall(1, 6, 'player', 2, 2);
      gameState.addBall(ball);

      hazardSystem.checkHazards();
      hazardSystem.resolve();

      expect(ball.isDestroyed).toBe(false);
      expect(ball.isFloating).toBe(true);
    });

    it('should destroy Class 3 (Heavy) balls in water — sinks', () => {
      gameState.grid.setTile(2, 2, TERRAIN.WATER);
      const ball = makeBall(1, 10, 'enemy', 2, 2);
      gameState.addBall(ball);

      hazardSystem.checkHazards();
      hazardSystem.resolve();

      expect(ball.isDestroyed).toBe(true);
      expect(mockEffects.waterDeath).toHaveBeenCalled();
    });
  });

  // ----------------------------------------
  // Spike hazard
  // ----------------------------------------
  describe('spikes', () => {
    it('should damage Class 1 balls (1 HP)', () => {
      gameState.grid.setTile(2, 2, TERRAIN.SPIKES);
      const ball = makeBall(1, 1, 'player', 2, 2); // maxHP = 1
      gameState.addBall(ball);

      hazardSystem.checkHazards();
      hazardSystem.resolve();

      expect(ball.isDestroyed).toBe(true);
    });

    it('should damage but not destroy Class 2 balls with 3 HP', () => {
      gameState.grid.setTile(2, 2, TERRAIN.SPIKES);
      const ball = makeBall(1, 6, 'player', 2, 2); // maxHP = 3
      gameState.addBall(ball);

      hazardSystem.checkHazards();
      hazardSystem.resolve();

      expect(ball.isDestroyed).toBe(false);
      expect(ball.hp).toBe(2);
    });

    it('should NOT damage Class 3 (Heavy) balls — immune to spikes', () => {
      gameState.grid.setTile(2, 2, TERRAIN.SPIKES);
      const ball = makeBall(1, 10, 'player', 2, 2);
      gameState.addBall(ball);

      hazardSystem.checkHazards();
      hazardSystem.resolve();

      expect(ball.isDestroyed).toBe(false);
      expect(ball.hp).toBe(Infinity);
    });
  });

  // ----------------------------------------
  // Score tracking
  // ----------------------------------------
  describe('score tracking', () => {
    it('should add score when enemy ball is destroyed', () => {
      gameState.grid.setTile(2, 2, TERRAIN.ABYSS);
      const ball = makeBall(1, 6, 'enemy', 2, 2);
      gameState.addBall(ball);

      hazardSystem.checkHazards();
      hazardSystem.resolve();

      expect(gameState.score).toBe(60); // weight 6 * 10
      expect(gameState.enemiesDestroyed).toBe(1);
    });

    it('should NOT add score when player ball is destroyed', () => {
      gameState.grid.setTile(2, 2, TERRAIN.ABYSS);
      const ball = makeBall(1, 6, 'player', 2, 2);
      gameState.addBall(ball);

      hazardSystem.checkHazards();
      hazardSystem.resolve();

      expect(gameState.score).toBe(0);
    });
  });

  // ----------------------------------------
  // Queue deduplication
  // ----------------------------------------
  describe('deduplication', () => {
    it('should not queue the same ball on the same tile twice', () => {
      gameState.grid.setTile(2, 2, TERRAIN.SPIKES);
      const ball = makeBall(1, 6, 'player', 2, 2);
      gameState.addBall(ball);

      hazardSystem.checkHazards();
      hazardSystem.checkHazards(); // called twice
      hazardSystem.resolve();

      // Should only take 1 damage (once), not 2
      expect(ball.hp).toBe(2);
    });
  });
});
