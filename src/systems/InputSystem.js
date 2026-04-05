// ============================================================
// InputSystem.js — Pull-release mechanic, trajectory, force cost
// ============================================================

import { MAX_PULL_DISTANCE, MAX_IMPULSE_MAGNITUDE, FORCE_COST_MULTIPLIER, EVENTS, TURN_STATE } from '../config/Constants.js';
import { distance, angleBetween, normalizeVector, clamp } from '../utils/MathUtils.js';
import EventBus from '../state/EventBus.js';
import TrajectoryRenderer from '../rendering/TrajectoryRenderer.js';

export default class InputSystem {
  constructor(scene, gameState, forceSystem) {
    this.scene = scene;
    this.gameState = gameState;
    this.forceSystem = forceSystem;
    this.trajectoryRenderer = new TrajectoryRenderer(scene);

    this.isDragging = false;
    this.selectedBall = null;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Input events
    scene.input.on('pointerdown', this._onPointerDown, this);
    scene.input.on('pointermove', this._onPointerMove, this);
    scene.input.on('pointerup', this._onPointerUp, this);
  }

  /** Enable/disable input processing */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this._cancelDrag();
    }
  }

  update() {
    // Nothing to poll — all event-driven
  }

  _onPointerDown(pointer) {
    if (this.gameState.turnState !== TURN_STATE.PLAYER_AIM) return;

    // Find if we clicked on a player ball
    const activeOwner = this.gameState.activePlayer;
    const playerBalls = this.gameState.getAliveBalls(activeOwner);

    for (const ball of playerBalls) {
      const dist = distance(pointer.worldX, pointer.worldY, ball.x, ball.y);
      if (dist <= ball.radiusPixels + 10) {
        this.isDragging = true;
        this.selectedBall = ball;
        this.dragStartX = ball.x;
        this.dragStartY = ball.y;
        ball.setSelected(true);
        return;
      }
    }
  }

  _onPointerMove(pointer) {
    if (!this.isDragging || !this.selectedBall) return;

    const ball = this.selectedBall;
    const dx = pointer.worldX - this.dragStartX;
    const dy = pointer.worldY - this.dragStartY;
    const pullDist = distance(0, 0, dx, dy);

    if (pullDist < 5) {
      this.trajectoryRenderer.hide();
      return;
    }

    // Power is clamped 0-1 based on pull distance
    const power = clamp(pullDist / MAX_PULL_DISTANCE, 0, 1);

    // Direction is OPPOSITE to drag (pull back to shoot forward)
    const norm = normalizeVector(-dx, -dy);

    // Calculate force cost
    const forceCost = this.forceSystem.calculateCost(power, ball.weight);
    const canAfford = this.forceSystem.canAfford(forceCost);

    // Draw trajectory
    this.trajectoryRenderer.draw(
      ball.x, ball.y,
      norm.x, norm.y,
      power,
      forceCost,
      canAfford
    );
  }

  _onPointerUp(pointer) {
    if (!this.isDragging || !this.selectedBall) return;

    const ball = this.selectedBall;
    const dx = pointer.worldX - this.dragStartX;
    const dy = pointer.worldY - this.dragStartY;
    const pullDist = distance(0, 0, dx, dy);

    ball.setSelected(false);
    this.trajectoryRenderer.hide();
    this.isDragging = false;
    this.selectedBall = null;

    // Minimum pull threshold
    if (pullDist < 10) return;

    // Calculate shot
    const power = clamp(pullDist / MAX_PULL_DISTANCE, 0, 1);
    const forceCost = this.forceSystem.calculateCost(power, ball.weight);

    // Check if we can afford it
    if (!this.forceSystem.canAfford(forceCost)) {
      // Flash warning — can't afford
      this._showWarning('Not enough Force!');
      return;
    }

    // Spend force
    this.forceSystem.spend(forceCost);

    // Calculate impulse (opposite to drag direction)
    const norm = normalizeVector(-dx, -dy);
    const impulseMag = power * MAX_IMPULSE_MAGNITUDE;

    // Heavier balls get proportionally less impulse per force spent
    // but we already factored weight into the force cost
    const impulseX = norm.x * impulseMag;
    const impulseY = norm.y * impulseMag;

    // Fire!
    ball.applyImpulse(impulseX, impulseY);

    EventBus.emit(EVENTS.SHOT_FIRED, {
      ball,
      impulseX,
      impulseY,
      power,
      forceCost,
    });
  }

  _cancelDrag() {
    if (this.selectedBall) {
      this.selectedBall.setSelected(false);
    }
    this.isDragging = false;
    this.selectedBall = null;
    this.trajectoryRenderer.hide();
  }

  _showWarning(text) {
    const warning = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY - 50,
      text,
      {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#f44336',
        stroke: '#000000',
        strokeThickness: 3,
      }
    ).setOrigin(0.5, 0.5).setDepth(30);

    this.scene.tweens.add({
      targets: warning,
      alpha: 0,
      y: warning.y - 30,
      duration: 1000,
      onComplete: () => warning.destroy(),
    });
  }

  destroy() {
    this.scene.input.off('pointerdown', this._onPointerDown, this);
    this.scene.input.off('pointermove', this._onPointerMove, this);
    this.scene.input.off('pointerup', this._onPointerUp, this);
    this.trajectoryRenderer.destroy();
  }
}
