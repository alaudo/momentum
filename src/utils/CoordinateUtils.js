// ============================================================
// CoordinateUtils.js — Tile <-> pixel <-> world conversions
// ============================================================

import { TILE_SIZE_POINTS, POINT_TO_PIXEL, WALL_THICKNESS } from '../config/Constants.js';

/**
 * Convert grid column/row to world pixel coordinates (center of tile)
 */
export function gridToWorld(col, row, tilePixelSize) {
  const ts = tilePixelSize || TILE_SIZE_POINTS * POINT_TO_PIXEL;
  return {
    x: WALL_THICKNESS + col * ts + ts / 2,
    y: WALL_THICKNESS + row * ts + ts / 2,
  };
}

/**
 * Convert world pixel coordinates to grid column/row
 */
export function worldToGrid(worldX, worldY, tilePixelSize) {
  const ts = tilePixelSize || TILE_SIZE_POINTS * POINT_TO_PIXEL;
  return {
    col: Math.floor((worldX - WALL_THICKNESS) / ts),
    row: Math.floor((worldY - WALL_THICKNESS) / ts),
  };
}

/**
 * Convert grid position to world position (top-left corner of tile)
 */
export function gridToWorldTopLeft(col, row, tilePixelSize) {
  const ts = tilePixelSize || TILE_SIZE_POINTS * POINT_TO_PIXEL;
  return {
    x: WALL_THICKNESS + col * ts,
    y: WALL_THICKNESS + row * ts,
  };
}

/**
 * Get the pixel size of a tile
 */
export function getTilePixelSize() {
  return TILE_SIZE_POINTS * POINT_TO_PIXEL;
}

/**
 * Get the total field size in pixels (including walls)
 */
export function getFieldSize(gridWidth, gridHeight) {
  const ts = getTilePixelSize();
  return {
    width: gridWidth * ts + WALL_THICKNESS * 2,
    height: gridHeight * ts + WALL_THICKNESS * 2,
  };
}

/**
 * Check if a grid position is within bounds
 */
export function isInBounds(col, row, gridWidth, gridHeight) {
  return col >= 0 && col < gridWidth && row >= 0 && row < gridHeight;
}
