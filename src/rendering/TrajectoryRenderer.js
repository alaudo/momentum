// ============================================================
// TrajectoryRenderer.js — Aim line, power indicator, force cost
// ============================================================

import { TRAJECTORY_DOTS, TRAJECTORY_DOT_SPACING, COLORS } from '../config/Constants.js';

export default class TrajectoryRenderer {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(20);
    this.costText = scene.add.text(0, 0, '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(21).setVisible(false);
  }

  /**
   * Draw the trajectory preview
   * @param {number} startX - Ball position X
   * @param {number} startY - Ball position Y
   * @param {number} dirX - Direction X (normalized, direction ball will go)
   * @param {number} dirY - Direction Y (normalized, direction ball will go)
   * @param {number} power - Power 0-1
   * @param {number} forceCost - How much force this shot will cost
   * @param {boolean} canAfford - Whether player has enough force
   */
  draw(startX, startY, dirX, dirY, power, forceCost, canAfford) {
    this.graphics.clear();

    const color = canAfford ? COLORS.TRAJECTORY : COLORS.TRAJECTORY_WARN;
    const dotCount = Math.ceil(TRAJECTORY_DOTS * power);

    for (let i = 1; i <= dotCount; i++) {
      const t = i / TRAJECTORY_DOTS;
      const alpha = 0.8 - t * 0.5;
      const dotSize = 3 - t * 1.5;

      const dx = startX + dirX * i * TRAJECTORY_DOT_SPACING * power;
      const dy = startY + dirY * i * TRAJECTORY_DOT_SPACING * power;

      this.graphics.fillStyle(color, alpha);
      this.graphics.fillCircle(dx, dy, Math.max(1, dotSize));
    }

    // Power indicator line (from ball to first dot direction)
    this.graphics.lineStyle(2, color, 0.4);
    this.graphics.lineBetween(
      startX, startY,
      startX + dirX * 20, startY + dirY * 20
    );

    // Force cost text
    const textX = startX + dirX * (dotCount + 2) * TRAJECTORY_DOT_SPACING * power * 0.3;
    const textY = startY + dirY * (dotCount + 2) * TRAJECTORY_DOT_SPACING * power * 0.3 - 20;

    this.costText.setPosition(textX, textY);
    this.costText.setText(`Force: ${Math.round(forceCost)}`);
    this.costText.setColor(canAfford ? '#4caf50' : '#f44336');
    this.costText.setVisible(true);
  }

  /** Hide the trajectory */
  hide() {
    this.graphics.clear();
    this.costText.setVisible(false);
  }

  destroy() {
    if (this.graphics) this.graphics.destroy();
    if (this.costText) this.costText.destroy();
  }
}
