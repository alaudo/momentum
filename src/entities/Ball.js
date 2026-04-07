// ============================================================
// Ball.js — Base ball entity (Matter body + Phaser Graphics)
// ============================================================

import { getWeightClass } from '../config/WeightClassData.js';
import {
  BALL_RADIUS_POINTS, POINT_TO_PIXEL, CATEGORY, MOTION_THRESHOLD,
  COLORS, BALL_MIN_WEIGHT, BALL_MAX_WEIGHT, WEIGHT_CLASS,
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

    // Weight text — high-contrast with shadow for readability
    const textSize = Math.max(14, Math.round(this.radiusPixels * 1.1));
    this.weightText = scene.add.text(config.x, config.y, String(this.weight), {
      fontSize: `${textSize}px`,
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: Math.max(3, Math.round(textSize * 0.22)),
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#000000',
        blur: 3,
        fill: true,
        stroke: true,
      },
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
    const classColor = this._getClassColor();

    this.graphics.clear();

    // Outer ring (owner color)
    this.graphics.fillStyle(ownerColor, 1);
    this.graphics.fillCircle(0, 0, this.radiusPixels);

    // Inner fill — owner-tinted background so enemy/friendly are clearly distinct
    // Enemy: reddish tint over weight color, Friendly: greenish tint
    const bgColor = this._getBackgroundTint();
    this.graphics.fillStyle(bgColor, 0.5);
    this.graphics.fillCircle(0, 0, this.radiusPixels * 0.78);

    // Weight color layer on top at lower opacity
    this.graphics.fillStyle(weightColor, 0.55);
    this.graphics.fillCircle(0, 0, this.radiusPixels * 0.78);

    // Contrast backing for weight text (dark semi-transparent circle behind text)
    this.graphics.fillStyle(0x000000, 0.35);
    this.graphics.fillCircle(0, 0, this.radiusPixels * 0.52);

    // Class indicator ring — colored by weight class (Balloon=cyan, Wooden=amber, Heavy=grey)
    this.graphics.lineStyle(3, classColor, 0.9);
    this.graphics.strokeCircle(0, 0, this.radiusPixels * 0.9);

    // Second thin outer ring for clarity
    this.graphics.lineStyle(1.5, classColor, 0.5);
    this.graphics.strokeCircle(0, 0, this.radiusPixels);

    // Owner indicator pattern for enemy/friendly distinction
    if (this.owner === 'enemy') {
      // Bold red X pattern inside the ball to clearly mark as enemy
      this.graphics.lineStyle(2, 0xff0000, 0.4);
      const r = this.radiusPixels * 0.55;
      this.graphics.lineBetween(-r, -r, r, r);
      this.graphics.lineBetween(r, -r, -r, r);
      // Red dots at the ends
      this.graphics.fillStyle(0xff0000, 0.35);
      this.graphics.fillCircle(-r * 0.7, 0, 2.5);
      this.graphics.fillCircle(r * 0.7, 0, 2.5);
      this.graphics.fillCircle(0, -r * 0.7, 2.5);
      this.graphics.fillCircle(0, r * 0.7, 2.5);
    } else if (this.owner === 'friendly') {
      // Small shield/diamond inside for friendly
      this.graphics.lineStyle(1.5, 0x66bb6a, 0.4);
      const r = this.radiusPixels * 0.35;
      this.graphics.strokeCircle(0, 0, r);
      // Small dot in center
      this.graphics.fillStyle(0x66bb6a, 0.3);
      this.graphics.fillCircle(0, 0, r * 0.4);
    }

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
    const newTextSize = Math.max(14, Math.round(this.radiusPixels * 1.1));
    this.weightText.setText(String(this.weight));
    this.weightText.setFontSize(`${newTextSize}px`);
    this.weightText.setStroke('#000000', Math.max(3, Math.round(newTextSize * 0.22)));

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
    const angle = this.body.angle || 0;

    this.graphics.setPosition(x, y);
    this.graphics.setRotation(angle);
    this.damageGraphics.setPosition(x, y);
    this.damageGraphics.setRotation(angle);
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

  _getClassColor() {
    switch (this.weightData.class) {
      case WEIGHT_CLASS.BALLOON: return COLORS.CLASS_BALLOON;
      case WEIGHT_CLASS.WOODEN:  return COLORS.CLASS_WOODEN;
      case WEIGHT_CLASS.HEAVY:   return COLORS.CLASS_HEAVY;
      default: return 0xffffff;
    }
  }

  _getBackgroundTint() {
    switch (this.owner) {
      case 'player':   return 0x1a3a5a; // dark blue tint
      case 'enemy':    return 0x8a2020; // strong red tint — very noticeable
      case 'player2':  return 0x5a4a1a; // dark amber tint
      case 'friendly': return 0x1a5a2a; // dark green tint
      default:         return 0x2a2a2a;
    }
  }
}
