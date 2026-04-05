// ============================================================
// GameState.js — Central game state container
// ============================================================

import { TURN_STATE, GAME_MODE, FORCE_MAX } from '../config/Constants.js';

export default class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.mode = GAME_MODE.ROGUE;
    this.seed = '';
    this.difficulty = 1;
    this.turnNumber = 0;
    this.movesSinceRegen = 0;
    this.turnState = TURN_STATE.PLAYER_AIM;
    this.activePlayer = 'player'; // 'player' or 'player2' or 'ai'
    this.forcePools = {
      player: FORCE_MAX,
      player2: FORCE_MAX,
      ai: FORCE_MAX,
    };
    this.balls = new Map(); // id -> Ball
    this.playerBalls = [];  // references
    this.enemyBalls = [];   // references
    this.bumpers = [];
    this.grid = null;       // TileGrid instance
    this.gridWidth = 5;
    this.gridHeight = 5;
    this.score = 0;
    this.enemiesDestroyed = 0;
    this.isGameOver = false;
    this.winner = null;
    this.modifierQueue = []; // pending weight changes
    this.hazardQueue = [];   // pending hazard effects

    // Campaign specific
    this.missionType = null;
    this.missionData = null;
    this.missionObjectives = {};

    // Stats
    this.totalShots = 0;
    this.totalForceUsed = 0;
    this.bumperBounces = 0;
  }

  getForce(player) {
    return this.forcePools[player || this.activePlayer] || 0;
  }

  setForce(amount, player) {
    const key = player || this.activePlayer;
    this.forcePools[key] = Math.max(0, Math.min(FORCE_MAX, amount));
  }

  addBall(ball) {
    this.balls.set(ball.id, ball);
    if (ball.owner === 'player' || ball.owner === 'player2') {
      this.playerBalls.push(ball);
    } else if (ball.owner === 'enemy') {
      this.enemyBalls.push(ball);
    }
  }

  removeBall(ball) {
    this.balls.delete(ball.id);
    this.playerBalls = this.playerBalls.filter(b => b.id !== ball.id);
    this.enemyBalls = this.enemyBalls.filter(b => b.id !== ball.id);
  }

  getAllBalls() {
    return Array.from(this.balls.values());
  }

  getAliveBalls(owner) {
    return this.getAllBalls().filter(b => !b.isDestroyed && (!owner || b.owner === owner));
  }
}
