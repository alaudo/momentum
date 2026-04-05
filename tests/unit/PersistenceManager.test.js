// ============================================================
// PersistenceManager.test.js — LocalStorage save/load tests
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import PersistenceManager from '../../src/state/PersistenceManager.js';

// Mock localStorage
const storageMap = new Map();
const mockLocalStorage = {
  getItem: vi.fn((key) => storageMap.get(key) ?? null),
  setItem: vi.fn((key, value) => storageMap.set(key, value)),
  removeItem: vi.fn((key) => storageMap.delete(key)),
};
vi.stubGlobal('localStorage', mockLocalStorage);

describe('PersistenceManager', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.clearAllMocks();
  });

  // ----------------------------------------
  // save / load
  // ----------------------------------------
  describe('save / load', () => {
    it('should save and load data round-trip', () => {
      PersistenceManager.save({ test: 'value' });
      const loaded = PersistenceManager.load();
      expect(loaded.test).toBe('value');
      expect(loaded.version).toBe(1);
      expect(loaded.timestamp).toBeDefined();
    });

    it('should return null when nothing saved', () => {
      expect(PersistenceManager.load()).toBeNull();
    });

    it('should return false on save error', () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
      expect(PersistenceManager.save({ data: true })).toBe(false);
    });
  });

  // ----------------------------------------
  // getDefaults / loadOrDefault
  // ----------------------------------------
  describe('getDefaults / loadOrDefault', () => {
    it('should return default structure', () => {
      const defaults = PersistenceManager.getDefaults();
      expect(defaults.campaign.unlockedMissions).toEqual([1]);
      expect(defaults.rogue.highScores).toEqual([]);
    });

    it('should return defaults when nothing saved', () => {
      const data = PersistenceManager.loadOrDefault();
      expect(data.campaign).toBeDefined();
      expect(data.settings.soundEnabled).toBe(true);
    });

    it('should return saved data when available', () => {
      PersistenceManager.save({ custom: 'data', campaign: { unlockedMissions: [1, 2] } });
      const data = PersistenceManager.loadOrDefault();
      expect(data.custom).toBe('data');
    });
  });

  // ----------------------------------------
  // saveCampaignProgress
  // ----------------------------------------
  describe('saveCampaignProgress', () => {
    it('should save mission completion', () => {
      PersistenceManager.saveCampaignProgress(1, { score: 50, turns: 3 });
      const data = PersistenceManager.loadOrDefault();
      expect(data.campaign.completedMissions[1]).toEqual({ score: 50, turns: 3 });
    });

    it('should unlock the next mission', () => {
      PersistenceManager.saveCampaignProgress(1, { score: 50 });
      const data = PersistenceManager.loadOrDefault();
      expect(data.campaign.unlockedMissions).toContain(2);
    });

    it('should not unlock mission beyond 10', () => {
      PersistenceManager.saveCampaignProgress(10, { score: 100 });
      const data = PersistenceManager.loadOrDefault();
      expect(data.campaign.unlockedMissions).not.toContain(11);
    });
  });

  // ----------------------------------------
  // saveHighScore
  // ----------------------------------------
  describe('saveHighScore', () => {
    it('should save a high score entry', () => {
      PersistenceManager.saveHighScore('rogue', { score: 100, seed: 'test-1' });
      const data = PersistenceManager.loadOrDefault();
      expect(data.rogue.highScores).toHaveLength(1);
      expect(data.rogue.highScores[0].score).toBe(100);
    });

    it('should sort high scores descending', () => {
      PersistenceManager.saveHighScore('rogue', { score: 50 });
      PersistenceManager.saveHighScore('rogue', { score: 200 });
      PersistenceManager.saveHighScore('rogue', { score: 100 });
      const data = PersistenceManager.loadOrDefault();
      expect(data.rogue.highScores[0].score).toBe(200);
      expect(data.rogue.highScores[1].score).toBe(100);
      expect(data.rogue.highScores[2].score).toBe(50);
    });

    it('should keep max 10 high scores', () => {
      for (let i = 0; i < 15; i++) {
        PersistenceManager.saveHighScore('rogue', { score: i * 10 });
      }
      const data = PersistenceManager.loadOrDefault();
      expect(data.rogue.highScores).toHaveLength(10);
    });
  });

  // ----------------------------------------
  // clear
  // ----------------------------------------
  describe('clear', () => {
    it('should remove saved data', () => {
      PersistenceManager.save({ test: true });
      PersistenceManager.clear();
      expect(PersistenceManager.load()).toBeNull();
    });
  });
});
