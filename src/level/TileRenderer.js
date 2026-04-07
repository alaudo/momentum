// ============================================================
// TileRenderer.js — Procedural rendering of all tile types
// ============================================================

import { TERRAIN, COLORS, WALL_THICKNESS } from '../config/Constants.js';
import { getTerrainDef } from '../config/TerrainData.js';
import { getTilePixelSize } from '../utils/CoordinateUtils.js';

export default class TileRenderer {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(0);
    this.animGraphics = scene.add.graphics().setDepth(1);
    this.tilePixelSize = getTilePixelSize();
    this.time = 0;
  }

  /** Render the entire tile grid */
  renderGrid(grid) {
    this.graphics.clear();
    this.grid = grid;

    grid.forEach((tile, col, row) => {
      this._renderTile(tile, col, row);
    });
  }

  /** Update animated tiles */
  updateAnimations(time) {
    this.time = time;
    if (!this.grid) return;

    this.animGraphics.clear();

    this.grid.forEach((tile, col, row) => {
      const def = getTerrainDef(tile.type);
      if (tile.type === TERRAIN.WATER || def.isStream || def.isFan) {
        this._renderAnimatedTile(tile, col, row, time);
      }
    });
  }

  _renderTile(tile, col, row) {
    const x = WALL_THICKNESS + col * this.tilePixelSize;
    const y = WALL_THICKNESS + row * this.tilePixelSize;
    const ts = this.tilePixelSize;
    const def = getTerrainDef(tile.type);

    switch (tile.type) {
      case TERRAIN.SAFE:
        this._renderSafeGround(x, y, ts, 0.01);
        break;
      case TERRAIN.SAFE_SAND:
        this._renderSandGround(x, y, ts);
        break;
      case TERRAIN.SAFE_ICE:
        this._renderIceGround(x, y, ts);
        break;
      case TERRAIN.ABYSS:
        this._renderAbyss(x, y, ts);
        break;
      case TERRAIN.WATER:
        this._renderWater(x, y, ts);
        break;
      case TERRAIN.SPIKES:
        this._renderSpikes(x, y, ts);
        break;
      case TERRAIN.MODIFIER_PAD:
        this._renderModifierPad(x, y, ts, tile.metadata);
        break;
      default:
        if (def.isFan) {
          this._renderFan(x, y, ts, def.fanDirection);
        } else if (def.isStream) {
          this._renderStream(x, y, ts, def.streamDirection);
        } else {
          this._renderSafeGround(x, y, ts, 0.01);
        }
    }

    // Grid line
    this.graphics.lineStyle(1, 0x1a1a2e, 0.3);
    this.graphics.strokeRect(x, y, ts, ts);
  }

  _renderSafeGround(x, y, ts, friction) {
    this.graphics.fillStyle(COLORS.SAFE_GROUND, 1);
    this.graphics.fillRect(x, y, ts, ts);

    // Subtle texture dots
    this.graphics.fillStyle(0x4a7a4a, 0.5);
    for (let i = 0; i < 4; i++) {
      const dx = ((i * 17 + x) % ts) * 0.7 + ts * 0.15;
      const dy = ((i * 23 + y) % ts) * 0.7 + ts * 0.15;
      this.graphics.fillCircle(x + dx, y + dy, 1.5);
    }
  }

  _renderSandGround(x, y, ts) {
    this.graphics.fillStyle(COLORS.SAFE_SAND, 1);
    this.graphics.fillRect(x, y, ts, ts);

    // Heavy stippling
    this.graphics.fillStyle(0xa08a6a, 0.5);
    for (let i = 0; i < 12; i++) {
      const dx = ((i * 13 + x * 3) % ts);
      const dy = ((i * 19 + y * 7) % ts);
      this.graphics.fillCircle(x + dx, y + dy, 1);
    }
  }

  _renderIceGround(x, y, ts) {
    this.graphics.fillStyle(COLORS.SAFE_ICE, 1);
    this.graphics.fillRect(x, y, ts, ts);

    // Shine streaks
    this.graphics.lineStyle(1, 0xd0f0ec, 0.4);
    this.graphics.lineBetween(x + ts * 0.2, y + ts * 0.3, x + ts * 0.7, y + ts * 0.2);
    this.graphics.lineBetween(x + ts * 0.3, y + ts * 0.7, x + ts * 0.8, y + ts * 0.6);
  }

  _renderAbyss(x, y, ts) {
    this.graphics.fillStyle(COLORS.ABYSS, 1);
    this.graphics.fillRect(x, y, ts, ts);

    // Depth pattern — concentric rings with purple tint
    this.graphics.fillStyle(0x2a1545, 0.5);
    const cx = x + ts / 2;
    const cy = y + ts / 2;
    for (let r = ts * 0.4; r > 5; r -= 8) {
      this.graphics.fillCircle(cx, cy, r);
    }

    // Edge highlight — more visible
    this.graphics.lineStyle(2, 0x4a2a6a, 0.8);
    this.graphics.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
  }

  _renderWater(x, y, ts) {
    this.graphics.fillStyle(COLORS.WATER, 1);
    this.graphics.fillRect(x, y, ts, ts);

    // Wave pattern (static base)
    this.graphics.fillStyle(COLORS.WATER_LIGHT, 0.2);
    for (let i = 0; i < 3; i++) {
      const wy = y + ts * (0.25 + i * 0.25);
      this.graphics.fillRect(x + 3, wy, ts - 6, 2);
    }
  }

  _renderSpikes(x, y, ts) {
    this.graphics.fillStyle(COLORS.SPIKES, 1);
    this.graphics.fillRect(x, y, ts, ts);

    // Draw spike triangles
    this.graphics.fillStyle(COLORS.SPIKE_TIP, 1);
    const spikeSize = ts / 4;
    for (let sx = 0; sx < 3; sx++) {
      for (let sy = 0; sy < 3; sy++) {
        const cx = x + spikeSize * 0.5 + sx * spikeSize * 1.1 + spikeSize * 0.3;
        const cy = y + spikeSize * 0.5 + sy * spikeSize * 1.1 + spikeSize * 0.3;
        this.graphics.fillTriangle(
          cx - spikeSize * 0.3, cy + spikeSize * 0.3,
          cx + spikeSize * 0.3, cy + spikeSize * 0.3,
          cx, cy - spikeSize * 0.3,
        );
      }
    }
  }

  _renderFan(x, y, ts, direction) {
    this.graphics.fillStyle(COLORS.FAN, 1);
    this.graphics.fillRect(x, y, ts, ts);

    // Fan housing
    this.graphics.fillStyle(0x546e7a, 1);
    this.graphics.fillCircle(x + ts / 2, y + ts / 2, ts * 0.35);
    this.graphics.fillStyle(COLORS.FAN_ARROW, 0.8);
    this.graphics.fillCircle(x + ts / 2, y + ts / 2, ts * 0.2);
  }

  _renderStream(x, y, ts, direction) {
    this.graphics.fillStyle(COLORS.STREAM, 1);
    this.graphics.fillRect(x, y, ts, ts);
  }

  _renderModifierPad(x, y, ts, metadata) {
    this.graphics.fillStyle(COLORS.MODIFIER_PAD, 0.6);
    this.graphics.fillRect(x, y, ts, ts);

    // Border glow
    this.graphics.lineStyle(2, 0xb39ddb, 0.8);
    this.graphics.strokeRect(x + 2, y + 2, ts - 4, ts - 4);

    // Show modifier value
    if (metadata && metadata.modifierDelta !== undefined) {
      const sign = metadata.modifierDelta > 0 ? '+' : '';
      const text = this.scene.add.text(x + ts / 2, y + ts / 2, `${sign}${metadata.modifierDelta}`, {
        fontSize: '16px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5).setDepth(3);
    }
  }

  _renderAnimatedTile(tile, col, row, time) {
    const x = WALL_THICKNESS + col * this.tilePixelSize;
    const y = WALL_THICKNESS + row * this.tilePixelSize;
    const ts = this.tilePixelSize;
    const def = getTerrainDef(tile.type);

    if (tile.type === TERRAIN.WATER) {
      // Animated waves
      const waveOffset = Math.sin(time * 0.002 + col * 0.5) * 3;
      this.animGraphics.fillStyle(COLORS.WATER_LIGHT, 0.15);
      for (let i = 0; i < 3; i++) {
        const wy = y + ts * (0.2 + i * 0.3) + waveOffset;
        this.animGraphics.fillRect(x + 4, wy, ts - 8, 2);
      }
    }

    if (def.isFan) {
      this._drawDirectionArrow(this.animGraphics, x, y, ts, def.fanDirection, COLORS.FAN_ARROW, time);
    }

    if (def.isStream) {
      this._drawDirectionArrow(this.animGraphics, x, y, ts, def.streamDirection, COLORS.STREAM_ARROW, time);
    }
  }

  _drawDirectionArrow(gfx, x, y, ts, dir, color, time) {
    const cx = x + ts / 2;
    const cy = y + ts / 2;
    const offset = Math.sin(time * 0.004) * 3;

    gfx.fillStyle(color, 0.7);

    const arrowSize = ts * 0.2;
    let ax, ay;

    switch (dir) {
      case 'n':
        ay = cy - arrowSize + offset;
        gfx.fillTriangle(cx - arrowSize, ay + arrowSize, cx + arrowSize, ay + arrowSize, cx, ay - arrowSize);
        break;
      case 's':
        ay = cy + arrowSize - offset;
        gfx.fillTriangle(cx - arrowSize, ay - arrowSize, cx + arrowSize, ay - arrowSize, cx, ay + arrowSize);
        break;
      case 'e':
        ax = cx + arrowSize - offset;
        gfx.fillTriangle(ax - arrowSize, cy - arrowSize, ax - arrowSize, cy + arrowSize, ax + arrowSize, cy);
        break;
      case 'w':
        ax = cx - arrowSize + offset;
        gfx.fillTriangle(ax + arrowSize, cy - arrowSize, ax + arrowSize, cy + arrowSize, ax - arrowSize, cy);
        break;
    }
  }

  destroy() {
    if (this.graphics) this.graphics.destroy();
    if (this.animGraphics) this.animGraphics.destroy();
  }
}
