// ============================================================
// BootScene.js — Show loading text, transition to MainMenu
// ============================================================

import Phaser from 'phaser';
import { initDebug } from '../utils/DebugUtils.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    initDebug();

    const { width, height } = this.cameras.main;

    // Loading text
    this.add.text(width / 2, height / 2, 'LOADING...', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#4fc3f7',
    }).setOrigin(0.5, 0.5);

    // Brief delay then go to main menu
    this.time.delayedCall(300, () => {
      this.scene.start('MainMenuScene');
    });
  }
}
