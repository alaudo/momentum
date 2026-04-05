// ============================================================
// TileGrid.js — Grid data structure, tile access, coordinate math
// ============================================================

import { TERRAIN } from '../config/Constants.js';
import { getTerrainDef } from '../config/TerrainData.js';
import { gridToWorld, worldToGrid, getTilePixelSize, isInBounds } from '../utils/CoordinateUtils.js';

export default class TileGrid {
  /**
   * @param {number} width - Grid columns
   * @param {number} height - Grid rows
   */
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tilePixelSize = getTilePixelSize();
    this.tiles = [];

    // Initialize with safe ground
    for (let row = 0; row < height; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < width; col++) {
        this.tiles[row][col] = {
          type: TERRAIN.SAFE,
          col,
          row,
          metadata: {}, // modifierDelta, fanPower, etc.
        };
      }
    }
  }

  /** Get tile at grid position */
  getTile(col, row) {
    if (!isInBounds(col, row, this.width, this.height)) return null;
    return this.tiles[row][col];
  }

  /** Set tile type at grid position */
  setTile(col, row, type, metadata = {}) {
    if (!isInBounds(col, row, this.width, this.height)) return;
    this.tiles[row][col].type = type;
    this.tiles[row][col].metadata = { ...this.tiles[row][col].metadata, ...metadata };
  }

  /** Get terrain definition for tile at position */
  getTerrainAt(col, row) {
    const tile = this.getTile(col, row);
    if (!tile) return getTerrainDef(TERRAIN.SAFE);
    return getTerrainDef(tile.type);
  }

  /** Get tile at world pixel coordinates */
  getTileAtWorld(worldX, worldY) {
    const { col, row } = worldToGrid(worldX, worldY, this.tilePixelSize);
    return this.getTile(col, row);
  }

  /** Get world center of a tile */
  getTileCenter(col, row) {
    return gridToWorld(col, row, this.tilePixelSize);
  }

  /** Iterate all tiles */
  forEach(callback) {
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        callback(this.tiles[row][col], col, row);
      }
    }
  }

  /** Get all tiles of a given type */
  getTilesOfType(type) {
    const result = [];
    this.forEach((tile) => {
      if (tile.type === type) result.push(tile);
    });
    return result;
  }

  /** Get all safe ground tiles */
  getSafeTiles() {
    const result = [];
    this.forEach((tile) => {
      const def = getTerrainDef(tile.type);
      if (!def.isHazard && !def.isSolid) result.push(tile);
    });
    return result;
  }

  /** Check if a tile is walkable (not solid, not abyss) */
  isWalkable(col, row) {
    const tile = this.getTile(col, row);
    if (!tile) return false;
    const def = getTerrainDef(tile.type);
    return !def.isSolid;
  }

  /** Flood fill from start position to find reachable tiles */
  floodFill(startCol, startRow) {
    const visited = new Set();
    const queue = [{ col: startCol, row: startRow }];
    const key = (c, r) => `${c},${r}`;

    while (queue.length > 0) {
      const { col, row } = queue.shift();
      const k = key(col, row);
      if (visited.has(k)) continue;
      if (!isInBounds(col, row, this.width, this.height)) continue;
      if (!this.isWalkable(col, row)) continue;

      visited.add(k);

      queue.push({ col: col + 1, row });
      queue.push({ col: col - 1, row });
      queue.push({ col, row: row + 1 });
      queue.push({ col, row: row - 1 });
    }

    return visited;
  }
}
