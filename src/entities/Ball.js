// ============================================================
// Ball.js — Base ball entity (Matter body + Phaser Graphics)
// ============================================================

import { getWeightClass } from '../config/WeightClassData.js';
import {
  BALL_RADIUS_POINTS, POINT_TO_PIXEL, CATEGORY, MOTION_THRESHOLD,
  COLORS, BALL_MIN_WEIGHT, BALL_MAX_WEIGHT,
} from '../config/Constants.js';
import { clamp } from '../utils/MathUtils.js';
import EventBridge from '../utils/EventBridge.js';

let ballIdCounter = 0;

export default class Ball {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} config - { x, y, weight, owner }
   */
  constructor(scene, config) {
    this.scene = scene;
    this.id = ++ballIdCounter;
    this.owner = config.owner || 'player';
    this.weight = clamp(config.weight || 1, BALL_MIN_WEIGHT, BALL_MAX_WEIGHT);
    this.weightData = getWeightClass(this.weight);
    this.hp = this.weightData.maxHP;
    this.maxHP = this.weightData.maxHP;
    this.isDestroyed = false;
    this.isFloating = false; // floating in water
    this.pendingModifiers = []; // queued weight changes
    this.isKing = config.isKing || false; // for Precision Strike missions

    // Calculate radius in pixels
    this.radiusPixels = BALL_RADIUS_POINTS * POINT_TO_PIXEL * this.weightData.radiusScale;

    // Create Matter.js body
    this.body = scene.matter.add.circle(config.x, config.y, this.radiusPixels, {
      mass: this.weightData.mass,
      friction: this.weightData.friction,
      frictionAir: this.weightData.frictionAir,
      restitution: this.weightData.restitution,
      label: `ball_${this.id}`,
      collisionFilter: {
        category: CATEGORY.BALL,
        mask: CATEGORY.BALL | CATEGORY.WALL | CATEGORY.BUMPER | CATEGORY.SENSOR,
      },
    });

    // Store reference back to this Ball on the body
    // Phaser's MatterCollisionEvents plugin calls body.gameObject.emit()
    // on every collision, so gameObject must have an emit() method.
    this.body.gameObject = EventBridge.create(this);
    this.body.ballRef = this;

    // Create graphics
    this.graphics = scene.add.graphics();
    this.damageGraphics = scene.add.graphics();

    // Weight text
    this.weightText = scene.add.text(config.x, config.y, String(this.weight), {
      fontSize: `${Math.round(this.radiusPixels * 0.9)}px`,
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(10);

    // Modifier indicator text (floating above ball)
    this.modifierText = scene.add.text(config.x, config.y - this.radiusPixels - 10, '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffeb3b',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(15).setVisible(false);

    // Selection highlight
    this.isSelected = false;
    this.highlightGraphics = scene.add.graphics();

    this.render();
  }

  /** Get position from Matter body */
  get x() { return this.body.position.x; }
  get y() { return this.body.position.y; }
  get velocity() { return this.body.velocity; }

  /** Check if ball is effectively stopped */
  isMoving() {
    if (!this.body) return false;
    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;
    return Math.sqrt(vx * vx + vy * vy) > MOTION_THRESHOLD;
  }

  /** Render the ball graphics */
  render() {
    if (this.isDestroyed) return;

    const ownerColor = this._getOwnerColor();
    const weightColor = this.weightData.color;

    this.graphics.clear();

    // Outer ring (owner color)
    this.graphics.fillStyle(ownerColor, 1);
    this.graphics.fillCircle(0, 0, this.radiusPixels);

    // Inner fill (weight color)
    this.graphics.fillStyle(weightColor, 0.85);
    this.graphics.fillCircle(0, 0, this.radiusPixels * 0.78);

    // Class indicator ring
    this.graphics.lineStyle(2, ownerColor, 0.8);
    this.graphics.strokeCircle(0, 0, this.radiusPixels * 0.9);

    // King indicator
    if (this.isKing) {
      this.graphics.lineStyle(3, 0xffd700, 1);
      this.graphics.strokeCircle(0, 0, this.radiusPixels + 3);
    }
  }

  /** Render damage cracks */
  renderDamage() {
    this.damageGraphics.clear();
    if (this.maxHP === Infinity || this.hp >= this.maxHP) return;

    const damageRatio = 1 - (this.hp / this.maxHP);
    const crackCount = Math.ceil(damageRatio * 4);

    this.damageGraphics.lineStyle(2, COLORS.DAMAGE_CRACK, 0.8);
    for (let i = 0; i < crackCount; i++) {
      const angle = (i / crackCount) * Math.PI * 2 + 0.3;
      const innerR = this.radiusPixels * 0.2;
      const outerR = this.radiusPixels * (0.5 + damageRatio * 0.4);
      this.damageGraphics.lineBetween(
        Math.cos(angle) * innerR,
        Math.sin(angle) * innerR,
        Math.cos(angle) * outerR,
        Math.sin(angle) * outerR,
      );
    }
  }

  /** Apply damage from spikes */
  damage(amount = 1) {
    if (this.weightData.spikeImmune) return false;
    this.hp -= amount;
    this.renderDamage();
    if (this.hp <= 0) {
      return true; // should be destroyed
    }
    return false;
  }

  /** Change weight (for modifiers) */
  changeWeight(delta) {
    const newWeight = clamp(this.weight + delta, BALL_MIN_WEIGHT, BALL_MAX_WEIGHT);
    if (newWeight === this.weight) return;

    const oldWeight = this.weight;
    this.weight = newWeight;
    this.weightData = getWeightClass(newWeight);

    // Update physics properties
    this.scene.matter.body.set(this.body, 'mass', this.weightData.mass);
    this.scene.matter.body.set(this.body, 'friction', this.weightData.friction);
    this.scene.matter.body.set(this.body, 'frictionAir', this.weightData.frictionAir);
    this.scene.matter.body.set(this.body, 'restitution', this.weightData.restitution);

    // Update HP based on new class
    this.maxHP = this.weightData.maxHP;
    this.hp = Math.min(this.hp, this.maxHP);

    // Update radius
    const newRadius = BALL_RADIUS_POINTS * POINT_TO_PIXEL * this.weightData.radiusScale;
    this.radiusPixels = newRadius;

    // Update weight text
    this.weightText.setText(String(this.weight));
    this.weightText.setFontSize(`${Math.round(this.radiusPixels * 0.9)}px`);

    // Re-render
    this.render();
    this.renderDamage();

    // Clear modifier text
    this.modifierText.setVisible(false);
    this.pendingModifiers = [];

    return { oldWeight, newWeight };
  }

  /** Show pending modifier indicator */
  showModifierIndicator(delta) {
    const sign = delta > 0 ? '+' : '';
    const existing = this.pendingModifiers.reduce((sum, d) => sum + d, 0);
    const total = existing + delta;
    const totalSign = total > 0 ? '+' : '';
    this.pendingModifiers.push(delta);
    this.modifierText.setText(`${totalSign}${total}`);
    this.modifierText.setVisible(true);
  }

  /** Set selected state */
  setSelected(selected) {
    this.isSelected = selected;
  }

  /** Update position of graphics to follow Matter body */
  update() {
    if (this.isDestroyed) return;

    const x = this.body.position.x;
    const y = this.body.position.y;

    this.graphics.setPosition(x, y);
    this.damageGraphics.setPosition(x, y);
    this.weightText.setPosition(x, y);
    this.modifierText.setPosition(x, y - this.radiusPixels - 10);

    // Selection highlight
    this.highlightGraphics.clear();
    if (this.isSelected) {
      this.highlightGraphics.lineStyle(3, 0xffffff, 0.6 + Math.sin(Date.now() * 0.005) * 0.3);
      this.highlightGraphics.strokeCircle(x, y, this.radiusPixels + 5);
    }
  }

  /** Destroy ball - remove from scene */
  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Remove Matter body
    if (this.body) {
      this.scene.matter.world.remove(this.body);
    }

    // Remove graphics
    if (this.graphics) this.graphics.destroy();
    if (this.damageGraphics) this.damageGraphics.destroy();
    if (this.weightText) this.weightText.destroy();
    if (this.modifierText) this.modifierText.destroy();
    if (this.highlightGraphics) this.highlightGraphics.destroy();
  }

  /** Apply an impulse vector to this ball */
  applyImpulse(impulseX, impulseY) {
    if (this.isDestroyed || !this.body) return;
    this.scene.matter.body.applyForce(this.body, this.body.position, {
      x: impulseX,
      y: impulseY,
    });
  }

  _getOwnerColor() {
    switch (this.owner) {
      case 'player': return COLORS.PLAYER_BALL;
      case 'enemy': return COLORS.ENEMY_BALL;
      case 'player2': return COLORS.PLAYER2_BALL;
      case 'friendly': return COLORS.FRIENDLY_BALL;
      default: return COLORS.PLAYER_BALL;
    }
  }
}
