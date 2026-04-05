// ============================================================
// PersistenceManager.js — LocalStorage read/write
// ============================================================

const STORAGE_KEY = 'momentum_stranded_save';
const CURRENT_VERSION = 1;

export default class PersistenceManager {
  static save(data) {
    try {
      const payload = {
        version: CURRENT_VERSION,
        timestamp: Date.now(),
        ...data,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.error('Failed to save:', e);
      return false;
    }
  }

  static load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.version > CURRENT_VERSION) {
        console.warn('Save version newer than current');
      }
      return data;
    } catch (e) {
      console.error('Failed to load:', e);
      return null;
    }
  }

  static getDefaults() {
    return {
      campaign: {
        unlockedMissions: [1],
        completedMissions: {},
      },
      rogue: {
        highScores: [],
      },
      skirmish: {
        highScores: [],
      },
      settings: {
        soundEnabled: true,
      },
    };
  }

  static loadOrDefault() {
    return this.load() || this.getDefaults();
  }

  static saveCampaignProgress(missionId, result) {
    const data = this.loadOrDefault();
    if (!data.campaign) data.campaign = this.getDefaults().campaign;
    data.campaign.completedMissions[missionId] = result;
    // Unlock next mission
    const nextId = missionId + 1;
    if (!data.campaign.unlockedMissions.includes(nextId) && nextId <= 10) {
      data.campaign.unlockedMissions.push(nextId);
    }
    this.save(data);
  }

  static saveHighScore(mode, entry) {
    const data = this.loadOrDefault();
    if (!data[mode]) data[mode] = { highScores: [] };
    data[mode].highScores.push(entry);
    data[mode].highScores.sort((a, b) => b.score - a.score);
    data[mode].highScores = data[mode].highScores.slice(0, 10);
    this.save(data);
  }

  static clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
