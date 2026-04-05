// ============================================================
// Bumper.js — Bouncy element entity
// ============================================================

import {
  CATEGORY, BUMPER_RESTITUTION, COLORS, POINT_TO_PIXEL,
} from '../config/Constants.js';
import EventBridge from '../utils/EventBridge.js';

let bumperIdCounter = 0;

export default class Bumper {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} config - { x, y, width, height, shape, modifierDelta? }
   *   shape: 'circle' | 'rectangle'
   *   width/height in pixels, or radius for circle
   */
  constructor(scene, config) {
    this.scene = scene;
    this.id = ++bumperIdCounter;
    this.shape = config.shape || 'circle';
    this.modifierDelta = config.modifierDelta || null; // null = normal bumper, number = modifier bouncer
    this.isModifierBouncer = this.modifierDelta !== null;

    const opts = {
      isStatic: true,
      restitution: BUMPER_RESTITUTION,
      friction: 0,
      label: `bumper_${this.id}`,
      collisionFilter: {
        category: CATEGORY.BUMPER,
        mask: CATEGORY.BALL,
      },
    };

    if (this.shape === 'circle') {
      this.radius = config.radius || POINT_TO_PIXEL * 2.5;
      this.body = scene.matter.add.circle(config.x, config.y, this.radius, opts);
    } else {
      this.width = config.width || POINT_TO_PIXEL * 5;
      this.height = config.height || POINT_TO_PIXEL * 5;
      this.body = scene.matter.add.rectangle(config.x, config.y, this.width, this.height, opts);
    }

    this.body.bumperRef = this;
    // Phaser's MatterCollisionEvents plugin calls body.gameObject.emit()
    this.body.gameObject = EventBridge.create(this);
    this.graphics = scene.add.graphics();
    this.x = config.x;
    this.y = config.y;
    this.pulsePhase = Math.random() * Math.PI * 2;

    this.render();
  }

  render() {
    this.graphics.clear();

    const color = this.isModifierBouncer ? COLORS.MODIFIER_PAD : COLORS.BOUNCY;
    const glowColor = this.isModifierBouncer ? 0xb39ddb : COLORS.BOUNCY_GLOW;

    if (this.shape === 'circle') {
      // Glow
      this.graphics.fillStyle(glowColor, 0.3);
      this.graphics.fillCircle(this.x, this.y, this.radius + 4);
      // Main
      this.graphics.fillStyle(color, 1);
      this.graphics.fillCircle(this.x, this.y, this.radius);
      // Inner highlight
      this.graphics.fillStyle(0xffffff, 0.2);
      this.graphics.fillCircle(this.x - this.radius * 0.2, this.y - this.radius * 0.2, this.radius * 0.4);
    } else {
      const hx = this.x - this.width / 2;
      const hy = this.y - this.height / 2;
      // Glow
      this.graphics.fillStyle(glowColor, 0.3);
      this.graphics.fillRoundedRect(hx - 3, hy - 3, this.width + 6, this.height + 6, 4);
      // Main
      this.graphics.fillStyle(color, 1);
      this.graphics.fillRoundedRect(hx, hy, this.width, this.height, 3);
    }

    // Modifier label
    if (this.isModifierBouncer) {
      const sign = this.modifierDelta > 0 ? '+' : '';
      const label = this.scene.add.text(this.x, this.y, `${sign}${this.modifierDelta}`, {
        fontSize: '12px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5, 0.5).setDepth(8);
      this.label = label;
    }
  }

  update(time) {
    // Subtle pulse animation
    const pulse = 1 + Math.sin(time * 0.003 + this.pulsePhase) * 0.05;
    this.graphics.setScale(pulse);
  }

  destroy() {
    if (this.body) this.scene.matter.world.remove(this.body);
    if (this.graphics) this.graphics.destroy();
    if (this.label) this.label.destroy();
  }
}
