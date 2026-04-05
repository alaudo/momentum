// ============================================================
// GameScene.js — Core gameplay scene
// ============================================================

import Phaser from 'phaser';
import GameState from '../state/GameState.js';
import EventBus from '../state/EventBus.js';
import {
  TURN_STATE, EVENTS, GAME_MODE, FORCE_MAX, TERRAIN,
} from '../config/Constants.js';
import { getFieldSize, getTilePixelSize } from '../utils/CoordinateUtils.js';
import PhysicsSystem from '../systems/PhysicsSystem.js';
import InputSystem from '../systems/InputSystem.js';
import ForceSystem from '../systems/ForceSystem.js';
import TurnSystem from '../systems/TurnSystem.js';
import HazardSystem from '../systems/HazardSystem.js';
import TerrainSystem from '../systems/TerrainSystem.js';
import ModifierSystem from '../systems/ModifierSystem.js';
import AISystem from '../systems/AISystem.js';
import AudioSystem from '../systems/AudioSystem.js';
import TileRenderer from '../level/TileRenderer.js';
import WallBuilder from '../level/WallBuilder.js';
import LevelGenerator from '../level/LevelGenerator.js';
import LevelLoader from '../level/LevelLoader.js';
import LevelValidator from '../level/LevelValidator.js';
import EntityFactory from '../entities/EntityFactory.js';
import EffectsRenderer from '../rendering/EffectsRenderer.js';
import { CAMPAIGN_MISSIONS } from '../data/CampaignIndex.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.gameMode = data.mode || GAME_MODE.ROGUE;
    this.seed = data.seed || 'default-1';
    this.difficulty = data.difficulty || 1;
    this.missionId = data.missionId || null;
    this.missionData = data.missionData || null;
  }

  create() {
    // Remove any previous event listeners
    EventBus.removeAllListeners();

    // Initialize game state
    this.gameState = new GameState();
    this.gameState.mode = this.gameMode;
    this.gameState.seed = this.seed;
    this.gameState.difficulty = this.difficulty;

    // Load or generate level
    let levelData;
    if (this.gameMode === GAME_MODE.CAMPAIGN && this.missionData) {
      levelData = LevelLoader.load(this.missionData.levelData);
      this.gameState.missionType = this.missionData.missionType;
      this.gameState.missionData = this.missionData;

      // Apply force override if specified
      if (this.missionData.levelData.forceOverride) {
        this.gameState.forcePools.player = this.missionData.levelData.forceOverride;
      }
    } else {
      levelData = LevelGenerator.generate(this.seed);

      // Validate and retry if needed
      let validation = LevelValidator.validate(levelData);
      let retries = 0;
      while (!validation.valid && retries < 5) {
        retries++;
        levelData = LevelGenerator.generate(`${this.seed}_r${retries}`);
        validation = LevelValidator.validate(levelData);
      }
    }

    this.gameState.grid = levelData.grid;
    this.gameState.gridWidth = levelData.gridWidth || levelData.grid.width;
    this.gameState.gridHeight = levelData.gridHeight || levelData.grid.height;

    // Calculate field size and set camera
    const fieldSize = getFieldSize(this.gameState.gridWidth, this.gameState.gridHeight);

    // Set world bounds
    this.matter.world.setBounds(0, 0, fieldSize.width, fieldSize.height);

    // Camera setup — fit the field on screen
    const cam = this.cameras.main;
    cam.setBackgroundColor('#0a0a1a');

    const scaleX = cam.width / fieldSize.width;
    const scaleY = cam.height / fieldSize.height;
    const scale = Math.min(scaleX, scaleY, 1) * 0.92; // slight padding

    cam.setZoom(scale);
    cam.centerOn(fieldSize.width / 2, fieldSize.height / 2);

    // Initialize renderers
    this.tileRenderer = new TileRenderer(this);
    this.effectsRenderer = new EffectsRenderer(this);

    // Render tiles
    this.tileRenderer.renderGrid(levelData.grid);

    // Build walls
    this.walls = WallBuilder.build(this, this.gameState.gridWidth, this.gameState.gridHeight);

    // Initialize systems
    this.forceSystem = new ForceSystem(this.gameState);
    this.physicsSystem = new PhysicsSystem(this, this.gameState);
    this.inputSystem = new InputSystem(this, this.gameState, this.forceSystem);
    this.turnSystem = new TurnSystem(this, this.gameState, this.forceSystem);
    this.hazardSystem = new HazardSystem(this, this.gameState, this.effectsRenderer);
    this.terrainSystem = new TerrainSystem(this, this.gameState);
    this.modifierSystem = new ModifierSystem(this, this.gameState, this.effectsRenderer);
    this.aiSystem = new AISystem(this, this.gameState, this.forceSystem);
    this.audioSystem = new AudioSystem();

    // Create entities
    const entities = EntityFactory.createFromLevelData(this, levelData);

    for (const pBall of entities.playerBalls) {
      this.gameState.addBall(pBall);
    }
    for (const eBall of entities.enemyBalls) {
      this.gameState.addBall(eBall);
    }

    // Handle friendly balls in campaign
    if (levelData.friendlyBalls) {
      for (const fb of levelData.friendlyBalls) {
        const ball = EntityFactory.createPlayerBall(this, fb.x, fb.y, fb.weight, fb.owner || 'friendly');
        this.gameState.addBall(ball);
      }
    }

    this.gameState.bumpers = entities.bumpers;

    // Register collision effects
    EventBus.on('collision_ball_ball', (data) => {
      this.effectsRenderer.collisionFlash(data.contactX, data.contactY, data.intensity * 0.3);
    });
    EventBus.on('collision_ball_bumper', (data) => {
      const bumper = data.bumper;
      this.effectsRenderer.bumperPulse(bumper.x, bumper.y, bumper.radius || 15);
      this.gameState.bumperBounces++;
    });

    // Listen for state changes
    EventBus.on(EVENTS.STATE_CHANGED, this._onStateChanged, this);
    EventBus.on(EVENTS.GAME_OVER, this._onGameOver, this);

    // Start HUD scene
    this.scene.launch('HUDScene', {
      gameState: this.gameState,
      forceSystem: this.forceSystem,
    });

    // Initial state
    this.gameState.turnState = TURN_STATE.PLAYER_AIM;
    this.gameState.turnNumber = 1;

    // PvP: setup both players
    if (this.gameMode === GAME_MODE.PVP) {
      this.gameState.activePlayer = 'player';
    }

    // Campaign: Time Attack timer
    if (this.gameState.missionType === 'time_attack' && this.missionData?.levelData?.timeLimit) {
      this.timeLimit = this.missionData.levelData.timeLimit;
      this.startTime = this.time.now;
    }
  }

  update(time, delta) {
    if (this.gameState.isGameOver) return;

    const state = this.gameState.turnState;

    // Update all balls' graphics positions
    for (const ball of this.gameState.getAllBalls()) {
      ball.update();
    }

    // Update bumpers
    for (const bumper of this.gameState.bumpers) {
      bumper.update(time);
    }

    // Update effects
    this.effectsRenderer.update();

    // Update animated tiles
    this.tileRenderer.updateAnimations(time);

    // State-specific updates
    switch (state) {
      case TURN_STATE.PLAYER_AIM:
        this.inputSystem.update();
        break;

      case TURN_STATE.PHYSICS_ACTIVE:
        this.terrainSystem.update();
        this.hazardSystem.checkHazards();
        this.modifierSystem.checkModifiers();
        this.physicsSystem.update();
        break;

      case TURN_STATE.HAZARD_RESOLVE:
        this.hazardSystem.resolve();
        this.turnSystem.onHazardsResolved();
        break;

      case TURN_STATE.MODIFIER_RESOLVE:
        this.modifierSystem.resolve();
        this.turnSystem.onModifiersResolved();
        break;

      case TURN_STATE.AI_THINK:
        // AI system handles its own timing
        break;

      case TURN_STATE.TURN_END:
        // Handled by TurnSystem
        break;

      case TURN_STATE.GAME_OVER:
        // Do nothing, waiting for scene transition
        break;
    }

    // Time Attack check
    if (this.timeLimit && !this.gameState.isGameOver) {
      const elapsed = (this.time.now - this.startTime) / 1000;
      if (elapsed >= this.timeLimit) {
        this.gameState.isGameOver = true;
        this.gameState.winner = 'enemy';
        EventBus.emit(EVENTS.GAME_OVER, {
          winner: 'enemy',
          message: 'Time\'s up!',
          score: this.gameState.score,
          turns: this.gameState.turnNumber,
        });
      }
    }
  }

  _onStateChanged(data) {
    const { from, to } = data;

    if (to === TURN_STATE.PHYSICS_ACTIVE) {
      this.physicsSystem.startSettleWatch();
    }

    if (to === TURN_STATE.AI_THINK) {
      this.aiSystem.think();
    }
  }

  _onGameOver(data) {
    // Delay before transitioning to game over scene
    this.time.delayedCall(1500, () => {
      this.scene.stop('HUDScene');
      this.scene.start('GameOverScene', {
        ...data,
        mode: this.gameMode,
        seed: this.seed,
        difficulty: this.difficulty,
        missionId: this.missionId,
        score: this.gameState.score,
        turns: this.gameState.turnNumber,
        enemiesDestroyed: this.gameState.enemiesDestroyed,
        totalShots: this.gameState.totalShots,
      });
    });
  }

  shutdown() {
    // Clean up systems
    if (this.physicsSystem) this.physicsSystem.destroy();
    if (this.inputSystem) this.inputSystem.destroy();
    if (this.turnSystem) this.turnSystem.destroy();
    if (this.hazardSystem) this.hazardSystem.destroy();
    if (this.terrainSystem) this.terrainSystem.destroy();
    if (this.modifierSystem) this.modifierSystem.destroy();
    if (this.aiSystem) this.aiSystem.destroy();
    if (this.tileRenderer) this.tileRenderer.destroy();
    if (this.effectsRenderer) this.effectsRenderer.destroy();

    EventBus.removeAllListeners();
  }
}
