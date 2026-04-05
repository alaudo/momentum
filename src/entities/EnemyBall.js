// ============================================================
// EnemyBall.js — Enemy ball
// ============================================================

import Ball from './Ball.js';

export default class EnemyBall extends Ball {
  constructor(scene, config) {
    super(scene, { ...config, owner: 'enemy' });
  }
}
