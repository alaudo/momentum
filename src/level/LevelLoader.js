// ============================================================
// LevelLoader.js — Load campaign levels from JSON
// ============================================================

import TileGrid from './TileGrid.js';
import { gridToWorld, getTilePixelSize } from '../utils/CoordinateUtils.js';

export default class LevelLoader {
  /**
   * Load a level from JSON data
   * @param {object} levelJSON
   * @returns {object} Same format as LevelGenerator output
   */
  static load(levelJSON) {
    const { gridWidth, gridHeight, tiles, playerBalls, enemyBalls, bumpers, missionType, missionData } = levelJSON;
    const grid = new TileGrid(gridWidth, gridHeight);
    const tilePixelSize = getTilePixelSize();

    // Load tiles
    if (tiles) {
      for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
          if (tiles[row] && tiles[row][col]) {
            const tileData = tiles[row][col];
            if (typeof tileData === 'string') {
              grid.setTile(col, row, tileData);
            } else {
              grid.setTile(col, row, tileData.type, tileData.metadata || {});
            }
          }
        }
      }
    }

    // Convert grid-based positions to world positions
    const pBalls = (playerBalls || []).map(b => {
      if (b.gridCol !== undefined) {
        const pos = gridToWorld(b.gridCol, b.gridRow, tilePixelSize);
        return { ...b, x: pos.x, y: pos.y };
      }
      return b;
    });

    const eBalls = (enemyBalls || []).map(b => {
      if (b.gridCol !== undefined) {
        const pos = gridToWorld(b.gridCol, b.gridRow, tilePixelSize);
        return { ...b, x: pos.x, y: pos.y };
      }
      return b;
    });

    const bmprs = (bumpers || []).map(b => {
      if (b.gridCol !== undefined) {
        const pos = gridToWorld(b.gridCol, b.gridRow, tilePixelSize);
        return { ...b, x: pos.x, y: pos.y };
      }
      return b;
    });

    return {
      grid,
      playerBalls: pBalls,
      enemyBalls: eBalls,
      bumpers: bmprs,
      gridWidth,
      gridHeight,
      missionType: missionType || 'clear_board',
      missionData: missionData || {},
    };
  }
}
