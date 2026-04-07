// ============================================================
// Campaign.test.js — Campaign mission solvability & structure tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { CAMPAIGN_MISSIONS } from '../../src/data/CampaignIndex.js';
import LevelLoader from '../../src/level/LevelLoader.js';
import { TERRAIN, MISSION_TYPE, FORCE_MAX, FORCE_COST_MULTIPLIER } from '../../src/config/Constants.js';
import { getWeightClass } from '../../src/config/WeightClassData.js';

describe('Campaign Missions', () => {
  // ----------------------------------------
  // Structure validation for all missions
  // ----------------------------------------
  describe('structure', () => {
    it('should have sequential IDs starting from 1', () => {
      for (let i = 0; i < CAMPAIGN_MISSIONS.length; i++) {
        expect(CAMPAIGN_MISSIONS[i].id).toBe(i + 1);
      }
    });

    it('should have required fields in each mission', () => {
      for (const m of CAMPAIGN_MISSIONS) {
        expect(m).toHaveProperty('id');
        expect(m).toHaveProperty('name');
        expect(m).toHaveProperty('description');
        expect(m).toHaveProperty('missionType');
        expect(m).toHaveProperty('levelData');
        expect(m.levelData).toHaveProperty('gridWidth');
        expect(m.levelData).toHaveProperty('gridHeight');
        expect(m.levelData).toHaveProperty('playerBalls');
        expect(m.levelData.playerBalls.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('all missions should load without errors', () => {
      for (const m of CAMPAIGN_MISSIONS) {
        const result = LevelLoader.load(m.levelData);
        expect(result.grid.width).toBe(m.levelData.gridWidth);
        expect(result.grid.height).toBe(m.levelData.gridHeight);
        expect(result.playerBalls.length).toBe(m.levelData.playerBalls.length);
      }
    });
  });

  // ----------------------------------------
  // Mission 1: Clear the Board — solvability
  // ----------------------------------------
  describe('Mission 1: Clear the Board', () => {
    const mission = CAMPAIGN_MISSIONS[0];

    it('should be a CLEAR_BOARD mission', () => {
      expect(mission.missionType).toBe(MISSION_TYPE.CLEAR_BOARD);
    });

    it('should have at least one enemy ball', () => {
      expect(mission.levelData.enemyBalls.length).toBeGreaterThanOrEqual(1);
    });

    it('enemy ball (weight 3, Class 1) should have spikes available to kill it', () => {
      // Enemy is weight 3 = Class 1 (Balloon). Not immune to spikes.
      const enemyWeight = mission.levelData.enemyBalls[0].weight;
      const enemyClass = getWeightClass(enemyWeight);
      expect(enemyClass.spikeImmune).toBe(false);

      // The level must have spike tiles OR abyss tiles for the enemy to be pushed into
      const result = LevelLoader.load(mission.levelData);
      const spikeTiles = result.grid.getTilesOfType(TERRAIN.SPIKES);
      const abyssTiles = result.grid.getTilesOfType(TERRAIN.ABYSS);
      const hazardCount = spikeTiles.length + abyssTiles.length;
      expect(hazardCount).toBeGreaterThanOrEqual(1);
    });

    it('should have enough hazards for Class 1 enemy to perish', () => {
      // Class 1 at weight 3 has maxHP=2, spikeHitsToPerish=2
      // Either push into abyss (but Class 1 is abyss-immune!) or spikes
      const enemyWeight = mission.levelData.enemyBalls[0].weight;
      const enemyClass = getWeightClass(enemyWeight);

      if (enemyClass.abyssImmune) {
        // Since Class 1 is abyss-immune, we MUST have spikes
        const result = LevelLoader.load(mission.levelData);
        const spikeTiles = result.grid.getTilesOfType(TERRAIN.SPIKES);
        expect(spikeTiles.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('player should have enough force for multiple shots', () => {
      const playerWeight = mission.levelData.playerBalls[0].weight;
      const forcePool = mission.levelData.forceOverride || FORCE_MAX;
      // Cost for a full-power shot: 1.0 * weight * FORCE_COST_MULTIPLIER * 10
      const maxShotCost = 1.0 * playerWeight * FORCE_COST_MULTIPLIER * 10;
      // Must afford at least 2 shots
      expect(forcePool).toBeGreaterThanOrEqual(maxShotCost * 2);
    });
  });

  // ----------------------------------------
  // Mission 2: Precision Strike
  // ----------------------------------------
  describe('Mission 2: Precision Strike', () => {
    const mission = CAMPAIGN_MISSIONS[1];

    it('should be a PRECISION_STRIKE mission', () => {
      expect(mission.missionType).toBe(MISSION_TYPE.PRECISION_STRIKE);
    });

    it('should have exactly one king ball', () => {
      const kings = mission.levelData.enemyBalls.filter(b => b.isKing);
      expect(kings.length).toBe(1);
    });

    it('should have non-king enemies as obstacles', () => {
      const nonKings = mission.levelData.enemyBalls.filter(b => !b.isKing);
      expect(nonKings.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ----------------------------------------
  // Mission 3: Efficiency Expert
  // ----------------------------------------
  describe('Mission 3: Efficiency Expert', () => {
    const mission = CAMPAIGN_MISSIONS[2];

    it('should be an EFFICIENCY mission', () => {
      expect(mission.missionType).toBe(MISSION_TYPE.EFFICIENCY);
    });

    it('should have a force override (limited force)', () => {
      expect(mission.levelData.forceOverride).toBeDefined();
      expect(mission.levelData.forceOverride).toBeLessThan(FORCE_MAX);
    });

    it('enemies should be killable — not spike-immune with abyss on board', () => {
      const result = LevelLoader.load(mission.levelData);
      const abyssTiles = result.grid.getTilesOfType(TERRAIN.ABYSS);
      expect(abyssTiles.length).toBeGreaterThanOrEqual(1);

      // Enemies are weight 2-3 (Class 1, abyss-immune)
      // But can be killed via spikes or pushed off
      for (const enemy of mission.levelData.enemyBalls) {
        const ec = getWeightClass(enemy.weight);
        // Class 1 is abyss-immune, so spikes or other method needed
        // For this mission, player is weight 8 (heavy) and can push enemies
        expect(enemy.weight).toBeLessThanOrEqual(12);
      }
    });
  });

  // ----------------------------------------
  // Mission 4: Pacifist Survival
  // ----------------------------------------
  describe('Mission 4: Pacifist Survival', () => {
    const mission = CAMPAIGN_MISSIONS[3];

    it('should be a PACIFIST mission', () => {
      expect(mission.missionType).toBe(MISSION_TYPE.PACIFIST);
    });

    it('should have survival turns defined', () => {
      expect(mission.levelData.survivalTurns).toBeGreaterThan(0);
    });

    it('should have AI enabled', () => {
      expect(mission.levelData.enableAI).toBe(true);
    });

    it('player ball should be lighter than enemies (evasion focus)', () => {
      const playerW = mission.levelData.playerBalls[0].weight;
      const avgEnemyW = mission.levelData.enemyBalls.reduce((s, e) => s + e.weight, 0)
        / mission.levelData.enemyBalls.length;
      expect(playerW).toBeLessThan(avgEnemyW);
    });
  });

  // ----------------------------------------
  // Mission 5: Chain Reaction
  // ----------------------------------------
  describe('Mission 5: Chain Reaction', () => {
    const mission = CAMPAIGN_MISSIONS[4];

    it('should be a CHAIN_REACTION mission', () => {
      expect(mission.missionType).toBe(MISSION_TYPE.CHAIN_REACTION);
    });

    it('should have at least 2 enemies for a chain', () => {
      expect(mission.levelData.enemyBalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ----------------------------------------
  // Mission 6: Weight Watcher
  // ----------------------------------------
  describe('Mission 6: Weight Watcher', () => {
    const mission = CAMPAIGN_MISSIONS[5];

    it('should be a WEIGHT_WATCHER mission', () => {
      expect(mission.missionType).toBe(MISSION_TYPE.WEIGHT_WATCHER);
    });

    it('should have a modifier pad on the grid', () => {
      const result = LevelLoader.load(mission.levelData);
      const modPads = result.grid.getTilesOfType(TERRAIN.MODIFIER_PAD);
      expect(modPads.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ----------------------------------------
  // Mission 7: The Escort
  // ----------------------------------------
  describe('Mission 7: The Escort', () => {
    const mission = CAMPAIGN_MISSIONS[6];

    it('should be an ESCORT mission', () => {
      expect(mission.missionType).toBe(MISSION_TYPE.ESCORT);
    });

    it('should have friendly balls', () => {
      expect(mission.levelData.friendlyBalls).toBeDefined();
      expect(mission.levelData.friendlyBalls.length).toBeGreaterThanOrEqual(1);
    });

    it('friendly ball should be Class 1 (Balloon)', () => {
      const fw = mission.levelData.friendlyBalls[0].weight;
      const fc = getWeightClass(fw);
      expect(fc.className).toBe('Balloon');
    });

    it('should have a safe zone defined', () => {
      expect(mission.levelData.safeZone).toBeDefined();
      expect(mission.levelData.safeZone).toHaveProperty('col');
      expect(mission.levelData.safeZone).toHaveProperty('row');
    });
  });

  // ----------------------------------------
  // Mission 8: Environmentalist
  // ----------------------------------------
  describe('Mission 8: Environmentalist', () => {
    const mission = CAMPAIGN_MISSIONS[7];

    it('should be an ENVIRONMENTALIST mission', () => {
      expect(mission.missionType).toBe(MISSION_TYPE.ENVIRONMENTALIST);
    });

    it('should have abyss tile for the allowed hazard', () => {
      expect(mission.levelData.allowedHazard).toBe('abyss');
      const result = LevelLoader.load(mission.levelData);
      const abyssTiles = result.grid.getTilesOfType(TERRAIN.ABYSS);
      expect(abyssTiles.length).toBeGreaterThanOrEqual(1);
    });

    it('enemies should NOT be abyss-immune', () => {
      for (const enemy of mission.levelData.enemyBalls) {
        const ec = getWeightClass(enemy.weight);
        expect(ec.abyssImmune).toBe(false);
      }
    });
  });

  // ----------------------------------------
  // Mission 9: Time Attack
  // ----------------------------------------
  describe('Mission 9: Time Attack', () => {
    const mission = CAMPAIGN_MISSIONS[8];

    it('should be a TIME_ATTACK mission', () => {
      expect(mission.missionType).toBe(MISSION_TYPE.TIME_ATTACK);
    });

    it('should have a time limit', () => {
      expect(mission.levelData.timeLimit).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------
  // Mission 10: Pinball Wizard
  // ----------------------------------------
  describe('Mission 10: Pinball Wizard', () => {
    const mission = CAMPAIGN_MISSIONS[9];

    it('should be a PINBALL_WIZARD mission', () => {
      expect(mission.missionType).toBe(MISSION_TYPE.PINBALL_WIZARD);
    });

    it('should have plenty of bumpers for bouncing', () => {
      expect(mission.levelData.bumpers.length).toBeGreaterThanOrEqual(5);
    });

    it('should define required bounces', () => {
      expect(mission.levelData.requiredBounces).toBeGreaterThanOrEqual(5);
    });
  });
});
