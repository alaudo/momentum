// ============================================================
// TurnSystem.test.js — Turn state machine unit tests
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import TurnSystem from '../../src/systems/TurnSystem.js';
import GameState from '../../src/state/GameState.js';
import ForceSystem from '../../src/systems/ForceSystem.js';
import {
  TURN_STATE, EVENTS, GAME_MODE, FORCE_REGEN_INTERVAL,
} from '../../src/config/Constants.js';

// Mock EventBus — factory must not reference outer variables (hoisted)
vi.mock('../../src/state/EventBus.js', () => ({
  default: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

// Import the mock after vi.mock
import EventBus from '../../src/state/EventBus.js';
const mockEventBus = EventBus;

describe('TurnSystem', () => {
  let gameState;
  let forceSystem;
  let turnSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    gameState = new GameState();
    forceSystem = new ForceSystem(gameState);
    turnSystem = new TurnSystem({}, gameState, forceSystem);
  });

  // ----------------------------------------
  // State management
  // ----------------------------------------
  describe('state management', () => {
    it('should get the current turn state', () => {
      expect(turnSystem.getState()).toBe(TURN_STATE.PLAYER_AIM);
    });

    it('should set turn state and emit STATE_CHANGED', () => {
      turnSystem.setState(TURN_STATE.PHYSICS_ACTIVE);
      expect(gameState.turnState).toBe(TURN_STATE.PHYSICS_ACTIVE);
      expect(mockEventBus.emit).toHaveBeenCalledWith(EVENTS.STATE_CHANGED, {
        from: TURN_STATE.PLAYER_AIM,
        to: TURN_STATE.PHYSICS_ACTIVE,
      });
    });
  });

  // ----------------------------------------
  // Shot fired handling
  // ----------------------------------------
  describe('onShotFired', () => {
    it('should increment totalShots and movesSinceRegen', () => {
      turnSystem._onShotFired({});
      expect(gameState.totalShots).toBe(1);
      expect(gameState.movesSinceRegen).toBe(1);
    });

    it('should transition to PHYSICS_ACTIVE', () => {
      turnSystem._onShotFired({});
      expect(gameState.turnState).toBe(TURN_STATE.PHYSICS_ACTIVE);
    });
  });

  // ----------------------------------------
  // Bodies settled
  // ----------------------------------------
  describe('onBodiesSettled', () => {
    it('should transition to HAZARD_RESOLVE', () => {
      turnSystem._onBodiesSettled();
      expect(gameState.turnState).toBe(TURN_STATE.HAZARD_RESOLVE);
    });
  });

  // ----------------------------------------
  // Phase progression
  // ----------------------------------------
  describe('phase progression', () => {
    it('should progress from HAZARD_RESOLVE to MODIFIER_RESOLVE', () => {
      turnSystem.onHazardsResolved();
      expect(gameState.turnState).toBe(TURN_STATE.MODIFIER_RESOLVE);
    });

    it('should progress from MODIFIER_RESOLVE to TURN_END and call _endTurn', () => {
      // Need alive balls to prevent game over
      gameState.addBall({ id: 1, owner: 'player', isDestroyed: false });
      gameState.addBall({ id: 2, owner: 'enemy', isDestroyed: false });

      turnSystem.onModifiersResolved();
      // Should have gone to TURN_END and then back to PLAYER_AIM
      expect(gameState.turnState).toBe(TURN_STATE.PLAYER_AIM);
    });
  });

  // ----------------------------------------
  // Win/Loss detection
  // ----------------------------------------
  describe('win/loss detection', () => {
    it('should trigger game over (win) when all enemies destroyed in ROGUE', () => {
      gameState.mode = GAME_MODE.ROGUE;
      gameState.addBall({ id: 1, owner: 'player', isDestroyed: false });
      // No alive enemies

      turnSystem.onModifiersResolved();

      expect(gameState.isGameOver).toBe(true);
      expect(gameState.winner).toBe('player');
      expect(mockEventBus.emit).toHaveBeenCalledWith(EVENTS.GAME_OVER, expect.objectContaining({
        winner: 'player',
      }));
    });

    it('should trigger game over (loss) when all player balls destroyed', () => {
      gameState.mode = GAME_MODE.ROGUE;
      gameState.addBall({ id: 1, owner: 'enemy', isDestroyed: false });
      // No alive players

      turnSystem.onModifiersResolved();

      expect(gameState.isGameOver).toBe(true);
      expect(gameState.winner).toBe('enemy');
    });

    it('should trigger player2 win in PVP when all player1 balls destroyed', () => {
      gameState.mode = GAME_MODE.PVP;
      gameState.addBall({ id: 1, owner: 'player2', isDestroyed: false });
      // No alive player1 balls

      turnSystem.onModifiersResolved();

      expect(gameState.winner).toBe('player2');
    });

    it('should trigger player1 win in PVP when all player2 balls destroyed', () => {
      gameState.mode = GAME_MODE.PVP;
      gameState.addBall({ id: 1, owner: 'player', isDestroyed: false });
      // No alive player2 balls

      turnSystem.onModifiersResolved();

      expect(gameState.winner).toBe('player');
    });
  });

  // ----------------------------------------
  // Turn alternation
  // ----------------------------------------
  describe('turn alternation', () => {
    it('ROGUE mode should always return to player', () => {
      gameState.mode = GAME_MODE.ROGUE;
      gameState.addBall({ id: 1, owner: 'player', isDestroyed: false });
      gameState.addBall({ id: 2, owner: 'enemy', isDestroyed: false });

      turnSystem.onModifiersResolved();

      expect(gameState.activePlayer).toBe('player');
      expect(gameState.turnState).toBe(TURN_STATE.PLAYER_AIM);
    });

    it('SKIRMISH should alternate between player and AI', () => {
      gameState.mode = GAME_MODE.SKIRMISH;
      gameState.activePlayer = 'player';
      gameState.addBall({ id: 1, owner: 'player', isDestroyed: false });
      gameState.addBall({ id: 2, owner: 'enemy', isDestroyed: false });

      turnSystem.onModifiersResolved();

      expect(gameState.activePlayer).toBe('ai');
      expect(gameState.turnState).toBe(TURN_STATE.AI_THINK);
    });

    it('PVP should alternate between player and player2', () => {
      gameState.mode = GAME_MODE.PVP;
      gameState.activePlayer = 'player';
      gameState.addBall({ id: 1, owner: 'player', isDestroyed: false });
      gameState.addBall({ id: 2, owner: 'player2', isDestroyed: false });

      turnSystem.onModifiersResolved();

      expect(gameState.activePlayer).toBe('player2');
      expect(gameState.turnState).toBe(TURN_STATE.PLAYER_AIM);
    });
  });

  // ----------------------------------------
  // Force regeneration
  // ----------------------------------------
  describe('force regeneration', () => {
    it('should regen force after FORCE_REGEN_INTERVAL moves', () => {
      gameState.addBall({ id: 1, owner: 'player', isDestroyed: false });
      gameState.addBall({ id: 2, owner: 'enemy', isDestroyed: false });
      gameState.setForce(50);
      gameState.movesSinceRegen = FORCE_REGEN_INTERVAL;

      const regenSpy = vi.spyOn(forceSystem, 'regen');
      turnSystem.onModifiersResolved();

      expect(regenSpy).toHaveBeenCalled();
      expect(gameState.movesSinceRegen).toBe(0);
    });

    it('should NOT regen before interval is reached', () => {
      gameState.addBall({ id: 1, owner: 'player', isDestroyed: false });
      gameState.addBall({ id: 2, owner: 'enemy', isDestroyed: false });
      gameState.movesSinceRegen = 1;

      const regenSpy = vi.spyOn(forceSystem, 'regen');
      turnSystem.onModifiersResolved();

      expect(regenSpy).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------
  // Turn number tracking
  // ----------------------------------------
  describe('turn number', () => {
    it('should increment turn number after each turn', () => {
      gameState.addBall({ id: 1, owner: 'player', isDestroyed: false });
      gameState.addBall({ id: 2, owner: 'enemy', isDestroyed: false });
      gameState.turnNumber = 0;

      turnSystem.onModifiersResolved();

      expect(gameState.turnNumber).toBe(1);
    });
  });
});
