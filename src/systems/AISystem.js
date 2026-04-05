// ============================================================
// AISystem.js — Enemy AI for Skirmish mode
// ============================================================

import { MAX_IMPULSE_MAGNITUDE, EVENTS } from '../config/Constants.js';
import { distance, angleBetween, vectorFromAngle } from '../utils/MathUtils.js';
import { worldToGrid } from '../utils/CoordinateUtils.js';
import { getTerrainDef } from '../config/TerrainData.js';
import EventBus from '../state/EventBus.js';

export default class AISystem {
  constructor(scene, gameState, forceSystem) {
    this.scene = scene;
    this.gameState = gameState;
    this.forceSystem = forceSystem;
    this.thinkDelay = 800; // ms delay before AI shoots
    this.candidateAngles = 16; // number of angles to evaluate
  }

  /** Execute AI turn */
  think() {
    const enemyBalls = this.gameState.getAliveBalls('enemy');
    const playerBalls = this.gameState.getAliveBalls('player');

    if (enemyBalls.length === 0 || playerBalls.length === 0) return;

    // Evaluate best shot
    const bestShot = this._evaluateBestShot(enemyBalls, playerBalls);

    if (!bestShot) {
      // No good shot found — fire randomly
      const ball = enemyBalls[0];
      const angle = Math.random() * Math.PI * 2;
      const power = 0.3;
      this._executeShot(ball, angle, power);
      return;
    }

    // Delay then execute
    this.scene.time.delayedCall(this.thinkDelay, () => {
      this._executeShot(bestShot.ball, bestShot.angle, bestShot.power);
    });
  }

  _evaluateBestShot(enemyBalls, playerBalls) {
    const grid = this.gameState.grid;
    let bestScore = -Infinity;
    let bestShot = null;

    for (const eBall of enemyBalls) {
      for (let a = 0; a < this.candidateAngles; a++) {
        const angle = (a / this.candidateAngles) * Math.PI * 2;

        for (const power of [0.4, 0.7, 1.0]) {
          const forceCost = this.forceSystem.calculateCost(power, eBall.weight);
          if (!this.forceSystem.canAfford(forceCost)) continue;

          // Estimate where enemy ball would end up
          const impulse = vectorFromAngle(angle, power * MAX_IMPULSE_MAGNITUDE);

          // Simple trajectory estimation: check if this angle points toward a player ball
          let score = 0;

          for (const pBall of playerBalls) {
            const dist = distance(eBall.x, eBall.y, pBall.x, pBall.y);
            const angleToPBall = angleBetween(eBall.x, eBall.y, pBall.x, pBall.y);
            const angleDiff = Math.abs(angle - angleToPBall);
            const normalizedAngleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);

            // Score is higher if angle points toward a player ball
            if (normalizedAngleDiff < Math.PI / 4) {
              score += (1 - normalizedAngleDiff / (Math.PI / 4)) * 10;

              // Bonus if player ball is near a hazard
              const hazardDist = this._nearestHazardDistance(pBall.x, pBall.y);
              if (hazardDist < 100) {
                score += (100 - hazardDist) * 0.2;
              }
            }

            // Penalty for shooting away from all players
            if (normalizedAngleDiff > Math.PI * 0.75) {
              score -= 5;
            }
          }

          // Prefer lower power (conserve force)
          score -= power * 2;

          if (score > bestScore) {
            bestScore = score;
            bestShot = { ball: eBall, angle, power };
          }
        }
      }
    }

    return bestShot;
  }

  _nearestHazardDistance(x, y) {
    const grid = this.gameState.grid;
    if (!grid) return Infinity;

    let minDist = Infinity;
    grid.forEach((tile, col, row) => {
      const def = getTerrainDef(tile.type);
      if (def.isHazard) {
        const center = grid.getTileCenter(col, row);
        const d = distance(x, y, center.x, center.y);
        if (d < minDist) minDist = d;
      }
    });

    return minDist;
  }

  _executeShot(ball, angle, power) {
    const forceCost = this.forceSystem.calculateCost(power, ball.weight);
    this.forceSystem.spend(forceCost);

    const impulse = vectorFromAngle(angle, power * MAX_IMPULSE_MAGNITUDE);
    ball.applyImpulse(impulse.x, impulse.y);

    EventBus.emit(EVENTS.SHOT_FIRED, {
      ball,
      impulseX: impulse.x,
      impulseY: impulse.y,
      power,
      forceCost,
      isAI: true,
    });
  }

  destroy() {
    // Nothing to clean up
  }
}
