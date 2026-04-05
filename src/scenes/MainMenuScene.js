// ============================================================
// MainMenuScene.js — Title screen, mode selection
// ============================================================

import Phaser from 'phaser';
import { Button } from '../rendering/UIComponents.js';
import { COLORS, GAME_MODE } from '../config/Constants.js';

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
  }

  _startMode(mode) {
    this.scene.start('SeedInputScene', { mode });
  }
}
