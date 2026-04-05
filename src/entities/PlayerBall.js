// ============================================================
// PlayerBall.js — Player-owned ball
// ============================================================

import Ball from './Ball.js';

export default class PlayerBall extends Ball {
  constructor(scene, config) {
    super(scene, { ...config, owner: config.owner || 'player' });
    this.selectable = true;
  }
}
