// ============================================================
// Constants.js — All magic numbers, enums, tile sizes
// ============================================================

// Grid & Scale
export const TILE_SIZE_POINTS = 10;
export const POINT_TO_PIXEL = 6;
export const MIN_GRID = { w: 5, h: 5 };
export const MAX_GRID = { w: 20, h: 30 };

// Ball
export const BALL_RADIUS_POINTS = 3;
export const BALL_MIN_WEIGHT = 1;
export const BALL_MAX_WEIGHT = 12;

// Force
export const FORCE_MAX = 120;
export const FORCE_REGEN_INTERVAL = 1; // every N moves (regen every turn)
export const FORCE_REGEN_AMOUNT = 22;  // base regen per interval (was 15)
export const FORCE_REGEN_BONUS_PER_DIFFICULTY = 3; // extra regen per difficulty level (was 2)
export const FORCE_COST_MULTIPLIER = 0.55; // cost = pullPower * weight * multiplier (was 0.8)

// Physics
export const MOTION_THRESHOLD = 0.1;
export const MOTION_TIMEOUT = 6000; // ms
export const MAX_PULL_DISTANCE = 150; // pixels for max power drag
export const MAX_IMPULSE_MAGNITUDE = 0.45; // base impulse — strong enough for any ball to cross the field
export const WALL_THICKNESS = 40; // pixels

// Trajectory
export const TRAJECTORY_DOTS = 20;
export const TRAJECTORY_DOT_SPACING = 18;
export const TRAJECTORY_BOUNCE_COUNT = 2; // number of predicted bounces to show

// Collision categories (bitmask)
export const CATEGORY = {
  BALL:   0x0001,
  WALL:   0x0002,
  HAZARD: 0x0004,
  BUMPER: 0x0008,
  SENSOR: 0x0010,
};

// Terrain types
export const TERRAIN = {
  SAFE:           'safe',
  SAFE_SAND:      'safe_sand',
  SAFE_ICE:       'safe_ice',
  ABYSS:          'abyss',
  WATER:          'water',
  SPIKES:         'spikes',
  FAN_N:          'fan_n',
  FAN_S:          'fan_s',
  FAN_E:          'fan_e',
  FAN_W:          'fan_w',
  STREAM_N:       'stream_n',
  STREAM_S:       'stream_s',
  STREAM_E:       'stream_e',
  STREAM_W:       'stream_w',
  MODIFIER_PAD:   'modifier_pad',
  BOUNCY_ROUND:   'bouncy_round',
  BOUNCY_SQUARE:  'bouncy_square',
};

// Weight class enum
export const WEIGHT_CLASS = {
  BALLOON: 1,
  WOODEN:  2,
  HEAVY:   3,
};

// Ball owner
export const OWNER = {
  PLAYER:  'player',
  ENEMY:   'enemy',
  PLAYER2: 'player2',
  FRIENDLY: 'friendly',
};

// Turn states
export const TURN_STATE = {
  PLAYER_AIM:       'player_aim',
  PHYSICS_ACTIVE:   'physics_active',
  HAZARD_RESOLVE:   'hazard_resolve',
  MODIFIER_RESOLVE: 'modifier_resolve',
  TURN_END:         'turn_end',
  AI_THINK:         'ai_think',
  GAME_OVER:        'game_over',
};

// Game modes
export const GAME_MODE = {
  ROGUE:    'rogue',
  SKIRMISH: 'skirmish',
  PVP:      'pvp',
  CAMPAIGN: 'campaign',
};

// Campaign mission types
export const MISSION_TYPE = {
  CLEAR_BOARD:      'clear_board',
  PRECISION_STRIKE: 'precision_strike',
  EFFICIENCY:       'efficiency',
  PACIFIST:         'pacifist',
  CHAIN_REACTION:   'chain_reaction',
  WEIGHT_WATCHER:   'weight_watcher',
  ESCORT:           'escort',
  ENVIRONMENTALIST: 'environmentalist',
  TIME_ATTACK:      'time_attack',
  PINBALL_WIZARD:   'pinball_wizard',
};

// Colors
export const COLORS = {
  PLAYER_BALL:    0x4fc3f7, // light blue
  ENEMY_BALL:     0xef5350, // red
  PLAYER2_BALL:   0xffa726, // orange
  FRIENDLY_BALL:  0x66bb6a, // green
  // Weight class border colors
  CLASS_BALLOON:  0x00e5ff, // bright cyan — Class 1 (Balloon, w1-4)
  CLASS_WOODEN:   0xffab40, // amber/orange — Class 2 (Wooden, w5-8)
  CLASS_HEAVY:    0x78909c, // blue-grey — Class 3 (Heavy, w9-12)
  WALL:           0x37474f,
  WALL_STROKE:    0x546e7a,
  SAFE_GROUND:    0x3a5c3a, // brighter green
  SAFE_SAND:      0x8b7355, // brighter tan/sand
  SAFE_ICE:       0xa0e8e0, // brighter cyan
  ABYSS:          0x1a0a2e, // dark purple-black (distinct from other darks)
  WATER:          0x2196f3, // brighter blue
  WATER_LIGHT:    0x64b5f6, // brighter highlight
  SPIKES:         0x9e9e9e, // brighter grey
  SPIKE_TIP:      0xe0e0e0, // brighter tips
  FAN:            0x90a4ae, // brighter blue-grey
  FAN_ARROW:      0xcfd8dc, // brighter arrow
  STREAM:         0x1976d2, // brighter dark blue
  STREAM_ARROW:   0x90caf9, // brighter arrow
  MODIFIER_PAD:   0x9c27b0, // brighter purple
  BOUNCY:         0xff8a65, // brighter orange
  BOUNCY_GLOW:    0xffccbc, // brighter glow
  TRAJECTORY:     0xffffff,
  TRAJECTORY_WARN:0xff5252,
  FORCE_BAR:      0x4caf50,
  FORCE_BAR_LOW:  0xf44336,
  HUD_BG:         0x1a1a2e,
  HUD_TEXT:        0xe0e0e0,
  WEIGHT_TEXT:     0xffffff,
  DAMAGE_CRACK:   0x3e2723,
  UI_BUTTON:      0x1a237e,
  UI_BUTTON_HOVER:0x283593,
  UI_ACCENT:      0x7c4dff,
  TITLE_GLOW:     0x00e5ff,
};

// Fan/stream force magnitude (applied per physics step)
export const FAN_FORCE = 0.0008;
export const STREAM_FORCE = 0.0006;

// Bumper restitution
export const BUMPER_RESTITUTION = 1.2;

// Difficulty scaling
export const DIFFICULTY = {
  MIN: 1,
  MAX: 10,
};

// Events
export const EVENTS = {
  SHOT_FIRED:      'shot_fired',
  BODIES_SETTLED:  'bodies_settled',
  BALL_DAMAGED:    'ball_damaged',
  BALL_DESTROYED:  'ball_destroyed',
  FORCE_CHANGED:   'force_changed',
  WEIGHT_CHANGED:  'weight_changed',
  TURN_ADVANCED:   'turn_advanced',
  STATE_CHANGED:   'state_changed',
  GAME_OVER:       'game_over',
  LEVEL_LOADED:    'level_loaded',
  MODIFIER_QUEUED: 'modifier_queued',
  AI_SHOT:         'ai_shot',
};
