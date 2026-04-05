// ============================================================
// EntityFactory.js — Factory for creating balls/bumpers from data
// ============================================================

import PlayerBall from './PlayerBall.js';
import EnemyBall from './EnemyBall.js';
import Bumper from './Bumper.js';

export default class EntityFactory {
  /**
   * Create a player ball
   */
  static createPlayerBall(scene, x, y, weight, owner = 'player') {
    return new PlayerBall(scene, { x, y, weight, owner });
  }

  /**
   * Create an enemy ball
   */
  static createEnemyBall(scene, x, y, weight, config = {}) {
    return new EnemyBall(scene, { x, y, weight, ...config });
  }

  /**
   * Create a bumper
   */
  static createBumper(scene, config) {
    return new Bumper(scene, config);
  }

  /**
   * Create entities from level data
   */
  static createFromLevelData(scene, levelData) {
    const entities = {
      playerBalls: [],
      enemyBalls: [],
      bumpers: [],
    };

    if (levelData.playerBalls) {
      for (const pd of levelData.playerBalls) {
        entities.playerBalls.push(
          this.createPlayerBall(scene, pd.x, pd.y, pd.weight, pd.owner)
        );
      }
    }

    if (levelData.enemyBalls) {
      for (const ed of levelData.enemyBalls) {
        entities.enemyBalls.push(
          this.createEnemyBall(scene, ed.x, ed.y, ed.weight, ed)
        );
      }
    }

    if (levelData.bumpers) {
      for (const bd of levelData.bumpers) {
        entities.bumpers.push(this.createBumper(scene, bd));
      }
    }

    return entities;
  }
}
