// ============================================================
// GameState.test.js — Central state container tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import GameState from '../../src/state/GameState.js';
import { TURN_STATE, GAME_MODE, FORCE_MAX } from '../../src/config/Constants.js';

describe('GameState', () => {
  let state;

  beforeEach(() => {
    state = new GameState();
  });

  // ----------------------------------------
  // Initial state
  // ----------------------------------------
  describe('initial state', () => {
    it('should start in ROGUE mode', () => {
      expect(state.mode).toBe(GAME_MODE.ROGUE);
    });

    it('should start with PLAYER_AIM turn state', () => {
      expect(state.turnState).toBe(TURN_STATE.PLAYER_AIM);
    });

    it('should start with player as active player', () => {
      expect(state.activePlayer).toBe('player');
    });

    it('should initialize force pools at FORCE_MAX', () => {
      expect(state.forcePools.player).toBe(FORCE_MAX);
      expect(state.forcePools.player2).toBe(FORCE_MAX);
      expect(state.forcePools.ai).toBe(FORCE_MAX);
    });

    it('should start with empty balls', () => {
      expect(state.balls.size).toBe(0);
      expect(state.playerBalls).toHaveLength(0);
      expect(state.enemyBalls).toHaveLength(0);
    });

    it('should have zero score', () => {
      expect(state.score).toBe(0);
      expect(state.enemiesDestroyed).toBe(0);
    });

    it('should not be game over', () => {
      expect(state.isGameOver).toBe(false);
      expect(state.winner).toBeNull();
    });
  });

  // ----------------------------------------
  // reset()
  // ----------------------------------------
  describe('reset', () => {
    it('should reset all state to defaults', () => {
      state.mode = GAME_MODE.SKIRMISH;
      state.score = 500;
      state.turnNumber = 10;
      state.isGameOver = true;

      state.reset();

      expect(state.mode).toBe(GAME_MODE.ROGUE);
      expect(state.score).toBe(0);
      expect(state.turnNumber).toBe(0);
      expect(state.isGameOver).toBe(false);
    });
  });

  // ----------------------------------------
  // Force pool management
  // ----------------------------------------
  describe('getForce / setForce', () => {
    it('should get force for the active player by default', () => {
      state.activePlayer = 'player';
      expect(state.getForce()).toBe(FORCE_MAX);
    });

    it('should get force for a specified player', () => {
      state.forcePools.ai = 50;
      expect(state.getForce('ai')).toBe(50);
    });

    it('should set force and clamp to [0, FORCE_MAX]', () => {
      state.setForce(50);
      expect(state.getForce()).toBe(50);
    });

    it('should clamp force to 0 minimum', () => {
      state.setForce(-10);
      expect(state.getForce()).toBe(0);
    });

    it('should clamp force to FORCE_MAX maximum', () => {
      state.setForce(200);
      expect(state.getForce()).toBe(FORCE_MAX);
    });

    it('should return 0 for unknown player', () => {
      expect(state.getForce('unknown_player')).toBe(0);
    });
  });

  // ----------------------------------------
  // Ball management
  // ----------------------------------------
  describe('addBall / removeBall', () => {
    const makeBall = (id, owner) => ({
      id,
      owner,
      isDestroyed: false,
    });

    it('should add a player ball', () => {
      const ball = makeBall(1, 'player');
      state.addBall(ball);
      expect(state.balls.size).toBe(1);
      expect(state.playerBalls).toContain(ball);
      expect(state.enemyBalls).not.toContain(ball);
    });

    it('should add a player2 ball to playerBalls', () => {
      const ball = makeBall(2, 'player2');
      state.addBall(ball);
      expect(state.playerBalls).toContain(ball);
    });

    it('should add an enemy ball', () => {
      const ball = makeBall(3, 'enemy');
      state.addBall(ball);
      expect(state.enemyBalls).toContain(ball);
      expect(state.playerBalls).not.toContain(ball);
    });

    it('should remove a ball', () => {
      const ball = makeBall(1, 'player');
      state.addBall(ball);
      state.removeBall(ball);
      expect(state.balls.size).toBe(0);
      expect(state.playerBalls).not.toContain(ball);
    });

    it('should handle removing a non-existent ball gracefully', () => {
      const ball = makeBall(999, 'player');
      expect(() => state.removeBall(ball)).not.toThrow();
    });
  });

  // ----------------------------------------
  // getAllBalls / getAliveBalls
  // ----------------------------------------
  describe('getAllBalls / getAliveBalls', () => {
    it('should return all balls as an array', () => {
      state.addBall({ id: 1, owner: 'player', isDestroyed: false });
      state.addBall({ id: 2, owner: 'enemy', isDestroyed: false });
      expect(state.getAllBalls()).toHaveLength(2);
    });

    it('should filter alive balls', () => {
      state.addBall({ id: 1, owner: 'player', isDestroyed: false });
      state.addBall({ id: 2, owner: 'player', isDestroyed: true });
      state.addBall({ id: 3, owner: 'enemy', isDestroyed: false });
      expect(state.getAliveBalls()).toHaveLength(2);
    });

    it('should filter alive balls by owner', () => {
      state.addBall({ id: 1, owner: 'player', isDestroyed: false });
      state.addBall({ id: 2, owner: 'player', isDestroyed: true });
      state.addBall({ id: 3, owner: 'enemy', isDestroyed: false });
      expect(state.getAliveBalls('player')).toHaveLength(1);
      expect(state.getAliveBalls('enemy')).toHaveLength(1);
    });
  });
});
