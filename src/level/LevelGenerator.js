// ============================================================
// LevelGenerator.js — Seeded procedural level generation
// ============================================================

import SeededRandom from '../utils/SeededRandom.js';
import TileGrid from './TileGrid.js';
import { TERRAIN, DIFFICULTY } from '../config/Constants.js';
import { gridToWorld, getTilePixelSize } from '../utils/CoordinateUtils.js';
import { lerp, clamp } from '../utils/MathUtils.js';

export default class LevelGenerator {
  /**
   * Generate a level from a seed string
   * @param {string} seedString - Format: "{RandomString}-{DifficultyInt}"
   * @returns {object} { grid, playerBalls, enemyBalls, bumpers, seed, difficulty }
   */
  static generate(seedString) {
    const { baseSeed, difficulty } = SeededRandom.parseSeed(seedString);
    const diff = clamp(difficulty, DIFFICULTY.MIN, DIFFICULTY.MAX);
    const rng = new SeededRandom(seedString);

    // Determine grid size based on difficulty
    const gridW = Math.round(lerp(5, 14, (diff - 1) / 9));
    const gridH = Math.round(lerp(5, 14, (diff - 1) / 9));

    const grid = new TileGrid(gridW, gridH);
    const tilePixelSize = getTilePixelSize();

    // 1. Place hazards
    this._placeAbyss(grid, rng, diff);
    this._placeWater(grid, rng, diff);
    this._placeSpikes(grid, rng, diff);

    // 2. Place terrain features
    this._placeFans(grid, rng, diff);
    this._placeStreams(grid, rng, diff);
    this._placeModifierPads(grid, rng, diff);
    this._placeFrictionVariants(grid, rng, diff);

    // 3. Find safe spawn positions
    const safeTiles = grid.getSafeTiles();
    if (safeTiles.length < 3) {
      // Fallback: clear some tiles
      for (let r = 0; r < Math.min(3, gridH); r++) {
        for (let c = 0; c < Math.min(3, gridW); c++) {
          grid.setTile(c, r, TERRAIN.SAFE);
        }
      }
    }

    // 4. Place player ball(s)
    const playerBalls = [];
    const usedPositions = new Set();
    const playerPos = this._findSafeSpawn(grid, rng, usedPositions, 'corners');
    const playerWorldPos = gridToWorld(playerPos.col, playerPos.row, tilePixelSize);
    playerBalls.push({
      x: playerWorldPos.x,
      y: playerWorldPos.y,
      weight: rng.range(1, Math.min(6, 2 + diff)),
      owner: 'player',
    });
    usedPositions.add(`${playerPos.col},${playerPos.row}`);

    // 5. Place enemy balls
    const enemyBalls = [];
    const enemyCount = Math.min(1 + Math.floor(diff * 0.7), 8);
    for (let i = 0; i < enemyCount; i++) {
      const ePos = this._findSafeSpawn(grid, rng, usedPositions, 'random');
      if (!ePos) break;
      const eWorldPos = gridToWorld(ePos.col, ePos.row, tilePixelSize);
      // Higher difficulty = heavier enemies
      const minW = Math.max(1, Math.floor(diff * 0.5));
      const maxW = Math.min(12, 2 + diff);
      enemyBalls.push({
        x: eWorldPos.x,
        y: eWorldPos.y,
        weight: rng.range(minW, maxW),
      });
      usedPositions.add(`${ePos.col},${ePos.row}`);
    }

    // 6. Place bumpers
    const bumpers = this._placeBumpers(grid, rng, diff, tilePixelSize);

    return {
      grid,
      playerBalls,
      enemyBalls,
      bumpers,
      seed: seedString,
      difficulty: diff,
      gridWidth: gridW,
      gridHeight: gridH,
    };
  }

  static _placeAbyss(grid, rng, diff) {
    const clusterCount = Math.max(1, Math.floor(diff * 0.5));
    for (let c = 0; c < clusterCount; c++) {
      const startCol = rng.range(1, grid.width - 2);
      const startRow = rng.range(1, grid.height - 2);
      const size = rng.range(1, 1 + Math.floor(diff * 0.3));

      for (let i = 0; i < size; i++) {
        const col = clamp(startCol + rng.range(-1, 1), 1, grid.width - 2);
        const row = clamp(startRow + rng.range(-1, 1), 1, grid.height - 2);
        grid.setTile(col, row, TERRAIN.ABYSS);
      }
    }
  }

  static _placeWater(grid, rng, diff) {
    if (diff < 2) return;
    const count = Math.max(1, Math.floor((diff - 1) * 0.4));
    for (let c = 0; c < count; c++) {
      const col = rng.range(1, grid.width - 2);
      const row = rng.range(1, grid.height - 2);
      if (grid.getTile(col, row).type === TERRAIN.SAFE) {
        grid.setTile(col, row, TERRAIN.WATER);
        // Expand
        if (rng.chance(0.5) && col + 1 < grid.width - 1) {
          if (grid.getTile(col + 1, row).type === TERRAIN.SAFE) {
            grid.setTile(col + 1, row, TERRAIN.WATER);
          }
        }
        if (rng.chance(0.4) && row + 1 < grid.height - 1) {
          if (grid.getTile(col, row + 1).type === TERRAIN.SAFE) {
            grid.setTile(col, row + 1, TERRAIN.WATER);
          }
        }
      }
    }
  }

  static _placeSpikes(grid, rng, diff) {
    if (diff < 2) return;
    const count = Math.max(1, Math.floor(diff * 0.3));
    for (let c = 0; c < count; c++) {
      const col = rng.range(1, grid.width - 2);
      const row = rng.range(1, grid.height - 2);
      if (grid.getTile(col, row).type === TERRAIN.SAFE) {
        grid.setTile(col, row, TERRAIN.SPIKES);
      }
    }
  }

  static _placeFans(grid, rng, diff) {
    if (diff < 3) return;
    const dirs = ['n', 's', 'e', 'w'];
    const count = rng.range(1, Math.min(3, Math.floor(diff * 0.2) + 1));
    for (let i = 0; i < count; i++) {
      const col = rng.range(1, grid.width - 2);
      const row = rng.range(1, grid.height - 2);
      if (grid.getTile(col, row).type === TERRAIN.SAFE) {
        const dir = rng.pick(dirs);
        grid.setTile(col, row, `fan_${dir}`);
      }
    }
  }

  static _placeStreams(grid, rng, diff) {
    if (diff < 3) return;
    const dirs = ['n', 's', 'e', 'w'];
    const count = rng.range(0, Math.min(2, Math.floor(diff * 0.15)));
    for (let i = 0; i < count; i++) {
      const col = rng.range(1, grid.width - 2);
      const row = rng.range(1, grid.height - 2);
      if (grid.getTile(col, row).type === TERRAIN.SAFE) {
        const dir = rng.pick(dirs);
        grid.setTile(col, row, `stream_${dir}`);
      }
    }
  }

  static _placeModifierPads(grid, rng, diff) {
    if (diff < 2) return;
    const count = rng.range(1, Math.min(3, 1 + Math.floor(diff * 0.2)));
    for (let i = 0; i < count; i++) {
      const col = rng.range(1, grid.width - 2);
      const row = rng.range(1, grid.height - 2);
      if (grid.getTile(col, row).type === TERRAIN.SAFE) {
        const delta = rng.pick([-2, -1, 1, 2, 3]);
        grid.setTile(col, row, TERRAIN.MODIFIER_PAD, { modifierDelta: delta });
      }
    }
  }

  static _placeFrictionVariants(grid, rng, diff) {
    grid.forEach((tile, col, row) => {
      if (tile.type === TERRAIN.SAFE && rng.chance(0.12)) {
        grid.setTile(col, row, rng.chance(0.5) ? TERRAIN.SAFE_SAND : TERRAIN.SAFE_ICE);
      }
    });
  }

  static _placeBumpers(grid, rng, diff, tilePixelSize) {
    const bumpers = [];
    const count = rng.range(0, Math.min(4, 1 + Math.floor(diff * 0.3)));
    for (let i = 0; i < count; i++) {
      const col = rng.range(1, grid.width - 2);
      const row = rng.range(1, grid.height - 2);
      if (grid.getTile(col, row).type === TERRAIN.SAFE) {
        const pos = gridToWorld(col, row, tilePixelSize);
        const isRound = rng.chance(0.6);
        const isModifier = rng.chance(0.25) && diff >= 4;
        bumpers.push({
          x: pos.x,
          y: pos.y,
          shape: isRound ? 'circle' : 'rectangle',
          radius: isRound ? tilePixelSize * 0.3 : undefined,
          width: isRound ? undefined : tilePixelSize * 0.6,
          height: isRound ? undefined : tilePixelSize * 0.6,
          modifierDelta: isModifier ? rng.pick([-1, 1, 2]) : null,
        });
        // Mark tile as occupied (but still walkable)
        grid.setTile(col, row, TERRAIN.SAFE, { hasBumper: true });
      }
    }
    return bumpers;
  }

  static _findSafeSpawn(grid, rng, usedPositions, strategy) {
    const safeTiles = grid.getSafeTiles().filter(t =>
      !usedPositions.has(`${t.col},${t.row}`) &&
      !t.metadata.hasBumper
    );

    if (safeTiles.length === 0) return null;

    if (strategy === 'corners') {
      // Prefer corners/edges for player spawn
      const corners = safeTiles.filter(t =>
        t.col <= 1 || t.col >= grid.width - 2 || t.row <= 1 || t.row >= grid.height - 2
      );
      if (corners.length > 0) return rng.pick(corners);
    }

    return rng.pick(safeTiles);
  }
}
