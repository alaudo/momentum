// ============================================================
// TerrainData.js — Terrain type definitions & properties
// ============================================================

import { TERRAIN } from './Constants.js';

const TERRAIN_DEFS = {
  [TERRAIN.SAFE]: {
    id: TERRAIN.SAFE,
    label: 'Ground',
    friction: 0.01,
    isHazard: false,
    isModifier: false,
    isBouncy: false,
    isFan: false,
    isStream: false,
    isSolid: false,
  },
  [TERRAIN.SAFE_SAND]: {
    id: TERRAIN.SAFE_SAND,
    label: 'Sand',
    friction: 0.05,
    isHazard: false,
    isModifier: false,
    isBouncy: false,
    isFan: false,
    isStream: false,
    isSolid: false,
  },
  [TERRAIN.SAFE_ICE]: {
    id: TERRAIN.SAFE_ICE,
    label: 'Ice',
    friction: 0.0005,
    isHazard: false,
    isModifier: false,
    isBouncy: false,
    isFan: false,
    isStream: false,
    isSolid: false,
  },
  [TERRAIN.ABYSS]: {
    id: TERRAIN.ABYSS,
    label: 'Abyss',
    friction: 0.001,
    isHazard: true,
    hazardType: 'abyss',
    isModifier: false,
    isBouncy: false,
    isFan: false,
    isStream: false,
    isSolid: false,
  },
  [TERRAIN.WATER]: {
    id: TERRAIN.WATER,
    label: 'Water',
    friction: 0.08,
    isHazard: true,
    hazardType: 'water',
    isModifier: false,
    isBouncy: false,
    isFan: false,
    isStream: false,
    isSolid: false,
  },
  [TERRAIN.SPIKES]: {
    id: TERRAIN.SPIKES,
    label: 'Spikes',
    friction: 0.02,
    isHazard: true,
    hazardType: 'spikes',
    isModifier: false,
    isBouncy: false,
    isFan: false,
    isStream: false,
    isSolid: false,
  },
  [TERRAIN.MODIFIER_PAD]: {
    id: TERRAIN.MODIFIER_PAD,
    label: 'Modifier',
    friction: 0.01,
    isHazard: false,
    isModifier: true,
    isBouncy: false,
    isFan: false,
    isStream: false,
    isSolid: false,
  },
  [TERRAIN.BOUNCY_ROUND]: {
    id: TERRAIN.BOUNCY_ROUND,
    label: 'Bumper',
    friction: 0.0,
    isHazard: false,
    isModifier: false,
    isBouncy: true,
    isFan: false,
    isStream: false,
    isSolid: true,
  },
  [TERRAIN.BOUNCY_SQUARE]: {
    id: TERRAIN.BOUNCY_SQUARE,
    label: 'Bumper',
    friction: 0.0,
    isHazard: false,
    isModifier: false,
    isBouncy: true,
    isFan: false,
    isStream: false,
    isSolid: true,
  },
};

// Generate fan/stream definitions dynamically
['n', 's', 'e', 'w'].forEach(dir => {
  const fanKey = `fan_${dir}`;
  TERRAIN_DEFS[fanKey] = {
    id: fanKey,
    label: `Fan ${dir.toUpperCase()}`,
    friction: 0.005,
    isHazard: false,
    isModifier: false,
    isBouncy: false,
    isFan: true,
    fanDirection: dir,
    isStream: false,
    isSolid: false,
  };

  const streamKey = `stream_${dir}`;
  TERRAIN_DEFS[streamKey] = {
    id: streamKey,
    label: `Stream ${dir.toUpperCase()}`,
    friction: 0.04,
    isHazard: false,
    isModifier: false,
    isBouncy: false,
    isFan: false,
    isStream: true,
    streamDirection: dir,
    isSolid: false,
  };
});

/**
 * Get terrain definition by type id
 */
export function getTerrainDef(terrainType) {
  return TERRAIN_DEFS[terrainType] || TERRAIN_DEFS[TERRAIN.SAFE];
}

/**
 * Get direction vector for fan/stream direction character
 */
export function getDirectionVector(dir) {
  switch (dir) {
    case 'n': return { x: 0, y: -1 };
    case 's': return { x: 0, y: 1 };
    case 'e': return { x: 1, y: 0 };
    case 'w': return { x: -1, y: 0 };
    default: return { x: 0, y: 0 };
  }
}

export default TERRAIN_DEFS;
