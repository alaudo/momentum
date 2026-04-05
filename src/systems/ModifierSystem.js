// ============================================================
// ModifierSystem.js — Weight modifier pads/bouncers, delayed update
// ============================================================

import { TERRAIN, EVENTS, BALL_MIN_WEIGHT, BALL_MAX_WEIGHT } from '../config/Constants.js';
import { getTerrainDef } from '../config/TerrainData.js';
import { worldToGrid } from '../utils/CoordinateUtils.js';
import EventBus from '../state/EventBus.js';

export default class ModifierSystem {
  constructor(scene, gameState, effectsRenderer) {
    this.scene = scene;
    this.gameState = gameState;
    this.effects = effectsRenderer;
    this.modifierQueue = []; // { ball, delta }
    this.processedThisTurn = new Set(); // Track which ball+pad combos already queued

    // Listen for bumper collisions (modifier bouncers)
    EventBus.on('collision_ball_bumper', this._onBallBumper, this);
  }

  /** Check for balls on modifier pads (called during PHYSICS_ACTIVE) */
  checkModifiers() {
    const grid = this.gameState.grid;
    if (!grid) return;

    const balls = this.gameState.getAllBalls().filter(b => !b.isDestroyed);

    for (const ball of balls) {
      const { col, row } = worldToGrid(ball.x, ball.y);
      const tile = grid.getTile(col, row);
      if (!tile || tile.type !== TERRAIN.MODIFIER_PAD) continue;

      const delta = tile.metadata.modifierDelta;
      if (delta === undefined) continue;

      const key = `${ball.id}_${col}_${row}`;
      if (this.processedThisTurn.has(key)) continue;

      // Queue the modifier
      this.modifierQueue.push({ ball, delta });
      this.processedThisTurn.add(key);

      // Show floating indicator immediately
      ball.showModifierIndicator(delta);
      EventBus.emit(EVENTS.MODIFIER_QUEUED, { ball, delta });
    }
  }

  /** Handle modifier bouncer collisions */
  _onBallBumper(data) {
    const { ball, bumper } = data;
    if (!bumper.isModifierBouncer || !bumper.modifierDelta) return;

    const key = `${ball.id}_bumper_${bumper.id}`;
    if (this.processedThisTurn.has(key)) return;

    this.modifierQueue.push({ ball, delta: bumper.modifierDelta });
    this.processedThisTurn.add(key);

    // Show floating indicator
    ball.showModifierIndicator(bumper.modifierDelta);
    EventBus.emit(EVENTS.MODIFIER_QUEUED, { ball, delta: bumper.modifierDelta });
  }

  /** Resolve all queued modifiers (called in MODIFIER_RESOLVE phase) */
  resolve() {
    // Group modifiers by ball
    const ballModifiers = new Map();
    for (const entry of this.modifierQueue) {
      if (entry.ball.isDestroyed) continue;
      if (!ballModifiers.has(entry.ball.id)) {
        ballModifiers.set(entry.ball.id, { ball: entry.ball, totalDelta: 0 });
      }
      ballModifiers.get(entry.ball.id).totalDelta += entry.delta;
    }

    // Apply accumulated modifiers
    for (const [, { ball, totalDelta }] of ballModifiers) {
      if (totalDelta === 0) continue;

      const result = ball.changeWeight(totalDelta);
      if (result && this.effects) {
        this.effects.weightChange(ball.x, ball.y, ball.radiusPixels);
      }

      if (result) {
        EventBus.emit(EVENTS.WEIGHT_CHANGED, {
          ball,
          oldWeight: result.oldWeight,
          newWeight: result.newWeight,
        });
      }
    }

    // Clear queue
    this.modifierQueue = [];
    this.processedThisTurn.clear();
  }

  destroy() {
    EventBus.off('collision_ball_bumper', this._onBallBumper, this);
    this.modifierQueue = [];
    this.processedThisTurn.clear();
  }
}
