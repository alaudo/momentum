// ============================================================
// PauseScene.js — Pause overlay
// ============================================================

import Phaser from 'phaser';
import { Button } from '../rendering/UIComponents.js';
import { COLORS } from '../config/Constants.js';

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Dim overlay
    this.overlay = this.add.graphics();
    this.overlay.fillStyle(0x000000, 0.6);
    this.overlay.fillRect(0, 0, width, height);

    // Panel
    const pw = 280;
    const ph = 260;
    const px = (width - pw) / 2;
    const py = (height - ph) / 2;

    this.add.graphics()
      .fillStyle(COLORS.HUD_BG, 0.95)
      .fillRoundedRect(px, py, pw, ph, 12)
      .lineStyle(2, COLORS.UI_ACCENT, 0.6)
      .strokeRoundedRect(px, py, pw, ph, 12);

    this.add.text(width / 2, py + 30, 'PAUSED', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#4fc3f7',
    }).setOrigin(0.5, 0.5);

    new Button(this, width / 2, py + 90, 'RESUME', {
      width: 180,
      height: 45,
      onClick: () => {
        this.scene.resume('GameScene');
        this.scene.stop();
      },
    });

    new Button(this, width / 2, py + 150, 'RESTART', {
      width: 180,
      height: 45,
      onClick: () => {
        this.scene.stop('HUDScene');
        const gameScene = this.scene.get('GameScene');
        this.scene.stop();
        this.scene.start('GameScene', {
          mode: gameScene.gameMode,
          seed: gameScene.seed,
          difficulty: gameScene.difficulty,
          missionId: gameScene.missionId,
          missionData: gameScene.missionData,
        });
      },
    });

    new Button(this, width / 2, py + 210, 'QUIT TO MENU', {
      width: 180,
      height: 45,
      onClick: () => {
        this.scene.stop('GameScene');
        this.scene.stop('HUDScene');
        this.scene.stop();
        this.scene.start('MainMenuScene');
      },
    });

    // ESC to resume
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.resume('GameScene');
      this.scene.stop();
    });
  }
}
