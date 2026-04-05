// ============================================================
// HazardSystem.js — Hazard detection, damage, ball removal
// ============================================================

import { TERRAIN, EVENTS, CATEGORY, WEIGHT_CLASS } from '../config/Constants.js';
import { getTerrainDef } from '../config/TerrainData.js';
import { worldToGrid } from '../utils/CoordinateUtils.js';
import EventBus from '../state/EventBus.js';

export default class HazardSystem {
  constructor(scene, gameState, effectsRenderer) {
    this.scene = scene;
    this.gameState = gameState;
    this.effects = effectsRenderer;
    this.hazardQueue = []; // { ball, hazardType, tile }

    // Listen for collision with spikes (immediate damage tracking)
    this.spikeContacts = new Map(); // ballId -> Set of tileKeys
  }

  /** Check all balls against terrain hazards (called during PHYSICS_ACTIVE each frame) */
  checkHazards() {
    const grid = this.gameState.grid;
    if (!grid) return;

    const balls = this.gameState.getAllBalls().filter(b => !b.isDestroyed);

    for (const ball of balls) {
      const { col, row } = worldToGrid(ball.x, ball.y);
      const tile = grid.getTile(col, row);
      if (!tile) continue;

      const def = getTerrainDef(tile.type);
      if (!def.isHazard) continue;

      const tileKey = `${col},${row}`;
      const ballHazardKey = `${ball.id}_${tileKey}`;

      // Track hazard contact
      if (!this._isQueued(ball, tileKey)) {
        this.hazardQueue.push({ ball, hazardType: def.hazardType, tile, tileKey });
      }
    }
  }

  /** Resolve all queued hazard effects (called in HAZARD_RESOLVE phase) */
  resolve() {
    const processed = new Set();

    for (const entry of this.hazardQueue) {
      const { ball, hazardType } = entry;
      if (ball.isDestroyed || processed.has(ball.id)) continue;

      switch (hazardType) {
        case 'abyss':
          this._resolveAbyss(ball);
          break;
        case 'water':
          this._resolveWater(ball);
          break;
        case 'spikes':
          this._resolveSpikes(ball);
          break;
      }
      processed.add(ball.id);
    }

    this.hazardQueue = [];
    this.spikeContacts.clear();
  }

  _resolveAbyss(ball) {
    if (ball.weightData.abyssImmune) return; // Class 1 flies over

    // Ball falls into the abyss
    this._destroyBall(ball, 'abyss');
  }

  _resolveWater(ball) {
    const wc = ball.weightData;

    if (wc.class === WEIGHT_CLASS.BALLOON) {
      // Class 1: immune, flies over
      return;
    }

    if (wc.class === WEIGHT_CLASS.WOODEN) {
      // Class 2: floats — ball stops but isn't destroyed
      if (!ball.isFloating) {
        ball.isFloating = true;
        if (ball.body) {
          this.scene.matter.body.setVelocity(ball.body, { x: 0, y: 0 });
          // Increase friction to simulate floating/stuck
          this.scene.matter.body.set(ball.body, 'frictionAir', 0.15);
        }
      }
      return;
    }

    // Class 3: sinks and perishes
    this._destroyBall(ball, 'water');
  }

  _resolveSpikes(ball) {
    if (ball.weightData.spikeImmune) return; // Class 3 immune

    const shouldDestroy = ball.damage(1);
    if (shouldDestroy) {
      this._destroyBall(ball, 'spikes');
    } else {
      // Visual damage flash
      if (this.effects) {
        this.effects.damageFlash(ball.x, ball.y, ball.radiusPixels);
      }
      EventBus.emit(EVENTS.BALL_DAMAGED, {
        ball,
        remainingHP: ball.hp,
      });
    }
  }

  _destroyBall(ball, cause) {
    // Play death effect
    if (this.effects) {
      switch (cause) {
        case 'abyss':
          this.effects.abyssDeath(ball.x, ball.y, ball.radiusPixels);
          break;
        case 'water':
          this.effects.waterDeath(ball.x, ball.y, ball.radiusPixels);
          break;
        case 'spikes':
          this.effects.spikeDeath(ball.x, ball.y, ball.radiusPixels);
          break;
      }
    }

    // Track score
    if (ball.owner === 'enemy') {
      this.gameState.enemiesDestroyed++;
      this.gameState.score += ball.weight * 10;
    }

    // Remove from game state
    this.gameState.removeBall(ball);
    ball.destroy();

    EventBus.emit(EVENTS.BALL_DESTROYED, { ball, cause });
  }

  _isQueued(ball, tileKey) {
    return this.hazardQueue.some(e => e.ball.id === ball.id && e.tileKey === tileKey);
  }

  destroy() {
    this.hazardQueue = [];
    this.spikeContacts.clear();
  }
}
