// ============================================================
// SeedInputScene.js — Seed entry for Rogue/Skirmish/PvP
// ============================================================

import Phaser from 'phaser';
import { Button } from '../rendering/UIComponents.js';
import { GAME_MODE, DIFFICULTY } from '../config/Constants.js';

export default class SeedInputScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SeedInputScene' });
  }

  init(data) {
    this.gameMode = data.mode || GAME_MODE.ROGUE;
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a1a');

    // Title
    const modeNames = {
      [GAME_MODE.ROGUE]: 'ROGUE',
      [GAME_MODE.SKIRMISH]: 'SKIRMISH',
      [GAME_MODE.PVP]: 'PVP (LOCAL)',
    };

    this.add.text(width / 2, height * 0.12, modeNames[this.gameMode] || 'NEW GAME', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#4fc3f7',
    }).setOrigin(0.5, 0.5);

    // Seed label
    this.add.text(width / 2, height * 0.25, 'Enter Seed (or leave blank for random):', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#b0bec5',
    }).setOrigin(0.5, 0.5);

    // Seed display
    this.currentSeed = this._generateRandomSeed();
    this.seedText = this.add.text(width / 2, height * 0.33, this.currentSeed, {
      fontSize: '22px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#1a1a3e',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5, 0.5);

    // Difficulty
    this.currentDifficulty = 1;
    this.add.text(width / 2, height * 0.45, 'Difficulty:', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#b0bec5',
    }).setOrigin(0.5, 0.5);

    this.diffText = this.add.text(width / 2, height * 0.52, `${this.currentDifficulty}`, {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffab40',
    }).setOrigin(0.5, 0.5);

    // Difficulty buttons
    new Button(this, width / 2 - 80, height * 0.52, '◄', {
      width: 50,
      height: 40,
      fontSize: '20px',
      onClick: () => this._changeDifficulty(-1),
    });

    new Button(this, width / 2 + 80, height * 0.52, '►', {
      width: 50,
      height: 40,
      fontSize: '20px',
      onClick: () => this._changeDifficulty(1),
    });

    // Randomize seed button
    new Button(this, width / 2, height * 0.65, 'RANDOMIZE SEED', {
      width: 200,
      height: 40,
      onClick: () => {
        this.currentSeed = this._generateRandomSeed();
        this.seedText.setText(this.currentSeed);
      },
    });

    // Start button
    new Button(this, width / 2, height * 0.78, 'START GAME', {
      width: 220,
      height: 55,
      fontSize: '20px',
      onClick: () => this._startGame(),
    });

    // Back button
    new Button(this, width / 2, height * 0.9, 'BACK', {
      width: 140,
      height: 40,
      fontSize: '14px',
      onClick: () => this.scene.start('MainMenuScene'),
    });

    // Keyboard input for seed
    this.input.keyboard.on('keydown', (event) => {
      if (event.key === 'Backspace') {
        this.currentSeed = this.currentSeed.slice(0, -1);
        this.seedText.setText(this.currentSeed || '(random)');
      } else if (event.key === 'Enter') {
        this._startGame();
      } else if (event.key.length === 1 && this.currentSeed.length < 20) {
        this.currentSeed += event.key;
        this.seedText.setText(this.currentSeed);
      }
    });
  }

  _changeDifficulty(delta) {
    this.currentDifficulty = Math.max(DIFFICULTY.MIN,
      Math.min(DIFFICULTY.MAX, this.currentDifficulty + delta));
    this.diffText.setText(`${this.currentDifficulty}`);
  }

  _generateRandomSeed() {
    const words = ['alpha', 'beta', 'gamma', 'delta', 'omega', 'nova', 'star', 'void',
      'pulse', 'drift', 'orbit', 'flux', 'ion', 'nebula', 'quasar', 'comet'];
    const w1 = words[Math.floor(Math.random() * words.length)];
    const w2 = words[Math.floor(Math.random() * words.length)];
    return `${w1}${w2.charAt(0).toUpperCase() + w2.slice(1)}`;
  }

  _startGame() {
    const seed = this.currentSeed || this._generateRandomSeed();
    const fullSeed = `${seed}-${this.currentDifficulty}`;

    this.scene.start('GameScene', {
      mode: this.gameMode,
      seed: fullSeed,
      difficulty: this.currentDifficulty,
    });
  }
}
