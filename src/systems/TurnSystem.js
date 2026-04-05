// ============================================================
// TurnSystem.js — Turn state machine, move counting, Force regen
// ============================================================

import {
  TURN_STATE, EVENTS, FORCE_REGEN_INTERVAL, GAME_MODE,
} from '../config/Constants.js';
import EventBus from '../state/EventBus.js';

export default class TurnSystem {
  constructor(scene, gameState, forceSystem) {
    this.scene = scene;
    this.gameState = gameState;
    this.forceSystem = forceSystem;

    // Listen for events
    EventBus.on(EVENTS.SHOT_FIRED, this._onShotFired, this);
    EventBus.on(EVENTS.BODIES_SETTLED, this._onBodiesSettled, this);
  }

  /** Get current turn state */
  getState() {
    return this.gameState.turnState;
  }

  /** Set turn state */
  setState(state) {
    const prev = this.gameState.turnState;
    this.gameState.turnState = state;
    EventBus.emit(EVENTS.STATE_CHANGED, { from: prev, to: state });
  }

  /** Called when a shot is fired */
  _onShotFired(data) {
    this.gameState.totalShots++;
    this.gameState.movesSinceRegen++;
    this.setState(TURN_STATE.PHYSICS_ACTIVE);
  }

  /** Called when all balls have settled */
  _onBodiesSettled() {
    // Move through resolution phases
    this.setState(TURN_STATE.HAZARD_RESOLVE);
  }

  /** Called after hazards are resolved */
  onHazardsResolved() {
    this.setState(TURN_STATE.MODIFIER_RESOLVE);
  }

  /** Called after modifiers are resolved */
  onModifiersResolved() {
    this.setState(TURN_STATE.TURN_END);
    this._endTurn();
  }

  _endTurn() {
    // Check win/loss
    const alivePlayers = this.gameState.getAliveBalls('player');
    const aliveEnemies = this.gameState.getAliveBalls('enemy');

    // Check player2 balls for PvP
    const alivePlayer2 = this.gameState.getAliveBalls('player2');

    const mode = this.gameState.mode;

    // Win: all enemies destroyed
    if (mode !== GAME_MODE.PVP && aliveEnemies.length === 0) {
      this._gameOver('player', 'All enemies destroyed!');
      return;
    }

    // Loss: all player balls destroyed
    if (alivePlayers.length === 0) {
      if (mode === GAME_MODE.PVP) {
        this._gameOver('player2', 'Player 2 wins!');
      } else {
        this._gameOver('enemy', 'All your balls were destroyed!');
      }
      return;
    }

    // PvP: Player 2 all destroyed
    if (mode === GAME_MODE.PVP && alivePlayer2.length === 0) {
      this._gameOver('player', 'Player 1 wins!');
      return;
    }

    // Force regen check
    if (this.gameState.movesSinceRegen >= FORCE_REGEN_INTERVAL) {
      this.forceSystem.regen();
      if (mode === GAME_MODE.PVP) {
        this.forceSystem.regen('player2');
      }
      this.gameState.movesSinceRegen = 0;
    }

    // Advance turn
    this.gameState.turnNumber++;
    EventBus.emit(EVENTS.TURN_ADVANCED, {
      turnNumber: this.gameState.turnNumber,
      activePlayer: this.gameState.activePlayer,
    });

    // Determine next state
    if (mode === GAME_MODE.SKIRMISH) {
      // Alternate between player and AI
      if (this.gameState.activePlayer === 'player') {
        this.gameState.activePlayer = 'ai';
        this.setState(TURN_STATE.AI_THINK);
      } else {
        this.gameState.activePlayer = 'player';
        this.setState(TURN_STATE.PLAYER_AIM);
      }
    } else if (mode === GAME_MODE.PVP) {
      // Alternate between player and player2
      if (this.gameState.activePlayer === 'player') {
        this.gameState.activePlayer = 'player2';
      } else {
        this.gameState.activePlayer = 'player';
      }
      this.setState(TURN_STATE.PLAYER_AIM);
    } else {
      // Rogue / Campaign — always player's turn
      this.gameState.activePlayer = 'player';
      this.setState(TURN_STATE.PLAYER_AIM);
    }
  }

  _gameOver(winner, message) {
    this.gameState.isGameOver = true;
    this.gameState.winner = winner;
    this.setState(TURN_STATE.GAME_OVER);

    EventBus.emit(EVENTS.GAME_OVER, {
      winner,
      message,
      score: this.gameState.score,
      turns: this.gameState.turnNumber,
      enemiesDestroyed: this.gameState.enemiesDestroyed,
    });
  }

  destroy() {
    EventBus.off(EVENTS.SHOT_FIRED, this._onShotFired, this);
    EventBus.off(EVENTS.BODIES_SETTLED, this._onBodiesSettled, this);
  }
}
