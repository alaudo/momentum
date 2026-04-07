// ============================================================
// MainMenuScene.js — Title screen, mode selection
// ============================================================

import Phaser from 'phaser';
import { Button } from '../rendering/UIComponents.js';
import { COLORS, GAME_MODE } from '../config/Constants.js';
import AudioSystem from '../systems/AudioSystem.js';

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a1a');

    // Background stars
    const bgGfx = this.add.graphics();
    for (let i = 0; i < 80; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.6 + 0.2;
      bgGfx.fillStyle(0xffffff, alpha);
      bgGfx.fillCircle(sx, sy, size);
    }

    // Title
    this.add.text(width / 2, height * 0.15, 'MOMENTUM', {
      fontSize: '52px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#4fc3f7',
      stroke: '#0d47a1',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    this.add.text(width / 2, height * 0.23, 'STRANDED', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#80cbc4',
      stroke: '#004d40',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);

    // Subtitle
    this.add.text(width / 2, height * 0.32, 'A sci-fi survival physics game', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#78909c',
    }).setOrigin(0.5, 0.5);

    // Mode buttons
    const btnY = height * 0.45;
    const btnSpacing = 65;

    this.buttons = [];

    this.buttons.push(new Button(this, width / 2, btnY, 'ROGUE', {
      width: 220,
      height: 50,
      onClick: () => this._startMode(GAME_MODE.ROGUE),
    }));

    this.buttons.push(new Button(this, width / 2, btnY + btnSpacing, 'SKIRMISH', {
      width: 220,
      height: 50,
      onClick: () => this._startMode(GAME_MODE.SKIRMISH),
    }));

    this.buttons.push(new Button(this, width / 2, btnY + btnSpacing * 2, 'PVP (LOCAL)', {
      width: 220,
      height: 50,
      onClick: () => this._startMode(GAME_MODE.PVP),
    }));

    this.buttons.push(new Button(this, width / 2, btnY + btnSpacing * 3, 'CAMPAIGN', {
      width: 220,
      height: 50,
      onClick: () => this.scene.start('CampaignSelectScene'),
    }));

    // Version
    this.add.text(width - 10, height - 10, 'v0.1.0', {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#455a64',
    }).setOrigin(1, 1);

    // Audio toggle (bottom-left)
    // Create a lightweight AudioSystem just for the toggle state
    this._audioSys = new AudioSystem();

    const musicOn = this._audioSys.isMusicEnabled();
    this.musicText = this.add.text(10, height - 10, musicOn ? '[M] Music: ON' : '[M] Music: OFF', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: musicOn ? '#66bb6a' : '#78909c',
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });

    this.musicText.on('pointerdown', () => this._toggleMusic());

    const sfxOn = this._audioSys.isSoundEnabled();
    this.sfxText = this.add.text(10, height - 26, sfxOn ? '[S] SFX: ON' : '[S] SFX: OFF', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: sfxOn ? '#66bb6a' : '#78909c',
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });

    this.sfxText.on('pointerdown', () => this._toggleSFX());

    this.input.keyboard.on('keydown-M', () => this._toggleMusic());
    this.input.keyboard.on('keydown-S', () => this._toggleSFX());
  }

  _toggleMusic() {
    const newState = !this._audioSys.isMusicEnabled();
    this._audioSys.setMusicEnabled(newState);
    this.musicText.setText(newState ? '[M] Music: ON' : '[M] Music: OFF');
    this.musicText.setColor(newState ? '#66bb6a' : '#78909c');
  }

  _toggleSFX() {
    const newState = !this._audioSys.isSoundEnabled();
    this._audioSys.setEnabled(newState);
    this.sfxText.setText(newState ? '[S] SFX: ON' : '[S] SFX: OFF');
    this.sfxText.setColor(newState ? '#66bb6a' : '#78909c');
  }

  _startMode(mode) {
    this.scene.start('SeedInputScene', { mode });
  }
}
