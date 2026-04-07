// ============================================================
// LevelGenerator.js — Seeded procedural level generation
// Improved: gentler difficulty curve, guaranteed solvability,
// thematic hazard/ball pairing, smarter force budgeting.
// ============================================================

import SeededRandom from '../utils/SeededRandom.js';
import TileGrid from './TileGrid.js';
import { TERRAIN, DIFFICULTY, FORCE_MAX, FORCE_COST_MULTIPLIER } from '../config/Constants.js';
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

    // Determine grid size — gentler scaling
    // Difficulty 1: 5x5, Diff 5: 8x8, Diff 10: 14x14
    const gridW = Math.round(lerp(5, 14, Math.pow((diff - 1) / 9, 1.3)));
    const gridH = Math.round(lerp(5, 14, Math.pow((diff - 1) / 9, 1.3)));

    const grid = new TileGrid(gridW, gridH);
    const tilePixelSize = getTilePixelSize();

    // Phase 1: Determine what ball types we'll use to plan terrain around them
    const ballPlan = this._planBalls(rng, diff, gridW, gridH);

    // Phase 2: Place hazards — scaled to ball plan
    this._placeHazards(grid, rng, diff, ballPlan);

    // Phase 3: Place terrain features
    this._placeFeatures(grid, rng, diff, ballPlan);

    // Phase 4: Ensure sufficient safe tiles remain
    this._ensureSafeTiles(grid, gridW, gridH);

    // Phase 5: Find safe spawn positions and place balls
    const usedPositions = new Set();

    // Place player ball(s) — always in corners/edges
    const playerBalls = [];
    const playerPos = this._findSafeSpawn(grid, rng, usedPositions, 'corners');
    const playerWorldPos = gridToWorld(playerPos.col, playerPos.row, tilePixelSize);
    playerBalls.push({
      x: playerWorldPos.x,
      y: playerWorldPos.y,
      weight: ballPlan.playerWeight,
      owner: 'player',
    });
    usedPositions.add(`${playerPos.col},${playerPos.row}`);

    // Place enemy balls — away from player
    const enemyBalls = [];
    for (let i = 0; i < ballPlan.enemies.length; i++) {
      const ePos = this._findSafeSpawn(grid, rng, usedPositions, 'away_from', playerPos);
      if (!ePos) break;
      const eWorldPos = gridToWorld(ePos.col, ePos.row, tilePixelSize);
      enemyBalls.push({
        x: eWorldPos.x,
        y: eWorldPos.y,
        weight: ballPlan.enemies[i].weight,
      });
      usedPositions.add(`${ePos.col},${ePos.row}`);
    }

    // Phase 6: Place bumpers (avoiding ball positions)
    const bumpers = this._placeBumpers(grid, rng, diff, tilePixelSize, usedPositions);

    // Phase 7: Verify force budget is sufficient
    this._verifyForceBudget(playerBalls, enemyBalls, diff);

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

  /**
   * Plan ball types and weights before placing terrain.
   * This ensures terrain matches the balls (e.g. spikes for light enemies).
   */
  static _planBalls(rng, diff, gridW, gridH) {
    // Player weight: starts light (1-2), grows slowly with difficulty
    const playerMinW = 1;
    const playerMaxW = Math.min(6, 1 + Math.floor(diff * 0.5));
    const playerWeight = rng.range(playerMinW, playerMaxW);

    // Enemy count: gentler scaling
    // Diff 1: 1, Diff 3: 2, Diff 5: 3, Diff 7: 4, Diff 10: 6
    const enemyCount = Math.min(Math.max(1, Math.floor(diff * 0.55 + 0.5)), 6);

    // Enemy weights: constrained more tightly at low difficulty
    const enemies = [];
    let hasLightEnemy = false;
    let hasHeavyEnemy = false;

    for (let i = 0; i < enemyCount; i++) {
      let minW, maxW;

      if (diff <= 2) {
        // Very easy: all enemies are light (1-3)
        minW = 1;
        maxW = 3;
      } else if (diff <= 4) {
        // Easy: mostly light with occasional medium
        minW = 1;
        maxW = Math.min(6, 2 + diff);
      } else if (diff <= 7) {
        // Medium: mix of light and medium, rare heavy
        minW = Math.max(1, Math.floor(diff * 0.3));
        maxW = Math.min(10, 2 + diff);
      } else {
        // Hard: full range possible
        minW = Math.max(1, Math.floor(diff * 0.4));
        maxW = Math.min(12, 2 + diff);
      }

      const w = rng.range(minW, maxW);
      enemies.push({ weight: w });

      if (w <= 4) hasLightEnemy = true;
      if (w >= 9) hasHeavyEnemy = true;
    }

    return {
      playerWeight,
      enemies,
      hasLightEnemy,
      hasHeavyEnemy,
      totalEnemyWeight: enemies.reduce((sum, e) => sum + e.weight, 0),
    };
  }

  /**
   * Place hazards based on difficulty AND what balls exist.
   * If there are light enemies, place spikes near their area.
   * If there are heavy enemies, water/abyss can be useful.
   */
  static _placeHazards(grid, rng, diff, ballPlan) {
    // Budget: how much of the grid should be hazards
    // Diff 1: ~5%, Diff 5: ~15%, Diff 10: ~30%
    const totalTiles = grid.width * grid.height;
    const hazardBudget = Math.floor(totalTiles * lerp(0.05, 0.30, (diff - 1) / 9));

    let hazardsPlaced = 0;

    // Abyss: small clusters, starts at diff 1 but very rare
    if (diff >= 1) {
      const abyssCount = (diff <= 2) ? rng.range(0, 1) : Math.floor(diff * 0.4);
      for (let c = 0; c < abyssCount && hazardsPlaced < hazardBudget; c++) {
        const startCol = rng.range(1, grid.width - 2);
        const startRow = rng.range(1, grid.height - 2);
        // Cluster size: 1 at easy, up to 3 at hard
        const size = rng.range(1, Math.min(3, 1 + Math.floor(diff * 0.2)));

        for (let i = 0; i < size && hazardsPlaced < hazardBudget; i++) {
          const col = clamp(startCol + rng.range(-1, 1), 1, grid.width - 2);
          const row = clamp(startRow + rng.range(-1, 1), 1, grid.height - 2);
          if (grid.getTile(col, row).type === TERRAIN.SAFE) {
            grid.setTile(col, row, TERRAIN.ABYSS);
            hazardsPlaced++;
          }
        }
      }
    }

    // Water: only at diff 2+
    if (diff >= 2) {
      const waterCount = Math.max(0, Math.floor((diff - 1) * 0.3));
      for (let c = 0; c < waterCount && hazardsPlaced < hazardBudget; c++) {
        const col = rng.range(1, grid.width - 2);
        const row = rng.range(1, grid.height - 2);
        if (grid.getTile(col, row).type === TERRAIN.SAFE) {
          grid.setTile(col, row, TERRAIN.WATER);
          hazardsPlaced++;
          // Small expansion
          if (rng.chance(0.4) && col + 1 < grid.width - 1 && hazardsPlaced < hazardBudget) {
            if (grid.getTile(col + 1, row).type === TERRAIN.SAFE) {
              grid.setTile(col + 1, row, TERRAIN.WATER);
              hazardsPlaced++;
            }
          }
        }
      }
    }

    // Spikes: ALWAYS place some if there are light enemies (Class 1, weight 1-4)
    // This is crucial — without spikes, the player has no way to kill light balls
    {
      let spikeCount;
      if (ballPlan.hasLightEnemy) {
        // Guarantee enough spikes to matter: at least 2, scaling with enemy count
        const lightEnemyCount = ballPlan.enemies.filter(e => e.weight <= 4).length;
        spikeCount = Math.max(2, lightEnemyCount + rng.range(0, 2));
      } else {
        // No light enemies — fewer spikes, still possible from diff 2+
        spikeCount = diff >= 2 ? Math.max(0, Math.floor(diff * 0.25)) : 0;
      }
      for (let c = 0; c < spikeCount && hazardsPlaced < hazardBudget; c++) {
        const col = rng.range(1, grid.width - 2);
        const row = rng.range(1, grid.height - 2);
        if (grid.getTile(col, row).type === TERRAIN.SAFE) {
          grid.setTile(col, row, TERRAIN.SPIKES);
          hazardsPlaced++;
        }
      }
      // If we still didn't manage to place any spikes and there are light enemies,
      // force-place at least 2 spikes by overwriting non-hazard tiles
      if (ballPlan.hasLightEnemy) {
        const currentSpikes = grid.getTilesOfType(TERRAIN.SPIKES).length;
        if (currentSpikes < 2) {
          const needed = 2 - currentSpikes;
          let placed = 0;
          for (let row = 1; row < grid.height - 1 && placed < needed; row++) {
            for (let col = 1; col < grid.width - 1 && placed < needed; col++) {
              const tile = grid.getTile(col, row);
              if (tile.type === TERRAIN.SAFE || tile.type === TERRAIN.SAFE_SAND || tile.type === TERRAIN.SAFE_ICE) {
                grid.setTile(col, row, TERRAIN.SPIKES);
                placed++;
              }
            }
          }
        }
      }
    }
  }

  /**
   * Place fans, streams, modifiers, friction variants.
   */
  static _placeFeatures(grid, rng, diff, ballPlan) {
    // Fans: only at diff 3+, useful when light balls present
    if (diff >= 3) {
      const dirs = ['n', 's', 'e', 'w'];
      let fanCount = rng.range(0, Math.min(3, Math.floor(diff * 0.2)));
      // Extra fans if light enemies exist
      if (ballPlan.hasLightEnemy) fanCount = Math.max(fanCount, 1);

      for (let i = 0; i < fanCount; i++) {
        const col = rng.range(1, grid.width - 2);
        const row = rng.range(1, grid.height - 2);
        if (grid.getTile(col, row).type === TERRAIN.SAFE) {
          const dir = rng.pick(dirs);
          grid.setTile(col, row, `fan_${dir}`);
        }
      }
    }

    // Streams: only at diff 3+, useful when wooden balls present
    if (diff >= 3) {
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

    // Modifier pads: only at diff 2+
    if (diff >= 2) {
      const count = rng.range(1, Math.min(3, 1 + Math.floor(diff * 0.2)));
      for (let i = 0; i < count; i++) {
        const col = rng.range(1, grid.width - 2);
        const row = rng.range(1, grid.height - 2);
        if (grid.getTile(col, row).type === TERRAIN.SAFE) {
          // Bias toward positive deltas at low difficulty (helps player)
          let deltas;
          if (diff <= 3) {
            deltas = [-1, 1, 1, 2];
          } else {
            deltas = [-2, -1, 1, 2, 3];
          }
          const delta = rng.pick(deltas);
          grid.setTile(col, row, TERRAIN.MODIFIER_PAD, { modifierDelta: delta });
        }
      }
    }

    // Friction variants: sand and ice
    // Less at low difficulty, more variety later
    const frictionChance = diff <= 2 ? 0.06 : 0.12;
    grid.forEach((tile, col, row) => {
      if (tile.type === TERRAIN.SAFE && rng.chance(frictionChance)) {
        grid.setTile(col, row, rng.chance(0.5) ? TERRAIN.SAFE_SAND : TERRAIN.SAFE_ICE);
      }
    });
  }

  /**
   * Ensure at least 40% of tiles are safe/walkable for playability.
   */
  static _ensureSafeTiles(grid, gridW, gridH) {
    const totalTiles = gridW * gridH;
    const safeTiles = grid.getSafeTiles();
    const minSafe = Math.max(5, Math.floor(totalTiles * 0.40));

    if (safeTiles.length < minSafe) {
      // Clear some tiles from interior back to safe
      let cleared = 0;
      for (let row = 1; row < gridH - 1 && safeTiles.length + cleared < minSafe; row++) {
        for (let col = 1; col < gridW - 1 && safeTiles.length + cleared < minSafe; col++) {
          const tile = grid.getTile(col, row);
          if (tile && tile.type !== TERRAIN.SAFE && tile.type !== TERRAIN.SAFE_SAND && tile.type !== TERRAIN.SAFE_ICE) {
            grid.setTile(col, row, TERRAIN.SAFE);
            cleared++;
          }
        }
      }
    }
  }

  /**
   * Place bumpers on the board.
   */
  static _placeBumpers(grid, rng, diff, tilePixelSize, usedPositions) {
    const bumpers = [];
    const count = rng.range(0, Math.min(4, 1 + Math.floor(diff * 0.3)));
    for (let i = 0; i < count; i++) {
      const col = rng.range(1, grid.width - 2);
      const row = rng.range(1, grid.height - 2);
      if (grid.getTile(col, row).type === TERRAIN.SAFE && !usedPositions.has(`${col},${row}`)) {
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
        usedPositions.add(`${col},${row}`);
      }
    }
    return bumpers;
  }

  /**
   * Verify the player has enough force to complete the level.
   * If the estimated total force needed exceeds what regeneration
   * provides, lighten the heaviest enemy weights.
   */
  static _verifyForceBudget(playerBalls, enemyBalls, diff) {
    if (playerBalls.length === 0 || enemyBalls.length === 0) return;

    const playerWeight = playerBalls[0].weight;

    // Estimate: each enemy kill takes ~2-3 shots at ~60% power
    // Cost per shot: power * weight * 0.8 * 10
    const avgPower = 0.6;
    const shotsPerEnemy = 2.5;
    const costPerShot = avgPower * playerWeight * FORCE_COST_MULTIPLIER * 10;
    const totalEstimatedCost = costPerShot * shotsPerEnemy * enemyBalls.length;

    // Available force: starting force + regen per turn * estimated turns
    // Regen is ~15 + diff*2 per turn, we get about (enemyBalls * 2.5) turns
    const estimatedTurns = Math.ceil(shotsPerEnemy * enemyBalls.length);
    const regenPerTurn = 15 + diff * 2;
    const minRegen = Math.ceil(costPerShot * 0.6);
    const effectiveRegen = Math.max(minRegen, regenPerTurn);
    const totalAvailable = FORCE_MAX + effectiveRegen * estimatedTurns;

    // If budget is too tight (less than 120% of estimated cost), lighten enemies
    if (totalAvailable < totalEstimatedCost * 1.2) {
      // Reduce heaviest enemy weights by 1-2
      const sorted = [...enemyBalls].sort((a, b) => b.weight - a.weight);
      for (let i = 0; i < Math.min(2, sorted.length); i++) {
        if (sorted[i].weight > 2) {
          sorted[i].weight = Math.max(1, sorted[i].weight - 1);
        }
      }
    }
  }

  /**
   * Find a safe spawn position.
   * strategy: 'corners' — prefer edges/corners
   *           'away_from' — prefer tiles far from given position
   *           'random' — any safe tile
   */
  static _findSafeSpawn(grid, rng, usedPositions, strategy, awayFrom) {
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

    if (strategy === 'away_from' && awayFrom) {
      // Sort by distance from the given position, pick from the far half
      const withDist = safeTiles.map(t => ({
        tile: t,
        dist: Math.abs(t.col - awayFrom.col) + Math.abs(t.row - awayFrom.row),
      }));
      withDist.sort((a, b) => b.dist - a.dist);
      // Pick from the top 50% (furthest tiles)
      const farHalf = withDist.slice(0, Math.max(1, Math.floor(withDist.length * 0.5)));
      return rng.pick(farHalf).tile;
    }

    return rng.pick(safeTiles);
  }
}
