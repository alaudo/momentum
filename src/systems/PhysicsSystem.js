// ============================================================
// PhysicsSystem.js — Matter.js config, collision handling, settle,
// momentum-based bounce amplification and spin
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
            this.scene.matter.body.setAngularVelocity(ball.body, 0);
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

      // Ball-Ball collision — apply momentum transfer and spin
      if (bodyA.ballRef && bodyB.ballRef) {
        const intensity = this._getCollisionIntensity(pair);
        this._applyMomentumEffects(bodyA, bodyB, pair);

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
        // Add spin on bumper collision
        if (ball.body) {
          const spinDir = (ball.body.velocity.x * (ball.y - bumper.y) -
                          ball.body.velocity.y * (ball.x - bumper.x)) > 0 ? 1 : -1;
          this.scene.matter.body.setAngularVelocity(ball.body,
            ball.body.angularVelocity + spinDir * 0.05);
        }
        EventBus.emit('collision_ball_bumper', {
          ball,
          bumper,
          contactX: pair.collision.supports[0]?.x || bumper.x,
          contactY: pair.collision.supports[0]?.y || bumper.y,
        });
      }

      // Ball-Wall collision — add spin based on glancing angle
      if ((bodyA.ballRef && bodyB.label === 'wall') || (bodyB.ballRef && bodyA.label === 'wall')) {
        const ball = bodyA.ballRef || bodyB.ballRef;
        if (ball.body) {
          // Spin proportional to tangential velocity component
          const vx = ball.body.velocity.x;
          const vy = ball.body.velocity.y;
          const speed = Math.sqrt(vx * vx + vy * vy);
          if (speed > 0.5) {
            const spinAmount = speed * 0.02 * (Math.random() > 0.5 ? 1 : -1);
            this.scene.matter.body.setAngularVelocity(ball.body,
              ball.body.angularVelocity + spinAmount);
          }
        }
        EventBus.emit('collision_ball_wall', { ball });
      }
    }
  }

  /**
   * Apply momentum-based effects on ball-ball collisions:
   * - Lighter ball gets knocked back harder by heavier ball (mass ratio)
   * - Both balls get angular velocity (spin) from off-center impacts
   */
  _applyMomentumEffects(bodyA, bodyB, pair) {
    const ballA = bodyA.ballRef;
    const ballB = bodyB.ballRef;
    if (!ballA || !ballB) return;

    const massA = bodyA.mass;
    const massB = bodyB.mass;
    const massRatio = massA / massB;

    // Calculate contact normal
    const dx = bodyB.position.x - bodyA.position.x;
    const dy = bodyB.position.y - bodyA.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    // Relative velocity along normal
    const relVelX = bodyA.velocity.x - bodyB.velocity.x;
    const relVelY = bodyA.velocity.y - bodyB.velocity.y;
    const relSpeed = relVelX * nx + relVelY * ny;

    if (relSpeed < 0.3) return; // ignore very weak collisions

    // Apply momentum boost: if A is heavier than B, B gets extra kick
    // and vice versa. The boost is proportional to mass ratio.
    const boostFactor = 0.15; // strength of the extra momentum effect

    if (massRatio > 1.3) {
      // A is heavier → B gets extra velocity
      const boost = relSpeed * boostFactor * (massRatio - 1);
      this.scene.matter.body.setVelocity(bodyB, {
        x: bodyB.velocity.x + nx * boost,
        y: bodyB.velocity.y + ny * boost,
      });
    } else if (massRatio < 0.77) {
      // B is heavier → A gets extra velocity (bounced back)
      const boost = relSpeed * boostFactor * (1 / massRatio - 1);
      this.scene.matter.body.setVelocity(bodyA, {
        x: bodyA.velocity.x - nx * boost,
        y: bodyA.velocity.y - ny * boost,
      });
    }

    // Apply spin to both balls based on off-center impact
    // Cross product of relative position and velocity → spin direction
    const crossA = (bodyB.position.x - bodyA.position.x) * relVelY -
                   (bodyB.position.y - bodyA.position.y) * relVelX;
    const spinScale = 0.003;
    this.scene.matter.body.setAngularVelocity(bodyA,
      bodyA.angularVelocity + crossA * spinScale / massA);
    this.scene.matter.body.setAngularVelocity(bodyB,
      bodyB.angularVelocity - crossA * spinScale / massB);
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
