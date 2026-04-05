// ============================================================
// UIComponents.js — Reusable UI: buttons, bars, panels
// ============================================================

import { COLORS } from '../config/Constants.js';

export class Button {
  /**
   * Create a procedural button
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} text
   * @param {object} opts - { width, height, onClick, fontSize }
   */
  constructor(scene, x, y, text, opts = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = opts.width || 200;
    this.height = opts.height || 50;
    this.onClick = opts.onClick || (() => {});
    this.isHovered = false;
    this.isDisabled = opts.disabled || false;

    // Background
    this.bg = scene.add.graphics().setDepth(50);
    this._drawBg();

    // Text
    this.label = scene.add.text(x, y, text, {
      fontSize: opts.fontSize || '18px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#e0e0e0',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5, 0.5).setDepth(51);

    // Interactive zone
    this.zone = scene.add.zone(x, y, this.width, this.height)
      .setInteractive({ useHandCursor: true })
      .setDepth(52);

    this.zone.on('pointerover', () => {
      if (!this.isDisabled) {
        this.isHovered = true;
        this._drawBg();
      }
    });

    this.zone.on('pointerout', () => {
      this.isHovered = false;
      this._drawBg();
    });

    this.zone.on('pointerdown', () => {
      if (!this.isDisabled) {
        this.onClick();
      }
    });
  }

  _drawBg() {
    this.bg.clear();
    const color = this.isDisabled ? 0x424242 :
                  this.isHovered ? COLORS.UI_BUTTON_HOVER : COLORS.UI_BUTTON;
    const hx = this.x - this.width / 2;
    const hy = this.y - this.height / 2;

    // Shadow
    this.bg.fillStyle(0x000000, 0.3);
    this.bg.fillRoundedRect(hx + 2, hy + 2, this.width, this.height, 8);

    // Main
    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(hx, hy, this.width, this.height, 8);

    // Border
    this.bg.lineStyle(2, this.isHovered ? COLORS.UI_ACCENT : 0x3949ab, 1);
    this.bg.strokeRoundedRect(hx, hy, this.width, this.height, 8);

    // Top highlight
    if (!this.isDisabled) {
      this.bg.fillStyle(0xffffff, 0.05);
      this.bg.fillRoundedRect(hx + 2, hy + 2, this.width - 4, this.height / 2 - 2, { tl: 6, tr: 6, bl: 0, br: 0 });
    }
  }

  setDisabled(disabled) {
    this.isDisabled = disabled;
    this.label.setAlpha(disabled ? 0.4 : 1);
    this._drawBg();
  }

  setText(text) {
    this.label.setText(text);
  }

  setVisible(visible) {
    this.bg.setVisible(visible);
    this.label.setVisible(visible);
    this.zone.setVisible(visible);
    if (visible) {
      this.zone.setInteractive();
    } else {
      this.zone.disableInteractive();
    }
  }

  destroy() {
    if (this.bg) this.bg.destroy();
    if (this.label) this.label.destroy();
    if (this.zone) this.zone.destroy();
  }
}

export class ProgressBar {
  /**
   * Create a progress bar
   * @param {Phaser.Scene} scene
   * @param {number} x - left edge
   * @param {number} y - top edge
   * @param {number} width
   * @param {number} height
   * @param {object} opts - { fillColor, bgColor, borderColor }
   */
  constructor(scene, x, y, width, height, opts = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.fillColor = opts.fillColor || COLORS.FORCE_BAR;
    this.lowColor = opts.lowColor || COLORS.FORCE_BAR_LOW;
    this.bgColor = opts.bgColor || 0x1a1a1a;
    this.value = 1; // 0-1

    this.graphics = scene.add.graphics().setDepth(55);
    this.draw();
  }

  setValue(value) {
    this.value = Math.max(0, Math.min(1, value));
    this.draw();
  }

  draw() {
    this.graphics.clear();

    // Background
    this.graphics.fillStyle(this.bgColor, 0.8);
    this.graphics.fillRoundedRect(this.x, this.y, this.width, this.height, 4);

    // Fill
    const fillWidth = this.width * this.value;
    const color = this.value > 0.25 ? this.fillColor : this.lowColor;
    if (fillWidth > 0) {
      this.graphics.fillStyle(color, 1);
      this.graphics.fillRoundedRect(this.x, this.y, fillWidth, this.height, 4);
    }

    // Border
    this.graphics.lineStyle(1, 0x444444, 0.8);
    this.graphics.strokeRoundedRect(this.x, this.y, this.width, this.height, 4);
  }

  destroy() {
    if (this.graphics) this.graphics.destroy();
  }
}

export class Panel {
  constructor(scene, x, y, width, height, opts = {}) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(opts.depth || 45);

    this.graphics.fillStyle(opts.bgColor || COLORS.HUD_BG, opts.alpha || 0.85);
    this.graphics.fillRoundedRect(x, y, width, height, opts.radius || 8);
    this.graphics.lineStyle(1, opts.borderColor || 0x333355, 0.6);
    this.graphics.strokeRoundedRect(x, y, width, height, opts.radius || 8);
  }

  destroy() {
    if (this.graphics) this.graphics.destroy();
  }
}
