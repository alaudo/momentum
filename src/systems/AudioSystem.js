// ============================================================
// AudioSystem.js — ZzFX wrapper, sound definitions
// ============================================================

import { EVENTS } from '../config/Constants.js';
import EventBus from '../state/EventBus.js';

// ZzFX sound parameter arrays
// Format: [volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo]
const SOUNDS = {
  shoot:          [1, .05, 200, .02, .05, .1, 1, 1, , , , , , , , , , .5],
  collide_light:  [.5, .05, 400, , .02, .01, 4, , , , , , , , , , , , .1],
  collide_heavy:  [.8, .1, 150, , .05, .05, 4, 1, , , , , , , , , , , .1],
  splash:         [.7, .1, 100, .01, .1, .2, 3, 2, -5, , , , , 2, , , , .3],
  crack:          [.6, .2, 800, , .03, .02, 4, 2, , , , , , 3, , , , , .05],
  fall:           [.5, .1, 300, .01, .15, .3, 1, 2, -20, , , , , , , , .1, .2],
  puff:           [.3, .1, 600, .01, .05, .1, 3, , , , , , , 1, , , , .4],
  bounce:         [.6, .05, 500, , .02, .05, 1, 1, 10, , , , , , , , , , .1],
  modifier_apply: [.5, .1, 800, .01, .1, .15, 0, 1, 10, , 200, .05, , , , , , .5],
  ui_click:       [.3, , 600, , .02, .01, 1, , , , , , , , , , , , .1],
  win:            [.8, .05, 400, .01, .2, .3, 0, 1, , , 600, .05, .1, , , , , .5],
  lose:           [.6, .1, 200, .01, .3, .5, 2, 1, -10, , , , , , , , , .3],
  force_regen:    [.3, .05, 500, .01, .1, .15, 0, , 5, , 100, .05, , , , , , .5],
};

let zzfxPlay = null;
let soundEnabled = true;

export default class AudioSystem {
  constructor() {
    // Dynamically import ZzFX
    this._initZzFX();
    this._bindEvents();
  }

  async _initZzFX() {
    try {
      const zzfxModule = await import('zzfx');
      zzfxPlay = zzfxModule.zzfx || zzfxModule.default?.zzfx;
      if (!zzfxPlay && typeof window !== 'undefined' && window.zzfx) {
        zzfxPlay = window.zzfx;
      }
    } catch (e) {
      console.warn('ZzFX not available, sounds disabled:', e);
    }
  }

  play(soundName) {
    if (!soundEnabled || !zzfxPlay) return;
    const params = SOUNDS[soundName];
    if (params) {
      try {
        zzfxPlay(...params);
      } catch (e) {
        // Ignore audio context errors (user hasn't interacted yet)
      }
    }
  }

  setEnabled(enabled) {
    soundEnabled = enabled;
  }

  _bindEvents() {
    EventBus.on(EVENTS.SHOT_FIRED, () => this.play('shoot'));
    EventBus.on(EVENTS.BALL_DESTROYED, (data) => {
      switch (data.cause) {
        case 'abyss': this.play('fall'); break;
        case 'water': this.play('splash'); break;
        case 'spikes': this.play('crack'); break;
      }
    });
    EventBus.on(EVENTS.BALL_DAMAGED, () => this.play('crack'));
    EventBus.on(EVENTS.WEIGHT_CHANGED, () => this.play('modifier_apply'));
    EventBus.on(EVENTS.FORCE_CHANGED, (data) => {
      if (data.regen) this.play('force_regen');
    });
    EventBus.on(EVENTS.GAME_OVER, (data) => {
      this.play(data.winner === 'player' ? 'win' : 'lose');
    });
    EventBus.on('collision_ball_ball', (data) => {
      if (data.intensity > 2) {
        this.play('collide_heavy');
      } else {
        this.play('collide_light');
      }
    });
    EventBus.on('collision_ball_bumper', () => this.play('bounce'));
    EventBus.on('collision_ball_wall', () => this.play('collide_light'));
  }

  destroy() {
    EventBus.removeAllListeners(EVENTS.SHOT_FIRED);
    // Note: we don't remove all listeners as other systems use them too
  }
}
