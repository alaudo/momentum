// ============================================================
// HUDScene.js — Overlay: Force bar, turn info, scores, legend
// ============================================================

import Phaser from 'phaser';
import { EVENTS, FORCE_MAX, COLORS, TURN_STATE, WEIGHT_CLASS, TERRAIN } from '../config/Constants.js';
import EventBus from '../state/EventBus.js';
import { ProgressBar } from '../rendering/UIComponents.js';

// Legend entries: color, label, description, terrainType (for tile counting)
const LEGEND_ENTRIES = [
  { color: COLORS.SAFE_GROUND, label: 'Ground', desc: 'Normal terrain', terrainType: TERRAIN.SAFE },
  { color: COLORS.SAFE_SAND, label: 'Sand', desc: 'High friction', terrainType: TERRAIN.SAFE_SAND },
  { color: COLORS.SAFE_ICE, label: 'Ice', desc: 'Low friction, slippery', terrainType: TERRAIN.SAFE_ICE },
  { color: COLORS.ABYSS, label: 'Abyss', desc: 'Kills Class 2/3; Class 1 flies over', terrainType: TERRAIN.ABYSS },
  { color: COLORS.WATER, label: 'Water', desc: 'Class 2 floats; Class 3 sinks', terrainType: TERRAIN.WATER },
  { color: COLORS.SPIKES, label: 'Spikes', desc: 'Damages Class 1/2; Class 3 immune', terrainType: TERRAIN.SPIKES },
  { color: COLORS.FAN, label: 'Fan', desc: 'Pushes Class 1 (Balloon) balls', terrainTypes: ['fan_n', 'fan_s', 'fan_e', 'fan_w'] },
  { color: COLORS.STREAM, label: 'Stream', desc: 'Pushes Class 2 (Wooden) balls', terrainTypes: ['stream_n', 'stream_s', 'stream_e', 'stream_w'] },
  { color: COLORS.MODIFIER_PAD, label: 'Modifier', desc: 'Changes ball weight', terrainType: TERRAIN.MODIFIER_PAD },
  { color: COLORS.BOUNCY, label: 'Bumper', desc: 'Bounces balls with high force', isBumper: true },
  { isSeparator: true },
  { color: COLORS.CLASS_BALLOON, label: 'Class 1', desc: 'Balloon (w1-4): flies, spike-weak', isCircle: true },
  { color: COLORS.CLASS_WOODEN, label: 'Class 2', desc: 'Wooden (w5-8): floats, medium', isCircle: true },
  { color: COLORS.CLASS_HEAVY, label: 'Class 3', desc: 'Heavy (w9-12): spike-immune', isCircle: true },
];

export default class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene' });
  }

  init(data) {
    this.gameState = data.gameState;
    this.forceSystem = data.forceSystem;
    this.audioSystem = data.audioSystem || null;
    this.legendVisible = false;
    this.legendObjects = [];
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

    // Legend toggle hint (bottom-left)
    this.legendHint = this.add.text(10, height - 15, '[L] Legend', {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#78909c',
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });

    this.legendHint.on('pointerdown', () => this._toggleLegend());

    // Pause hint (bottom-center)
    this.add.text(width / 2, height - 15, 'Press ESC to pause', {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#455a64',
    }).setOrigin(0.5, 1);

    // Audio controls (bottom-right)
    this._musicOn = this.audioSystem ? this.audioSystem.isMusicEnabled() : true;
    this._sfxOn = this.audioSystem ? this.audioSystem.isSoundEnabled() : true;

    this.musicToggle = this.add.text(width - 10, height - 15, this._musicOn ? '[M] Music: ON' : '[M] Music: OFF', {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: this._musicOn ? '#66bb6a' : '#78909c',
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });

    this.musicToggle.on('pointerdown', () => this._toggleMusic());

    this.sfxToggle = this.add.text(width - 10, height - 28, this._sfxOn ? '[S] SFX: ON' : '[S] SFX: OFF', {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: this._sfxOn ? '#66bb6a' : '#78909c',
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });

    this.sfxToggle.on('pointerdown', () => this._toggleSFX());

    // Keyboard shortcuts for audio
    this.input.keyboard.on('keydown-M', () => this._toggleMusic());
    this.input.keyboard.on('keydown-S', () => this._toggleSFX());

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

    // Legend toggle key
    this.input.keyboard.on('keydown-L', () => {
      this._toggleLegend();
    });

    // Initial update
    this._refreshAll();
  }

  _toggleLegend() {
    this.legendVisible = !this.legendVisible;
    if (this.legendVisible) {
      this._showLegend();
    } else {
      this._hideLegend();
    }
  }

  _showLegend() {
    this._hideLegend(); // clear any existing

    const { width, height } = this.cameras.main;
    const panelW = 290;
    const entryH = 22;
    const padding = 10;
    const headerH = 28;
    // Calculate panel height accounting for separators being shorter
    const regularEntries = LEGEND_ENTRIES.filter(e => !e.isSeparator).length;
    const separatorEntries = LEGEND_ENTRIES.filter(e => e.isSeparator).length;
    const panelH = headerH + padding + regularEntries * entryH + separatorEntries * 12 + padding;
    const px = width - panelW - 10;
    const py = 55;

    // Count tiles for each terrain type
    const tileCounts = this._countTiles();

    // Panel background
    const bg = this.add.graphics().setDepth(80);
    bg.fillStyle(COLORS.HUD_BG, 0.92);
    bg.fillRoundedRect(px, py, panelW, panelH, 8);
    bg.lineStyle(1, 0x555588, 0.7);
    bg.strokeRoundedRect(px, py, panelW, panelH, 8);
    this.legendObjects.push(bg);

    // Title
    const title = this.add.text(px + panelW / 2, py + 6, 'TERRAIN LEGEND', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#b0bec5',
    }).setOrigin(0.5, 0).setDepth(81);
    this.legendObjects.push(title);

    // Close hint
    const closeHint = this.add.text(px + panelW - 8, py + 6, 'X', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#78909c',
    }).setOrigin(1, 0).setDepth(82).setInteractive({ useHandCursor: true });
    closeHint.on('pointerdown', () => this._toggleLegend());
    this.legendObjects.push(closeHint);

    // Entries
    let yOff = py + headerH + padding;
    for (const entry of LEGEND_ENTRIES) {
      if (entry.isSeparator) {
        // Draw a thin line separator
        const sepG = this.add.graphics().setDepth(81);
        sepG.lineStyle(1, 0x555588, 0.5);
        sepG.lineBetween(px + 10, yOff + 5, px + panelW - 10, yOff + 5);
        this.legendObjects.push(sepG);
        yOff += 12;
        continue;
      }

      // Color swatch — circle for class indicators, rounded rect for terrain
      const swatch = this.add.graphics().setDepth(81);
      if (entry.isCircle) {
        // Draw a ring (circle outline) to match ball class borders
        swatch.lineStyle(3, entry.color, 1);
        swatch.strokeCircle(px + 18, yOff + 10, 8);
        swatch.fillStyle(0x1a1a2e, 0.6);
        swatch.fillCircle(px + 18, yOff + 10, 6);
      } else {
        swatch.fillStyle(entry.color, 1);
        swatch.fillRoundedRect(px + 10, yOff + 2, 16, 16, 3);
        swatch.lineStyle(1, 0x888888, 0.5);
        swatch.strokeRoundedRect(px + 10, yOff + 2, 16, 16, 3);
      }
      this.legendObjects.push(swatch);

      // Count badge for terrain entries
      let countStr = '';
      if (entry.terrainType) {
        const count = tileCounts[entry.terrainType] || 0;
        countStr = ` (${count})`;
      } else if (entry.terrainTypes) {
        const count = entry.terrainTypes.reduce((sum, t) => sum + (tileCounts[t] || 0), 0);
        countStr = ` (${count})`;
      } else if (entry.isBumper) {
        const bumperCount = this.gameState.bumpers ? this.gameState.bumpers.length : 0;
        countStr = ` (${bumperCount})`;
      }

      // Label with count
      const label = this.add.text(px + 32, yOff + 2, entry.label + countStr, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#e0e0e0',
      }).setDepth(81);
      this.legendObjects.push(label);

      // Description — shift right to accommodate wider labels
      const desc = this.add.text(px + 110, yOff + 2, entry.desc, {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#90a4ae',
      }).setDepth(81);
      this.legendObjects.push(desc);

      yOff += entryH;
    }

    // Update hint text
    this.legendHint.setText('[L] Hide Legend');
  }

  /** Count all tile types on the current grid */
  _countTiles() {
    const counts = {};
    if (!this.gameState.grid) return counts;
    this.gameState.grid.forEach((tile) => {
      counts[tile.type] = (counts[tile.type] || 0) + 1;
    });
    return counts;
  }

  _hideLegend() {
    for (const obj of this.legendObjects) {
      obj.destroy();
    }
    this.legendObjects = [];
    if (this.legendHint) {
      this.legendHint.setText('[L] Legend');
    }
  }

  update(time) {
    // Update timer if time attack
    if (this.gameState.missionType === 'time_attack' && this.gameState.missionData?.levelData?.timeLimit) {
      const gameScene = this.scene.get('GameScene');
      if (gameScene && gameScene.startTime) {
        const elapsed = (time - gameScene.startTime) / 1000;
        const remaining = Math.max(0, gameScene.timeLimit - elapsed);
        this.timerText.setText(`${remaining.toFixed(1)}s`);
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

  _toggleMusic() {
    this._musicOn = !this._musicOn;
    if (this.audioSystem) {
      this.audioSystem.setMusicEnabled(this._musicOn);
    }
    this.musicToggle.setText(this._musicOn ? '[M] Music: ON' : '[M] Music: OFF');
    this.musicToggle.setColor(this._musicOn ? '#66bb6a' : '#78909c');
  }

  _toggleSFX() {
    this._sfxOn = !this._sfxOn;
    if (this.audioSystem) {
      this.audioSystem.setEnabled(this._sfxOn);
    }
    this.sfxToggle.setText(this._sfxOn ? '[S] SFX: ON' : '[S] SFX: OFF');
    this.sfxToggle.setColor(this._sfxOn ? '#66bb6a' : '#78909c');
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
    this._hideLegend();
  }
}
