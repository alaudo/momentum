// ============================================================
// ForceSystem.js — Force pool, cost calculation, validation
// ============================================================

import { FORCE_MAX, FORCE_COST_MULTIPLIER, FORCE_REGEN_AMOUNT, EVENTS } from '../config/Constants.js';
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

  /** Regenerate force for current player */
  regen(player) {
    const p = player || this.gameState.activePlayer;
    const current = this.gameState.getForce(p);
    const newAmount = Math.min(FORCE_MAX, current + FORCE_REGEN_AMOUNT);
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
