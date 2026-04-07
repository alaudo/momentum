// ============================================================
// TrajectoryRenderer.js — Aim line, power indicator, force cost,
// predicted bounce trajectory off walls, bumpers, and balls
// ============================================================

import {
  TRAJECTORY_DOTS, TRAJECTORY_DOT_SPACING, TRAJECTORY_BOUNCE_COUNT,
  COLORS, WALL_THICKNESS,
} from '../config/Constants.js';
import { getFieldSize } from '../utils/CoordinateUtils.js';

export default class TrajectoryRenderer {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(20);
    this.costText = scene.add.text(0, 0, '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(21).setVisible(false);
  }

  draw(startX, startY, dirX, dirY, power, forceCost, canAfford, opts = {}) {
    this.graphics.clear();

    const color = canAfford ? COLORS.TRAJECTORY : COLORS.TRAJECTORY_WARN;
    const bounceColor = 0xffd740;
    const obstacleColor = 0xff6e40; // orange-red for obstacle bounces
    const dotCount = Math.ceil(TRAJECTORY_DOTS * power);
    const speed = power * TRAJECTORY_DOT_SPACING;

    const gridW = opts.gridWidth || this.scene.gameState?.gridWidth || 8;
    const gridH = opts.gridHeight || this.scene.gameState?.gridHeight || 8;
    const field = getFieldSize(gridW, gridH);
    const ballR = opts.ballRadius || 14;
    const obstacles = opts.obstacles || [];

    const wallMinX = WALL_THICKNESS + ballR;
    const wallMaxX = field.width - WALL_THICKNESS - ballR;
    const wallMinY = WALL_THICKNESS + ballR;
    const wallMaxY = field.height - WALL_THICKNESS - ballR;

    // Build trajectory segments (initial + bounces off walls and obstacles)
    const segments = [];
    let curX = startX;
    let curY = startY;
    let curDirX = dirX;
    let curDirY = dirY;
    let remainingDots = dotCount;
    let bounceIndex = 0;
    const maxBounces = TRAJECTORY_BOUNCE_COUNT;

    while (remainingDots > 0 && bounceIndex <= maxBounces) {
      const seg = { points: [], isBounce: bounceIndex > 0, isObstacleBounce: false };
      let hitSomething = false;

      for (let i = 1; i <= remainingDots; i++) {
        const nx = curX + curDirX * i * speed;
        const ny = curY + curDirY * i * speed;

        // Check wall collisions
        let bounceNormalX = 0;
        let bounceNormalY = 0;
        let hitX = nx;
        let hitY = ny;

        if (nx <= wallMinX) { bounceNormalX = 1; hitX = wallMinX; }
        else if (nx >= wallMaxX) { bounceNormalX = -1; hitX = wallMaxX; }
        if (ny <= wallMinY) { bounceNormalY = 1; hitY = wallMinY; }
        else if (ny >= wallMaxY) { bounceNormalY = -1; hitY = wallMaxY; }

        if (bounceNormalX !== 0 || bounceNormalY !== 0) {
          seg.points.push({ x: hitX, y: hitY });
          hitSomething = true;
          if (bounceNormalX !== 0) curDirX = -curDirX;
          if (bounceNormalY !== 0) curDirY = -curDirY;
          curX = hitX;
          curY = hitY;
          remainingDots -= i;
          bounceIndex++;
          break;
        }

        // Check obstacle collisions (bumpers and other balls)
        let hitObstacle = false;
        for (const obs of obstacles) {
          const dx = nx - obs.x;
          const dy = ny - obs.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = ballR + obs.radius;

          if (dist < minDist && dist > 0) {
            // Hit an obstacle — reflect off its surface
            const normX = dx / dist;
            const normY = dy / dist;

            // Place hit point at surface
            hitX = obs.x + normX * minDist;
            hitY = obs.y + normY * minDist;
            seg.points.push({ x: hitX, y: hitY });

            // Reflect direction: d' = d - 2(d·n)n
            const dot = curDirX * normX + curDirY * normY;
            curDirX = curDirX - 2 * dot * normX;
            curDirY = curDirY - 2 * dot * normY;

            curX = hitX;
            curY = hitY;
            remainingDots -= i;
            bounceIndex++;
            hitSomething = true;
            hitObstacle = true;
            seg.isObstacleBounce = true;
            break;
          }
        }

        if (hitObstacle) break;

        seg.points.push({ x: nx, y: ny });
      }

      segments.push(seg);
      if (!hitSomething) remainingDots = 0;
    }

    // Draw segments
    let globalDotIndex = 0;
    const totalDots = dotCount;

    for (const seg of segments) {
      for (let i = 0; i < seg.points.length; i++) {
        const t = globalDotIndex / totalDots;
        const alpha = seg.isBounce ? (0.6 - t * 0.4) : (0.8 - t * 0.5);
        const dotSize = seg.isBounce ? (2.5 - t * 1.2) : (3 - t * 1.5);
        let dotColor = color;
        if (seg.isBounce) dotColor = seg.isObstacleBounce ? obstacleColor : bounceColor;

        this.graphics.fillStyle(dotColor, Math.max(0.1, alpha));
        this.graphics.fillCircle(seg.points[i].x, seg.points[i].y, Math.max(0.8, dotSize));
        globalDotIndex++;
      }
    }

    // Draw bounce markers
    for (let s = 1; s < segments.length; s++) {
      if (segments[s - 1].points.length > 0) {
        const lastPt = segments[s - 1].points[segments[s - 1].points.length - 1];
        const markerColor = segments[s].isObstacleBounce ? obstacleColor : bounceColor;
        this.graphics.lineStyle(2, markerColor, 0.8);
        const sz = 4;
        this.graphics.lineBetween(lastPt.x - sz, lastPt.y - sz, lastPt.x + sz, lastPt.y + sz);
        this.graphics.lineBetween(lastPt.x + sz, lastPt.y - sz, lastPt.x - sz, lastPt.y + sz);
      }
    }

    // Power indicator line
    this.graphics.lineStyle(2, color, 0.4);
    this.graphics.lineBetween(startX, startY, startX + dirX * 20, startY + dirY * 20);

    // Force cost text
    const textX = startX + dirX * (dotCount + 2) * speed * 0.3;
    const textY = startY + dirY * (dotCount + 2) * speed * 0.3 - 20;
    this.costText.setPosition(textX, textY);
    this.costText.setText(`Force: ${Math.round(forceCost)}`);
    this.costText.setColor(canAfford ? '#4caf50' : '#f44336');
    this.costText.setVisible(true);
  }

  hide() {
    this.graphics.clear();
    this.costText.setVisible(false);
  }

  destroy() {
    if (this.graphics) this.graphics.destroy();
    if (this.costText) this.costText.destroy();
  }
}
