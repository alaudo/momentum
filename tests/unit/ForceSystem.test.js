// ============================================================
// ForceSystem.test.js — Force pool economy tests
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ForceSystem from '../../src/systems/ForceSystem.js';
import GameState from '../../src/state/GameState.js';
import { FORCE_MAX, FORCE_COST_MULTIPLIER, FORCE_REGEN_AMOUNT } from '../../src/config/Constants.js';

// Mock EventBus to prevent Phaser dependency
vi.mock('../../src/state/EventBus.js', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn(), removeAllListeners: vi.fn() },
}));

describe('ForceSystem', () => {
  let gameState;
  let forceSystem;

  beforeEach(() => {
    gameState = new GameState();
    forceSystem = new ForceSystem(gameState);
  });

  // ----------------------------------------
  // calculateCost
  // ----------------------------------------
  describe('calculateCost', () => {
    it('should calculate cost = power * weight * 0.8 * 10', () => {
      // power=1.0, weight=1 => 1 * 1 * 0.8 * 10 = 8
      expect(forceSystem.calculateCost(1.0, 1)).toBeCloseTo(8);
    });

    it('should scale linearly with power', () => {
      const halfPower = forceSystem.calculateCost(0.5, 5);
      const fullPower = forceSystem.calculateCost(1.0, 5);
      expect(fullPower).toBeCloseTo(halfPower * 2);
    });

    it('should scale linearly with weight', () => {
      const w3 = forceSystem.calculateCost(1.0, 3);
      const w6 = forceSystem.calculateCost(1.0, 6);
      expect(w6).toBeCloseTo(w3 * 2);
    });

    it('should return 0 for zero power', () => {
      expect(forceSystem.calculateCost(0, 10)).toBe(0);
    });

    it('should compute expensive cost for heavy balls at full power', () => {
      // power=1.0, weight=12 => 1 * 12 * 0.8 * 10 = 96
      const cost = forceSystem.calculateCost(1.0, 12);
      expect(cost).toBeCloseTo(96);
    });

    it('should compute cheap cost for light balls at low power', () => {
      // power=0.3, weight=1 => 0.3 * 1 * 0.8 * 10 = 2.4
      const cost = forceSystem.calculateCost(0.3, 1);
      expect(cost).toBeCloseTo(2.4);
    });
  });

  // ----------------------------------------
  // canAfford
  // ----------------------------------------
  describe('canAfford', () => {
    it('should return true when force pool is sufficient', () => {
      expect(forceSystem.canAfford(50)).toBe(true);
    });

    it('should return true when cost equals current force', () => {
      expect(forceSystem.canAfford(FORCE_MAX)).toBe(true);
    });

    it('should return false when cost exceeds force pool', () => {
      expect(forceSystem.canAfford(FORCE_MAX + 1)).toBe(false);
    });

    it('should respect active player force pool', () => {
      gameState.setForce(20);
      expect(forceSystem.canAfford(20)).toBe(true);
      expect(forceSystem.canAfford(21)).toBe(false);
    });
  });

  // ----------------------------------------
  // spend
  // ----------------------------------------
  describe('spend', () => {
    it('should deduct the cost from the force pool', () => {
      forceSystem.spend(30);
      expect(gameState.getForce()).toBe(FORCE_MAX - 30);
    });

    it('should not go below zero', () => {
      forceSystem.spend(200);
      expect(gameState.getForce()).toBe(0);
    });

    it('should track total force used', () => {
      forceSystem.spend(10);
      forceSystem.spend(20);
      expect(gameState.totalForceUsed).toBe(30);
    });

    it('should return remaining force', () => {
      const remaining = forceSystem.spend(40);
      expect(remaining).toBe(FORCE_MAX - 40);
    });
  });

  // ----------------------------------------
  // regen
  // ----------------------------------------
  describe('regen', () => {
    it('should add FORCE_REGEN_AMOUNT to the pool', () => {
      gameState.setForce(50);
      forceSystem.regen();
      expect(gameState.getForce()).toBe(50 + FORCE_REGEN_AMOUNT);
    });

    it('should cap at FORCE_MAX', () => {
      gameState.setForce(90);
      forceSystem.regen();
      expect(gameState.getForce()).toBe(FORCE_MAX);
    });

    it('should regen for a specific player', () => {
      gameState.forcePools.player2 = 30;
      forceSystem.regen('player2');
      expect(gameState.getForce('player2')).toBe(30 + FORCE_REGEN_AMOUNT);
    });
  });

  // ----------------------------------------
  // getForceRatio
  // ----------------------------------------
  describe('getForceRatio', () => {
    it('should return 1.0 at full force', () => {
      expect(forceSystem.getForceRatio()).toBe(1.0);
    });

    it('should return 0.0 at zero force', () => {
      gameState.setForce(0);
      expect(forceSystem.getForceRatio()).toBe(0.0);
    });

    it('should return 0.5 at half force', () => {
      gameState.setForce(FORCE_MAX / 2);
      expect(forceSystem.getForceRatio()).toBe(0.5);
    });
  });
});
