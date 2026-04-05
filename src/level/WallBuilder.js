// ============================================================
// WallBuilder.js — Perimeter wall generation
// ============================================================

import { WALL_THICKNESS, CATEGORY, COLORS } from '../config/Constants.js';
import { getFieldSize } from '../utils/CoordinateUtils.js';
import EventBridge from '../utils/EventBridge.js';

export default class WallBuilder {
  /**
   * Create perimeter walls for the grid
   * @param {Phaser.Scene} scene
   * @param {number} gridWidth - columns
   * @param {number} gridHeight - rows
   * @returns {{ bodies: Array, graphics: Phaser.GameObjects.Graphics }}
   */
  static build(scene, gridWidth, gridHeight) {
    const { width: fieldW, height: fieldH } = getFieldSize(gridWidth, gridHeight);
    const wt = WALL_THICKNESS;
    const graphics = scene.add.graphics().setDepth(2);

    const wallOpts = {
      isStatic: true,
      friction: 0.1,
      restitution: 0.4,
      label: 'wall',
      collisionFilter: {
        category: CATEGORY.WALL,
        mask: CATEGORY.BALL,
      },
    };

    const bodies = [];

    // Top wall
    bodies.push(scene.matter.add.rectangle(fieldW / 2, wt / 2, fieldW, wt, wallOpts));
    // Bottom wall
    bodies.push(scene.matter.add.rectangle(fieldW / 2, fieldH - wt / 2, fieldW, wt, wallOpts));
    // Left wall
    bodies.push(scene.matter.add.rectangle(wt / 2, fieldH / 2, wt, fieldH, wallOpts));
    // Right wall
    bodies.push(scene.matter.add.rectangle(fieldW - wt / 2, fieldH / 2, wt, fieldH, wallOpts));

    // Phaser's MatterCollisionEvents plugin calls body.gameObject.emit()
    // on every collision, so each wall body needs a gameObject with emit().
    for (const body of bodies) {
      body.gameObject = EventBridge.create(null);
    }

    // Render walls
    graphics.fillStyle(COLORS.WALL, 1);
    graphics.fillRect(0, 0, fieldW, wt); // top
    graphics.fillRect(0, fieldH - wt, fieldW, wt); // bottom
    graphics.fillRect(0, 0, wt, fieldH); // left
    graphics.fillRect(fieldW - wt, 0, wt, fieldH); // right

    // Wall edge highlights
    graphics.lineStyle(2, COLORS.WALL_STROKE, 0.6);
    graphics.strokeRect(wt, wt, fieldW - wt * 2, fieldH - wt * 2);

    // Corner accents
    const cornerSize = 8;
    graphics.fillStyle(COLORS.WALL_STROKE, 0.8);
    graphics.fillRect(wt - cornerSize, wt - cornerSize, cornerSize * 2, cornerSize * 2);
    graphics.fillRect(fieldW - wt - cornerSize, wt - cornerSize, cornerSize * 2, cornerSize * 2);
    graphics.fillRect(wt - cornerSize, fieldH - wt - cornerSize, cornerSize * 2, cornerSize * 2);
    graphics.fillRect(fieldW - wt - cornerSize, fieldH - wt - cornerSize, cornerSize * 2, cornerSize * 2);

    return { bodies, graphics };
  }
}
