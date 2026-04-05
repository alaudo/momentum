// ============================================================
// EffectsRenderer.js — Visual effects (splash, crack, puff, glow)
// ============================================================

export default class EffectsRenderer {
  constructor(scene) {
    this.scene = scene;
    this.effects = [];
  }

  /** Ball destroyed by abyss: shrink + fade into darkness */
  abyssDeath(x, y, radius) {
    this._createEffect(x, y, 600, (gfx, t) => {
      const scale = 1 - t;
      const alpha = 1 - t;
      gfx.fillStyle(0x0a0a0a, alpha);
      gfx.fillCircle(x, y, radius * scale * 1.5);
      gfx.fillStyle(0x1a0a2e, alpha * 0.7);
      gfx.fillCircle(x, y, radius * scale);
    });
  }

  /** Ball destroyed by water: splash ring */
  waterDeath(x, y, radius) {
    this._createEffect(x, y, 800, (gfx, t) => {
      const ringRadius = radius + t * 40;
      const alpha = 1 - t;
      gfx.lineStyle(3 - t * 2, 0x42a5f5, alpha);
      gfx.strokeCircle(x, y, ringRadius);
      // Droplets
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const dist = radius + t * 30;
        const dx = x + Math.cos(angle) * dist;
        const dy = y + Math.sin(angle) * dist - t * 20;
        gfx.fillStyle(0x64b5f6, alpha * 0.8);
        gfx.fillCircle(dx, dy, 2);
      }
    });
  }

  /** Ball destroyed by spikes: shatter */
  spikeDeath(x, y, radius) {
    const fragments = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      fragments.push({
        angle,
        speed: 30 + Math.random() * 40,
        size: 2 + Math.random() * 4,
      });
    }

    this._createEffect(x, y, 700, (gfx, t) => {
      const alpha = 1 - t;
      for (const frag of fragments) {
        const dist = frag.speed * t;
        const fx = x + Math.cos(frag.angle) * dist;
        const fy = y + Math.sin(frag.angle) * dist;
        gfx.fillStyle(0x9e9e9e, alpha);
        gfx.fillRect(fx - frag.size / 2, fy - frag.size / 2, frag.size, frag.size);
      }
    });
  }

  /** Collision flash at contact point */
  collisionFlash(x, y, intensity) {
    const size = 5 + intensity * 15;
    this._createEffect(x, y, 200, (gfx, t) => {
      const alpha = 1 - t;
      gfx.fillStyle(0xffffff, alpha * 0.8);
      gfx.fillCircle(x, y, size * (1 - t));
    });
  }

  /** Bumper hit pulse */
  bumperPulse(x, y, radius) {
    this._createEffect(x, y, 300, (gfx, t) => {
      const alpha = 1 - t;
      gfx.lineStyle(2, 0xffab91, alpha);
      gfx.strokeCircle(x, y, radius + t * 15);
    });
  }

  /** Weight change shimmer */
  weightChange(x, y, radius) {
    this._createEffect(x, y, 500, (gfx, t) => {
      const alpha = 1 - t;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + t * 3;
        const dist = radius + Math.sin(t * 10 + i) * 5;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        gfx.fillStyle(0xffeb3b, alpha * 0.6);
        gfx.fillCircle(px, py, 2);
      }
    });
  }

  /** Force regen glow */
  forceRegenGlow(x, y, width, height) {
    this._createEffect(x, y, 400, (gfx, t) => {
      const alpha = (1 - t) * 0.5;
      gfx.fillStyle(0x4caf50, alpha);
      gfx.fillRect(x, y, width, height);
    });
  }

  /** Ball damage flash */
  damageFlash(x, y, radius) {
    this._createEffect(x, y, 300, (gfx, t) => {
      const alpha = (1 - t) * 0.6;
      gfx.fillStyle(0xff1744, alpha);
      gfx.fillCircle(x, y, radius * 1.1);
    });
  }

  _createEffect(x, y, duration, renderFn) {
    const gfx = this.scene.add.graphics().setDepth(25);
    const startTime = Date.now();
    this.effects.push({ gfx, startTime, duration, renderFn });
  }

  update() {
    const now = Date.now();
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      const elapsed = now - effect.startTime;
      const t = Math.min(1, elapsed / effect.duration);

      effect.gfx.clear();
      effect.renderFn(effect.gfx, t);

      if (t >= 1) {
        effect.gfx.destroy();
        this.effects.splice(i, 1);
      }
    }
  }

  destroy() {
    for (const effect of this.effects) {
      effect.gfx.destroy();
    }
    this.effects = [];
  }
}
