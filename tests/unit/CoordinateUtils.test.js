// ============================================================
// CoordinateUtils.test.js — Grid <-> World coordinate conversions
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  gridToWorld, worldToGrid, gridToWorldTopLeft,
  getTilePixelSize, getFieldSize, isInBounds,
} from '../../src/utils/CoordinateUtils.js';
import { TILE_SIZE_POINTS, POINT_TO_PIXEL, WALL_THICKNESS } from '../../src/config/Constants.js';

const TILE_PX = TILE_SIZE_POINTS * POINT_TO_PIXEL; // 60

describe('CoordinateUtils', () => {
  // ----------------------------------------
  // getTilePixelSize
  // ----------------------------------------
  describe('getTilePixelSize', () => {
    it('should return 60 (10 * 6)', () => {
      expect(getTilePixelSize()).toBe(60);
    });
  });

  // ----------------------------------------
  // gridToWorld
  // ----------------------------------------
  describe('gridToWorld', () => {
    it('should convert (0, 0) to center of first tile', () => {
      const pos = gridToWorld(0, 0);
      // WALL_THICKNESS + 0*60 + 30 = 40 + 30 = 70
      expect(pos.x).toBe(WALL_THICKNESS + TILE_PX / 2);
      expect(pos.y).toBe(WALL_THICKNESS + TILE_PX / 2);
    });

    it('should convert (1, 0) correctly', () => {
      const pos = gridToWorld(1, 0);
      expect(pos.x).toBe(WALL_THICKNESS + TILE_PX + TILE_PX / 2);
      expect(pos.y).toBe(WALL_THICKNESS + TILE_PX / 2);
    });

    it('should convert (0, 1) correctly', () => {
      const pos = gridToWorld(0, 1);
      expect(pos.x).toBe(WALL_THICKNESS + TILE_PX / 2);
      expect(pos.y).toBe(WALL_THICKNESS + TILE_PX + TILE_PX / 2);
    });

    it('should accept a custom tilePixelSize', () => {
      const pos = gridToWorld(1, 1, 100);
      expect(pos.x).toBe(WALL_THICKNESS + 100 + 50);
      expect(pos.y).toBe(WALL_THICKNESS + 100 + 50);
    });
  });

  // ----------------------------------------
  // worldToGrid
  // ----------------------------------------
  describe('worldToGrid', () => {
    it('should invert gridToWorld for (0,0)', () => {
      const world = gridToWorld(0, 0);
      const grid = worldToGrid(world.x, world.y);
      expect(grid.col).toBe(0);
      expect(grid.row).toBe(0);
    });

    it('should invert gridToWorld for (3,5)', () => {
      const world = gridToWorld(3, 5);
      const grid = worldToGrid(world.x, world.y);
      expect(grid.col).toBe(3);
      expect(grid.row).toBe(5);
    });

    it('should handle positions at tile edges', () => {
      // Left edge of tile (0,0) in world coords
      const x = WALL_THICKNESS + 1;
      const y = WALL_THICKNESS + 1;
      const grid = worldToGrid(x, y);
      expect(grid.col).toBe(0);
      expect(grid.row).toBe(0);
    });

    it('should return negative for positions in the wall', () => {
      const grid = worldToGrid(0, 0);
      expect(grid.col).toBeLessThan(0);
      expect(grid.row).toBeLessThan(0);
    });
  });

  // ----------------------------------------
  // gridToWorldTopLeft
  // ----------------------------------------
  describe('gridToWorldTopLeft', () => {
    it('should return top-left corner of tile (0,0)', () => {
      const pos = gridToWorldTopLeft(0, 0);
      expect(pos.x).toBe(WALL_THICKNESS);
      expect(pos.y).toBe(WALL_THICKNESS);
    });

    it('should return top-left corner of tile (1,1)', () => {
      const pos = gridToWorldTopLeft(1, 1);
      expect(pos.x).toBe(WALL_THICKNESS + TILE_PX);
      expect(pos.y).toBe(WALL_THICKNESS + TILE_PX);
    });
  });

  // ----------------------------------------
  // getFieldSize
  // ----------------------------------------
  describe('getFieldSize', () => {
    it('should compute field size for 5x5 grid', () => {
      const size = getFieldSize(5, 5);
      expect(size.width).toBe(5 * TILE_PX + WALL_THICKNESS * 2);
      expect(size.height).toBe(5 * TILE_PX + WALL_THICKNESS * 2);
    });

    it('should compute field size for 10x8 grid', () => {
      const size = getFieldSize(10, 8);
      expect(size.width).toBe(10 * TILE_PX + WALL_THICKNESS * 2);
      expect(size.height).toBe(8 * TILE_PX + WALL_THICKNESS * 2);
    });

    it('should include wall thickness on both sides', () => {
      const size = getFieldSize(1, 1);
      expect(size.width).toBe(TILE_PX + 2 * WALL_THICKNESS);
      expect(size.height).toBe(TILE_PX + 2 * WALL_THICKNESS);
    });
  });

  // ----------------------------------------
  // isInBounds
  // ----------------------------------------
  describe('isInBounds', () => {
    it('should return true for valid positions', () => {
      expect(isInBounds(0, 0, 5, 5)).toBe(true);
      expect(isInBounds(4, 4, 5, 5)).toBe(true);
      expect(isInBounds(2, 3, 5, 5)).toBe(true);
    });

    it('should return false for negative positions', () => {
      expect(isInBounds(-1, 0, 5, 5)).toBe(false);
      expect(isInBounds(0, -1, 5, 5)).toBe(false);
    });

    it('should return false for positions at or beyond grid boundary', () => {
      expect(isInBounds(5, 0, 5, 5)).toBe(false);
      expect(isInBounds(0, 5, 5, 5)).toBe(false);
      expect(isInBounds(5, 5, 5, 5)).toBe(false);
    });

    it('should work for 1x1 grid', () => {
      expect(isInBounds(0, 0, 1, 1)).toBe(true);
      expect(isInBounds(1, 0, 1, 1)).toBe(false);
    });
  });
});
