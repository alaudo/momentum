// ============================================================
// PreloadScene.js — Generate procedural textures (placeholder)
// ============================================================

import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  create() {
    // All graphics are procedural, no assets to preload
    // Transition to main menu
    this.scene.start('MainMenuScene');
  }
}
