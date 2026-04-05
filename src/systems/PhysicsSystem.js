// ============================================================
// PhysicsSystem.js — Matter.js config, collision handling, settle
// ============================================================

import { MOTION_THRESHOLD, MOTION_TIMEOUT, EVENTS, CATEGORY } from '../config/Constants.js';
import EventBus from '../state/EventBus.js';

export default class PhysicsSystem {
  constructor(scene, gameState) {
    this.scene = scene;
    this.gameState = gameState;
    this.isWaitingForSettle = false;
    this.settleStartTime = 0;
    this.settleCheckDelay = 300; // ms before we start checking

    // Configure Matter world
    // Don't call setBounds() — WallBuilder creates explicit perimeter walls
    // with proper collision filters. Default Phaser bounds lack gameObject
    // references and would trigger the same MatterCollisionEvents emit error.
    scene.matter.world.engine.gravity.y = 0; // Top-down, no gravity
    scene.matter.world.engine.gravity.x = 0;

    // Collision events
    scene.matter.world.on('collisionstart', this._onCollisionStart.bind(this));
  }

  /** Start waiting for all balls to settle after a shot */
  startSettleWatch() {
    this.isWaitingForSettle = true;
    this.settleStartTime = Date.now();
  }

  /** Check if all balls have settled (called each frame) */
  update() {
    if (!this.isWaitingForSettle) return;

    const elapsed = Date.now() - this.settleStartTime;

    // Don't check for the first few hundred ms (balls haven't started moving yet)
    if (elapsed < this.settleCheckDelay) return;

    // Check if all balls are stopped
    const allBalls = this.gameState.getAllBalls().filter(b => !b.isDestroyed);
    const allStopped = allBalls.every(b => !b.isMoving());

    if (allStopped || elapsed > MOTION_TIMEOUT) {
      if (elapsed > MOTION_TIMEOUT) {
        // Force stop all balls
        for (const ball of allBalls) {
          if (ball.body) {
            this.scene.matter.body.setVelocity(ball.body, { x: 0, y: 0 });
          }
        }
      }
      this.isWaitingForSettle = false;
      EventBus.emit(EVENTS.BODIES_SETTLED);
    }
  }

  _onCollisionStart(event) {
    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;

      // Ball-Ball collision
      if (bodyA.ballRef && bodyB.ballRef) {
        const intensity = this._getCollisionIntensity(pair);
        EventBus.emit('collision_ball_ball', {
          ballA: bodyA.ballRef,
          ballB: bodyB.ballRef,
          intensity,
          contactX: pair.collision.supports[0]?.x || (bodyA.position.x + bodyB.position.x) / 2,
          contactY: pair.collision.supports[0]?.y || (bodyA.position.y + bodyB.position.y) / 2,
        });
      }

      // Ball-Bumper collision
      if ((bodyA.ballRef && bodyB.bumperRef) || (bodyB.ballRef && bodyA.bumperRef)) {
        const ball = bodyA.ballRef || bodyB.ballRef;
        const bumper = bodyA.bumperRef || bodyB.bumperRef;
        EventBus.emit('collision_ball_bumper', {
          ball,
          bumper,
          contactX: pair.collision.supports[0]?.x || bumper.x,
          contactY: pair.collision.supports[0]?.y || bumper.y,
        });
      }

      // Ball-Wall collision
      if ((bodyA.ballRef && bodyB.label === 'wall') || (bodyB.ballRef && bodyA.label === 'wall')) {
        const ball = bodyA.ballRef || bodyB.ballRef;
        EventBus.emit('collision_ball_wall', { ball });
      }
    }
  }

  _getCollisionIntensity(pair) {
    const { bodyA, bodyB } = pair;
    const relVelX = bodyA.velocity.x - bodyB.velocity.x;
    const relVelY = bodyA.velocity.y - bodyB.velocity.y;
    return Math.sqrt(relVelX * relVelX + relVelY * relVelY);
  }

  destroy() {
    this.scene.matter.world.off('collisionstart');
  }
}
