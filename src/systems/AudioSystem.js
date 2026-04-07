// ============================================================
// AudioSystem.js — ZzFX wrapper, sound definitions, procedural
// ambient background music with mute option
// ============================================================

import { EVENTS } from '../config/Constants.js';
import EventBus from '../state/EventBus.js';

// ZzFX sound parameter arrays
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
let musicEnabled = true;

export default class AudioSystem {
  constructor() {
    this._audioCtx = null;
    this._musicNodes = [];
    this._musicPlaying = false;
    this._musicGain = null;
    this._intervals = [];

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
      } catch (e) { /* ignore */ }
    }
  }

  setEnabled(enabled) {
    soundEnabled = enabled;
  }

  setMusicEnabled(enabled) {
    musicEnabled = enabled;
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  isMusicEnabled() {
    return musicEnabled;
  }

  isSoundEnabled() {
    return soundEnabled;
  }

  // ============================================================
  // Calm Ambient Space Music
  // Gentle sine pads, slow evolving chords, soft bell-like tones
  // ============================================================

  startMusic() {
    if (this._musicPlaying || !musicEnabled) return;

    try {
      this._audioCtx = this._audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (this._audioCtx.state === 'suspended') {
        this._audioCtx.resume();
      }

      const ctx = this._audioCtx;

      // Master gain — very quiet, ambient level
      this._musicGain = ctx.createGain();
      this._musicGain.gain.value = 0.08;
      this._musicGain.connect(ctx.destination);

      // Gentle drone pad
      this._startDronePad(ctx);

      // Slow bell-like tones
      this._startBells(ctx);

      this._musicPlaying = true;
    } catch (e) {
      console.warn('Music init failed:', e);
    }
  }

  _startDronePad(ctx) {
    // Three detuned sine oscillators forming a soft Am chord
    // Extremely slow chord changes for a meditative feel
    const chords = [
      [110, 164.81, 220],    // Am  (A2, E3, A3)
      [98, 146.83, 196],     // G   (G2, D3, G3)
      [87.31, 130.81, 174.61], // F  (F2, C3, F3)
      [82.41, 123.47, 164.81], // E  (E2, B2, E3)
    ];

    const padGain = ctx.createGain();
    padGain.gain.value = 0.5;

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 400;
    padFilter.Q.value = 0.5;

    // Very slow filter sweep
    const filterLfo = ctx.createOscillator();
    const filterLfoGain = ctx.createGain();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 0.02; // one cycle every 50 seconds
    filterLfoGain.gain.value = 150;
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(padFilter.frequency);
    filterLfo.start();

    padFilter.connect(padGain);
    padGain.connect(this._musicGain);

    this._padOscillators = [];
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = chords[0][i];
      osc.detune.value = (i - 1) * 5; // subtle detune
      osc.connect(padFilter);
      osc.start();
      this._padOscillators.push(osc);
    }

    this._musicNodes.push(padGain, padFilter, filterLfo, filterLfoGain, ...this._padOscillators);

    // Slowly cycle through chords — every 12 seconds
    let chordIdx = 0;
    const padInterval = setInterval(() => {
      if (!this._musicPlaying || !musicEnabled) return;
      chordIdx = (chordIdx + 1) % chords.length;
      for (let i = 0; i < 3; i++) {
        if (this._padOscillators[i]) {
          this._padOscillators[i].frequency.setTargetAtTime(
            chords[chordIdx][i], ctx.currentTime, 2.0 // 2-second glide
          );
        }
      }
    }, 12000);
    this._intervals.push(padInterval);
  }

  _startBells(ctx) {
    // Gentle bell-like tones — sine with fast decay, played infrequently
    // Pentatonic scale for a peaceful, non-dissonant feel
    const bellNotes = [
      440, 494, 587, 659, 784,    // A4 B4 D5 E5 G5
      880, 784, 659, 587, 494,    // A5 G5 E5 D5 B4
    ];
    let bellIdx = 0;

    const bellInterval = setInterval(() => {
      if (!this._musicPlaying || !musicEnabled) return;

      // Only play a bell ~40% of the time for sparse, ambient feel
      if (Math.random() > 0.4) return;

      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = bellNotes[bellIdx % bellNotes.length];

        // Soft envelope — gentle attack, long decay
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

        osc.connect(gain);
        gain.connect(this._musicGain);

        osc.start(now);
        osc.stop(now + 2.6);

        bellIdx++;
      } catch (e) { /* ignore closed context */ }
    }, 3000); // one potential bell every 3 seconds

    this._intervals.push(bellInterval);
  }

  stopMusic() {
    this._musicPlaying = false;

    for (const node of this._musicNodes) {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) { /* already stopped */ }
    }
    this._musicNodes = [];
    this._padOscillators = [];

    for (const interval of this._intervals) {
      clearInterval(interval);
    }
    this._intervals = [];

    if (this._musicGain) {
      try { this._musicGain.disconnect(); } catch (e) {}
      this._musicGain = null;
    }
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
    this.stopMusic();
    EventBus.removeAllListeners(EVENTS.SHOT_FIRED);
    if (this._audioCtx) {
      try { this._audioCtx.close(); } catch (e) {}
      this._audioCtx = null;
    }
  }
}
