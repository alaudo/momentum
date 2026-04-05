// ============================================================
// HUDScene.js — Overlay: Force bar, turn info, scores
// ============================================================

import Phaser from 'phaser';
import { EVENTS, FORCE_MAX, COLORS, TURN_STATE } from '../config/Constants.js';
import EventBus from '../state/EventBus.js';
import { ProgressBar } from '../rendering/UIComponents.js';

export default class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene' });
  }

  init(data) {
    this.gameState = data.gameState;
    this.forceSystem = data.forceSystem;
  }

  create() {
    const { width, height } = this.cameras.main;

    // HUD panel background (top bar)
    const panelHeight = 50;
    this.panelBg = this.add.graphics();
    this.panelBg.fillStyle(COLORS.HUD_BG, 0.88);
    this.panelBg.fillRect(0, 0, width, panelHeight);
    this.panelBg.lineStyle(1, 0x333355, 0.6);
    this.panelBg.lineBetween(0, panelHeight, width, panelHeight);

    // Force label
    this.add.text(10, 8, 'FORCE', {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#78909c',
    });

    // Force bar
    this.forceBar = new ProgressBar(this, 10, 24, 150, 16, {
      fillColor: COLORS.FORCE_BAR,
      lowColor: COLORS.FORCE_BAR_LOW,
    });

    // Force text
    this.forceText = this.add.text(170, 24, `${FORCE_MAX}`, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#e0e0e0',
    });

    // Turn counter
    this.turnText = this.add.text(width / 2, 15, 'Turn: 1', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#e0e0e0',
    }).setOrigin(0.5, 0);

    // Active player indicator
    this.playerText = this.add.text(width / 2, 33, 'Your Turn', {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#4fc3f7',
    }).setOrigin(0.5, 0);

    // Score
    this.scoreText = this.add.text(width - 10, 8, 'Score: 0', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffab40',
    }).setOrigin(1, 0);

    // Enemies remaining
    this.enemiesText = this.add.text(width - 10, 28, 'Enemies: 0', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#ef5350',
    }).setOrigin(1, 0);

    // Pause hint
    this.add.text(width / 2, height - 15, 'Press ESC to pause', {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#455a64',
    }).setOrigin(0.5, 1);

    // Time Attack timer (if applicable)
    this.timerText = this.add.text(width / 2, panelHeight + 10, '', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ff7043',
    }).setOrigin(0.5, 0).setVisible(false);

    // Bind events
    EventBus.on(EVENTS.FORCE_CHANGED, this._onForceChanged, this);
    EventBus.on(EVENTS.TURN_ADVANCED, this._onTurnAdvanced, this);
    EventBus.on(EVENTS.BALL_DESTROYED, this._onBallDestroyed, this);
    EventBus.on(EVENTS.STATE_CHANGED, this._onStateChanged, this);

    // Pause key
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.launch('PauseScene', { gameState: this.gameState });
      this.scene.pause('GameScene');
    });

    // Initial update
    this._refreshAll();
  }

  update(time) {
    // Update timer if time attack
    if (this.gameState.missionType === 'time_attack' && this.gameState.missionData?.levelData?.timeLimit) {
      const gameScene = this.scene.get('GameScene');
      if (gameScene && gameScene.startTime) {
        const elapsed = (time - gameScene.startTime) / 1000;
        const remaining = Math.max(0, gameScene.timeLimit - elapsed);
        this.timerText.setText(`⏱ ${remaining.toFixed(1)}s`);
        this.timerText.setVisible(true);
        if (remaining < 10) {
          this.timerText.setColor('#f44336');
        }
      }
    }
  }

  _onForceChanged(data) {
    const ratio = data.current / data.max;
    this.forceBar.setValue(ratio);
    this.forceText.setText(`${Math.round(data.current)}`);
  }

  _onTurnAdvanced(data) {
    this.turnText.setText(`Turn: ${data.turnNumber}`);
    this._updatePlayerText();
    this._refreshAll();
  }

  _onBallDestroyed() {
    this._refreshAll();
  }

  _onStateChanged(data) {
    this._updatePlayerText();
  }

  _updatePlayerText() {
    const state = this.gameState.turnState;
    const active = this.gameState.activePlayer;

    if (state === TURN_STATE.AI_THINK) {
      this.playerText.setText('AI Thinking...');
      this.playerText.setColor('#ef5350');
    } else if (state === TURN_STATE.PHYSICS_ACTIVE) {
      this.playerText.setText('In motion...');
      this.playerText.setColor('#ffab40');
    } else if (active === 'player2') {
      this.playerText.setText('Player 2\'s Turn');
      this.playerText.setColor('#ffa726');
    } else {
      this.playerText.setText('Your Turn');
      this.playerText.setColor('#4fc3f7');
    }
  }

  _refreshAll() {
    // Update force
    const force = this.forceSystem.getCurrentForce();
    this.forceBar.setValue(force / FORCE_MAX);
    this.forceText.setText(`${Math.round(force)}`);

    // Update score
    this.scoreText.setText(`Score: ${this.gameState.score}`);

    // Update enemies count
    const enemies = this.gameState.getAliveBalls('enemy');
    this.enemiesText.setText(`Enemies: ${enemies.length}`);
  }

  shutdown() {
    EventBus.off(EVENTS.FORCE_CHANGED, this._onForceChanged, this);
    EventBus.off(EVENTS.TURN_ADVANCED, this._onTurnAdvanced, this);
    EventBus.off(EVENTS.BALL_DESTROYED, this._onBallDestroyed, this);
    EventBus.off(EVENTS.STATE_CHANGED, this._onStateChanged, this);
  }
}
