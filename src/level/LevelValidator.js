// ============================================================
// LevelValidator.js — Validate levels are playable
// ============================================================

import { getTerrainDef } from '../config/TerrainData.js';
import { worldToGrid } from '../utils/CoordinateUtils.js';

export default class LevelValidator {
  /**
   * Validate that a generated/loaded level is playable
   * @param {object} levelData - { grid, playerBalls, enemyBalls }
   * @returns {{ valid: boolean, issues: string[] }}
   */
  static validate(levelData) {
    const issues = [];
    const { grid, playerBalls, enemyBalls } = levelData;

    // 1. Must have at least one player ball
    if (!playerBalls || playerBalls.length === 0) {
      issues.push('No player balls');
    }

    // 2. Must have at least one enemy ball (in most modes)
    if (!enemyBalls || enemyBalls.length === 0) {
      issues.push('No enemy balls');
    }

    // 3. No balls on impassable hazards
    const allBalls = [...(playerBalls || []), ...(enemyBalls || [])];
    for (const ball of allBalls) {
      const { col, row } = worldToGrid(ball.x, ball.y);
      const tile = grid.getTile(col, row);
      if (tile) {
        const def = getTerrainDef(tile.type);
        if (def.isSolid) {
          issues.push(`Ball at (${col},${row}) is on solid tile`);
        }
      }
    }

    // 4. Player can reach at least one enemy (flood fill)
    if (playerBalls && playerBalls.length > 0 && enemyBalls && enemyBalls.length > 0) {
      const pBall = playerBalls[0];
      const { col: pCol, row: pRow } = worldToGrid(pBall.x, pBall.y);
      const reachable = grid.floodFill(pCol, pRow);

      let canReachEnemy = false;
      for (const eBall of enemyBalls) {
        const { col: eCol, row: eRow } = worldToGrid(eBall.x, eBall.y);
        if (reachable.has(`${eCol},${eRow}`)) {
          canReachEnemy = true;
          break;
        }
      }

      if (!canReachEnemy) {
        issues.push('Player cannot reach any enemy ball');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
