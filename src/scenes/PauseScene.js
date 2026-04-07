// ============================================================
// PauseScene.js — Pause overlay with regenerate level option
// ============================================================

import Phaser from 'phaser';
import { Button } from '../rendering/UIComponents.js';
import { COLORS, DIFFICULTY } from '../config/Constants.js';

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    const gameScene = this.scene.get('GameScene');

    // Dim overlay
    this.overlay = this.add.graphics();
    this.overlay.fillStyle(0x000000, 0.6);
    this.overlay.fillRect(0, 0, width, height);

    // Panel — taller to fit new options
    const pw = 300;
    const ph = 400;
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

    // RESUME button
    new Button(this, width / 2, py + 80, 'RESUME', {
      width: 200,
      height: 45,
      onClick: () => {
        this.scene.resume('GameScene');
        this.scene.stop();
      },
    });

    // RESTART button (same seed)
    new Button(this, width / 2, py + 135, 'RESTART', {
      width: 200,
      height: 45,
      onClick: () => {
        this.scene.stop('HUDScene');
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

    // ---- NEW SEED / REGENERATE ----
    // Section label
    this.add.text(width / 2, py + 177, 'REGENERATE LEVEL', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#78909c',
    }).setOrigin(0.5, 0.5);

    // Seed display / input area
    this._currentSeed = this._extractBaseSeed(gameScene.seed);
    this._currentDifficulty = gameScene.difficulty || 1;

    this.seedText = this.add.text(width / 2, py + 200, this._currentSeed, {
      fontSize: '14px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#1a1a3e',
      padding: { x: 12, y: 5 },
    }).setOrigin(0.5, 0.5);

    // Randomize seed button
    new Button(this, width / 2 - 60, py + 230, 'RANDOM', {
      width: 100,
      height: 32,
      fontSize: '12px',
      onClick: () => {
        this._currentSeed = this._generateRandomSeed();
        this.seedText.setText(this._currentSeed);
      },
    });

    // Difficulty display
    this.diffText = this.add.text(width / 2 + 60, py + 230, `Diff: ${this._currentDifficulty}`, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffab40',
    }).setOrigin(0.5, 0.5);

    // Difficulty +/- buttons
    new Button(this, width / 2 + 25, py + 230, '◄', {
      width: 30,
      height: 30,
      fontSize: '14px',
      onClick: () => {
        this._currentDifficulty = Math.max(DIFFICULTY.MIN, this._currentDifficulty - 1);
        this.diffText.setText(`Diff: ${this._currentDifficulty}`);
      },
    });
    new Button(this, width / 2 + 95, py + 230, '►', {
      width: 30,
      height: 30,
      fontSize: '14px',
      onClick: () => {
        this._currentDifficulty = Math.min(DIFFICULTY.MAX, this._currentDifficulty + 1);
        this.diffText.setText(`Diff: ${this._currentDifficulty}`);
      },
    });

    // REGENERATE button
    new Button(this, width / 2, py + 270, 'REGENERATE', {
      width: 200,
      height: 42,
      fontSize: '16px',
      onClick: () => {
        const fullSeed = `${this._currentSeed}-${this._currentDifficulty}`;
        this.scene.stop('HUDScene');
        this.scene.stop();
        this.scene.start('GameScene', {
          mode: gameScene.gameMode,
          seed: fullSeed,
          difficulty: this._currentDifficulty,
          missionId: gameScene.missionId,
          missionData: gameScene.missionData,
        });
      },
    });

    // Keyboard input for seed editing
    this.input.keyboard.on('keydown', (event) => {
      if (event.key === 'Escape') {
        this.scene.resume('GameScene');
        this.scene.stop();
        return;
      }
      if (event.key === 'Backspace') {
        this._currentSeed = this._currentSeed.slice(0, -1);
        this.seedText.setText(this._currentSeed || '(type seed)');
      } else if (event.key === 'Enter') {
        // Quick regenerate on Enter
      } else if (event.key.length === 1 && this._currentSeed.length < 20) {
        this._currentSeed += event.key;
        this.seedText.setText(this._currentSeed);
      }
    });

    // QUIT TO MENU button
    new Button(this, width / 2, py + 330, 'QUIT TO MENU', {
      width: 200,
      height: 45,
      onClick: () => {
        this.scene.stop('GameScene');
        this.scene.stop('HUDScene');
        this.scene.stop();
        this.scene.start('MainMenuScene');
      },
    });

    // Current seed info
    this.add.text(width / 2, py + ph - 15, `Current: ${gameScene.seed}`, {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#546e7a',
    }).setOrigin(0.5, 0.5);
  }

  _extractBaseSeed(fullSeed) {
    const parts = fullSeed.split('-');
    // Remove the difficulty number at the end
    if (parts.length > 1 && !isNaN(parseInt(parts[parts.length - 1], 10))) {
      return parts.slice(0, -1).join('-');
    }
    return fullSeed;
  }

  _generateRandomSeed() {
    const words = ['alpha', 'beta', 'gamma', 'delta', 'omega', 'nova', 'star', 'void',
      'pulse', 'drift', 'orbit', 'flux', 'ion', 'nebula', 'quasar', 'comet'];
    const w1 = words[Math.floor(Math.random() * words.length)];
    const w2 = words[Math.floor(Math.random() * words.length)];
    return `${w1}${w2.charAt(0).toUpperCase() + w2.slice(1)}`;
  }
}
