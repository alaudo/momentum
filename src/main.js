// ============================================================
// main.js — Entry point: Phaser game config, boot
// ============================================================

import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import SeedInputScene from './scenes/SeedInputScene.js';
import CampaignSelectScene from './scenes/CampaignSelectScene.js';
import GameScene from './scenes/GameScene.js';
import HUDScene from './scenes/HUDScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 0 },
      enableSleeping: false,
      debug: false,
    },
  },
  scene: [
    BootScene,
    MainMenuScene,
    SeedInputScene,
    CampaignSelectScene,
    GameScene,
    HUDScene,
    PauseScene,
    GameOverScene,
  ],
};

const game = new Phaser.Game(config);

// Expose game instance for testing/debugging
window.__PHASER_GAME__ = game;

export default game;
