// ============================================================
// GameOverScene.js — Win/loss summary
// ============================================================

import Phaser from 'phaser';
import { Button } from '../rendering/UIComponents.js';
import { COLORS, GAME_MODE } from '../config/Constants.js';
import PersistenceManager from '../state/PersistenceManager.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.result = data;
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a1a');

    const isWin = this.result.winner === 'player';

    // Result header
    this.add.text(width / 2, height * 0.12, isWin ? 'VICTORY!' : 'DEFEATED', {
      fontSize: '42px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: isWin ? '#4caf50' : '#f44336',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    // Message
    this.add.text(width / 2, height * 0.22, this.result.message || '', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#b0bec5',
    }).setOrigin(0.5, 0.5);

    // Stats
    const stats = [
      `Score: ${this.result.score || 0}`,
      `Turns: ${this.result.turns || 0}`,
      `Enemies Destroyed: ${this.result.enemiesDestroyed || 0}`,
      `Total Shots: ${this.result.totalShots || 0}`,
    ];

    if (this.result.seed) {
      stats.push(`Seed: ${this.result.seed}`);
    }

    stats.forEach((stat, i) => {
      this.add.text(width / 2, height * 0.32 + i * 25, stat, {
        fontSize: '15px',
        fontFamily: 'Arial, sans-serif',
        color: '#e0e0e0',
      }).setOrigin(0.5, 0.5);
    });

    // Save results
    this._saveResults();

    // Buttons
    const btnY = height * 0.65;

    if (isWin && this.result.mode === GAME_MODE.ROGUE) {
      new Button(this, width / 2, btnY, 'NEXT LEVEL', {
        width: 200,
        height: 50,
        onClick: () => this._nextLevel(),
      });
    }

    new Button(this, width / 2, btnY + 60, 'PLAY AGAIN', {
      width: 200,
      height: 50,
      onClick: () => this._playAgain(),
    });

    new Button(this, width / 2, btnY + 120, 'MAIN MENU', {
      width: 200,
      height: 50,
      onClick: () => this.scene.start('MainMenuScene'),
    });
  }

  _nextLevel() {
    // Increment difficulty for Rogue progression
    const newDiff = (this.result.difficulty || 1) + 1;
    const baseSeed = this.result.seed ? this.result.seed.split('-')[0] : 'rogue';
    this.scene.start('GameScene', {
      mode: this.result.mode,
      seed: `${baseSeed}-${newDiff}`,
      difficulty: newDiff,
    });
  }

  _playAgain() {
    if (this.result.mode === GAME_MODE.CAMPAIGN) {
      this.scene.start('GameScene', {
        mode: GAME_MODE.CAMPAIGN,
        missionId: this.result.missionId,
        missionData: this.result.missionData,
      });
    } else {
      this.scene.start('GameScene', {
        mode: this.result.mode,
        seed: this.result.seed,
        difficulty: this.result.difficulty,
      });
    }
  }

  _saveResults() {
    const mode = this.result.mode;

    if (mode === GAME_MODE.CAMPAIGN && this.result.winner === 'player' && this.result.missionId) {
      PersistenceManager.saveCampaignProgress(this.result.missionId, {
        score: this.result.score,
        turns: this.result.turns,
        date: new Date().toISOString(),
      });
    }

    if (mode === GAME_MODE.ROGUE || mode === GAME_MODE.SKIRMISH) {
      PersistenceManager.saveHighScore(mode, {
        seed: this.result.seed,
        score: this.result.score,
        turns: this.result.turns,
        difficulty: this.result.difficulty,
        date: new Date().toISOString(),
      });
    }
  }
}
