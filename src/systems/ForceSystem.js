// ============================================================
// ForceSystem.js — Force pool, cost calculation, validation
// ============================================================

import { FORCE_MAX, FORCE_COST_MULTIPLIER, FORCE_REGEN_AMOUNT, FORCE_REGEN_BONUS_PER_DIFFICULTY, EVENTS } from '../config/Constants.js';
import EventBus from '../state/EventBus.js';

export default class ForceSystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  /** Calculate force cost for a shot */
  calculateCost(power, weight) {
    return power * weight * FORCE_COST_MULTIPLIER * 10;
  }

  /** Check if current player can afford a given force cost */
  canAfford(cost) {
    return this.gameState.getForce() >= cost;
  }

  /** Spend force for current player */
  spend(cost) {
    const player = this.gameState.activePlayer;
    const current = this.gameState.getForce(player);
    const remaining = Math.max(0, current - cost);
    this.gameState.setForce(remaining, player);
    this.gameState.totalForceUsed += cost;

    EventBus.emit(EVENTS.FORCE_CHANGED, {
      player,
      current: remaining,
      max: FORCE_MAX,
      cost,
    });

    return remaining;
  }

  /**
   * Calculate regen amount based on difficulty and remaining enemies.
   * The idea: each turn, regen enough force to make at least one
   * moderate shot feasible, scaled up slightly by difficulty so that
   * harder levels (with heavier enemies) remain solvable.
   */
  _calculateRegenAmount() {
    const diff = this.gameState.difficulty || 1;
    const base = FORCE_REGEN_AMOUNT;
    const diffBonus = diff * FORCE_REGEN_BONUS_PER_DIFFICULTY;

    // Also consider average weight of player balls — heavier balls cost more
    const playerBalls = this.gameState.getAliveBalls('player');
    let avgPlayerWeight = 3;
    if (playerBalls.length > 0) {
      avgPlayerWeight = playerBalls.reduce((sum, b) => sum + b.weight, 0) / playerBalls.length;
    }

    // A "half-power shot" with the player's average ball weight costs:
    // 0.5 * avgWeight * 0.8 * 10 = 4 * avgWeight
    // Ensure regen covers at least 60% of that cost
    const typicalShotCost = 0.5 * avgPlayerWeight * FORCE_COST_MULTIPLIER * 10;
    const minRegen = Math.ceil(typicalShotCost * 0.6);

    return Math.max(minRegen, base + diffBonus);
  }

  /** Regenerate force for current player */
  regen(player) {
    const p = player || this.gameState.activePlayer;
    const current = this.gameState.getForce(p);
    const regenAmount = this._calculateRegenAmount();
    const newAmount = Math.min(FORCE_MAX, current + regenAmount);
    this.gameState.setForce(newAmount, p);

    EventBus.emit(EVENTS.FORCE_CHANGED, {
      player: p,
      current: newAmount,
      max: FORCE_MAX,
      regen: true,
    });
  }

  /** Get current force for display */
  getCurrentForce(player) {
    return this.gameState.getForce(player);
  }

  /** Get force as a 0-1 ratio */
  getForceRatio(player) {
    return this.gameState.getForce(player) / FORCE_MAX;
  }
}
