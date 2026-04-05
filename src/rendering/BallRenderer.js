// ============================================================
// BallRenderer.js — Ball graphics utilities
// ============================================================

// Ball rendering is handled directly inside Ball.js via Phaser Graphics.
// This module provides additional helper utilities if needed.

/**
 * Get ball color based on owner and weight class
 */
export function getBallDisplayColor(owner, weightClass) {
  const ownerColors = {
    player: 0x4fc3f7,
    enemy: 0xef5350,
    player2: 0xffa726,
    friendly: 0x66bb6a,
  };
  return ownerColors[owner] || 0xffffff;
}

/**
 * Calculate ball radius in pixels based on weight data
 */
export function calculateBallRadius(baseRadiusPoints, pointToPixel, radiusScale) {
  return baseRadiusPoints * pointToPixel * radiusScale;
}
