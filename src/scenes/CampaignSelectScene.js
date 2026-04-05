// ============================================================
// CampaignSelectScene.js — Campaign mission picker
// ============================================================

import Phaser from 'phaser';
import { Button } from '../rendering/UIComponents.js';
import { GAME_MODE } from '../config/Constants.js';
import PersistenceManager from '../state/PersistenceManager.js';
import { CAMPAIGN_MISSIONS } from '../data/CampaignIndex.js';

export default class CampaignSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CampaignSelectScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a1a');

    const saveData = PersistenceManager.loadOrDefault();
    const unlocked = saveData.campaign?.unlockedMissions || [1];

    this.add.text(width / 2, 40, 'CAMPAIGN MISSIONS', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#4fc3f7',
    }).setOrigin(0.5, 0.5);

    // Mission buttons
    const startY = 100;
    const spacing = 55;

    CAMPAIGN_MISSIONS.forEach((mission, idx) => {
      const missionNum = idx + 1;
      const isUnlocked = unlocked.includes(missionNum);
      const isCompleted = saveData.campaign?.completedMissions?.[missionNum];

      const statusIcon = isCompleted ? '✓ ' : isUnlocked ? '● ' : '🔒 ';
      const label = `${statusIcon}${missionNum}. ${mission.name}`;

      new Button(this, width / 2, startY + idx * spacing, label, {
        width: 340,
        height: 45,
        fontSize: '14px',
        disabled: !isUnlocked,
        onClick: () => {
          if (isUnlocked) {
            this.scene.start('GameScene', {
              mode: GAME_MODE.CAMPAIGN,
              missionId: missionNum,
              missionData: mission,
            });
          }
        },
      });
    });

    // Back
    new Button(this, width / 2, startY + CAMPAIGN_MISSIONS.length * spacing + 20, 'BACK', {
      width: 140,
      height: 40,
      fontSize: '14px',
      onClick: () => this.scene.start('MainMenuScene'),
    });
  }
}
