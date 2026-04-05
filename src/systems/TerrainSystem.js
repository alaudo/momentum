// ============================================================
// TerrainSystem.js — Friction, fans, water streams
// ============================================================

import { TERRAIN, FAN_FORCE, STREAM_FORCE, WEIGHT_CLASS } from '../config/Constants.js';
import { getTerrainDef, getDirectionVector } from '../config/TerrainData.js';
import { worldToGrid } from '../utils/CoordinateUtils.js';

export default class TerrainSystem {
  constructor(scene, gameState) {
    this.scene = scene;
    this.gameState = gameState;
  }

  /** Apply terrain effects to all balls each physics step */
  update() {
    const grid = this.gameState.grid;
    if (!grid) return;

    const balls = this.gameState.getAllBalls().filter(b => !b.isDestroyed);

    for (const ball of balls) {
      const { col, row } = worldToGrid(ball.x, ball.y);
      const tile = grid.getTile(col, row);
      if (!tile) continue;

      const def = getTerrainDef(tile.type);

      // Apply terrain friction override
      if (def.friction !== undefined && ball.body) {
        // Dynamically adjust friction based on terrain
        // (We blend slightly with the ball's natural friction)
        const terrainFriction = def.friction;
        this.scene.matter.body.set(ball.body, 'frictionAir',
          ball.weightData.frictionAir + terrainFriction * 0.5
        );
      }

      // Fans affect Class 1 only
      if (def.isFan && ball.weightData.fanAffected) {
        const dir = getDirectionVector(def.fanDirection);
        const force = FAN_FORCE * (5 - ball.weight); // lighter = more affected
        this.scene.matter.body.applyForce(ball.body, ball.body.position, {
          x: dir.x * force,
          y: dir.y * force,
        });
      }

      // Water streams affect Class 2 only
      if (def.isStream && ball.weightData.streamAffected) {
        const dir = getDirectionVector(def.streamDirection);
        const force = STREAM_FORCE;
        this.scene.matter.body.applyForce(ball.body, ball.body.position, {
          x: dir.x * force,
          y: dir.y * force,
        });
      }
    }
  }

  destroy() {
    // Nothing to clean up
  }
}
