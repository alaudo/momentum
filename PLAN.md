# Implementation Plan: Momentum: Stranded

## Context

We are building "Momentum: Stranded" from scratch in an empty git repo at `/q/ai/momentum`. This is a 2D top-down physics-based browser game where players use billiard-style pull-and-release mechanics to push enemy balls into environmental hazards. The game features weight classes (1-12), varied terrain, a Force resource system, procedural generation, and 4 game modes (Rogue, Skirmish, PvP, Campaign). All graphics are procedural (no external sprites), all audio is procedural via ZzFX.

---

## Tech Stack

- **Engine:** Phaser 3 (~3.90.0) with built-in Matter.js physics
- **Language:** ES6+ JavaScript modules
- **Bundler:** Vite
- **RNG:** seedrandom.js for deterministic procedural generation
- **Audio:** ZzFX (procedural sound effects, <1KB)
- **Persistence:** LocalStorage

---

## File Structure

```
/q/ai/momentum/
├── index.html
├── package.json
├── vite.config.js
├── CLAUDE.md
├── .gitignore
├── README.md
│
├── src/
│   ├── main.js                        # Entry: Phaser game config, boot
│   │
│   ├── config/
│   │   ├── Constants.js               # All magic numbers, enums, tile sizes
│   │   ├── WeightClassData.js         # Weight class definitions (1-12)
│   │   └── TerrainData.js             # Terrain type definitions & properties
│   │
│   ├── scenes/
│   │   ├── BootScene.js               # Show loading text, transition to Preload
│   │   ├── PreloadScene.js            # Generate procedural textures into cache
│   │   ├── MainMenuScene.js           # Title screen, mode selection
│   │   ├── SeedInputScene.js          # Seed entry for Rogue/Skirmish/PvP
│   │   ├── GameScene.js               # Core gameplay scene
│   │   ├── HUDScene.js                # Overlay: Force bar, turn info, scores
│   │   ├── PauseScene.js              # Pause overlay
│   │   ├── GameOverScene.js           # Win/loss summary
│   │   └── CampaignSelectScene.js     # Campaign mission picker
│   │
│   ├── systems/
│   │   ├── PhysicsSystem.js           # Matter.js config, collision handling, settle detection
│   │   ├── InputSystem.js             # Pull-release mechanic, trajectory preview, force cost
│   │   ├── TurnSystem.js              # Turn state machine, move counting, Force regen
│   │   ├── ForceSystem.js             # Force pool, cost calc, validation
│   │   ├── HazardSystem.js            # Hazard detection, damage, ball removal
│   │   ├── TerrainSystem.js           # Friction, fans, water streams
│   │   ├── ModifierSystem.js          # Weight modifier pads/bouncers, delayed update
│   │   ├── AISystem.js                # Enemy AI for Skirmish mode
│   │   └── AudioSystem.js             # ZzFX wrapper, sound definitions
│   │
│   ├── entities/
│   │   ├── Ball.js                    # Base ball (Matter body + Graphics + weight text)
│   │   ├── PlayerBall.js              # Player-owned ball
│   │   ├── EnemyBall.js               # Enemy ball
│   │   ├── Bumper.js                  # Bouncy element entity
│   │   └── EntityFactory.js           # Factory for creating entities from data
│   │
│   ├── level/
│   │   ├── TileGrid.js               # Grid data structure, tile access, coords
│   │   ├── TileRenderer.js           # Procedural rendering of all tile types
│   │   ├── LevelGenerator.js         # Seeded procedural level generation
│   │   ├── LevelLoader.js            # Load campaign levels from JSON
│   │   ├── LevelValidator.js         # Validate levels are playable
│   │   └── WallBuilder.js            # Perimeter wall generation
│   │
│   ├── rendering/
│   │   ├── BallRenderer.js           # Ball graphics (circle, weight text, damage cracks)
│   │   ├── TrajectoryRenderer.js     # Aim line, power indicator, force cost preview
│   │   ├── EffectsRenderer.js        # Visual effects (splash, crack, puff, glow)
│   │   └── UIComponents.js           # Reusable UI: buttons, bars, panels
│   │
│   ├── state/
│   │   ├── GameState.js              # Central game state container
│   │   ├── SessionState.js           # Current session: mode, seed, difficulty, turn
│   │   ├── PersistenceManager.js     # LocalStorage read/write
│   │   └── EventBus.js               # Phaser EventEmitter singleton
│   │
│   ├── data/
│   │   ├── campaigns/
│   │   │   ├── mission01.json        # Hand-crafted campaign levels
│   │   │   ├── mission02.json
│   │   │   └── ... (up to mission10.json)
│   │   └── CampaignIndex.js          # Campaign mission manifest
│   │
│   └── utils/
│       ├── SeededRandom.js            # seedrandom.js wrapper
│       ├── CoordinateUtils.js         # Tile <-> pixel <-> world conversions
│       ├── MathUtils.js               # Vector ops, clamping, interpolation
│       └── DebugUtils.js              # Debug overlays, physics viz
```

---

## Key Constants (from GDD)

```
TILE_SIZE_POINTS = 10           // Each tile = 10x10 internal points
POINT_TO_PIXEL = 6              // 1 internal point = ~6 screen pixels (tunable for responsive fit)
MIN_GRID = { w: 5, h: 5 }
MAX_GRID = { w: 20, h: 30 }
BALL_RADIUS_BASE = 3            // Internal points
FORCE_MAX = 100
FORCE_REGEN_INTERVAL = 3        // Regen every N moves
FORCE_REGEN_AMOUNT = 25
MOTION_THRESHOLD = 0.05         // Velocity below this = "stopped"
MOTION_TIMEOUT = 5000           // Max ms to wait for settle
```

---

## Weight Class Reference (exact GDD rules)

| Weight | Class | Abyss | Water | Spikes | Fans | Streams | Spike Hits to Perish |
|--------|-------|-------|-------|--------|------|---------|---------------------|
| 1-2    | 1 (Balloon) | Immune (fly over) | Immune (fly over) | Vulnerable | Affected | Not affected | 1 hit |
| 3-4    | 1 (Balloon) | Immune (fly over) | Immune (fly over) | Vulnerable | Affected | Not affected | 2 hits |
| 5-8    | 2 (Wooden) | Perish | Float | Vulnerable | Not affected | Carried | 3 hits |
| 9-12   | 3 (Heavy) | Perish | Perish (sink) | Immune | Not affected | Not affected | N/A |

---

## Turn System State Machine

```
PLAYER_AIM -> [shot fired] -> PHYSICS_ACTIVE
PHYSICS_ACTIVE -> [all balls settled] -> HAZARD_RESOLVE
HAZARD_RESOLVE -> [done] -> MODIFIER_RESOLVE
MODIFIER_RESOLVE -> [done] -> TURN_END
TURN_END -> [game continues, player turn] -> PLAYER_AIM
TURN_END -> [game continues, AI turn] -> AI_THINK
TURN_END -> [win/loss met] -> GAME_OVER
AI_THINK -> [AI shoots] -> PHYSICS_ACTIVE
```

---

## Implementation Phases

### Phase 1: Project Scaffold & Physics Sandbox

**Goal:** Playable sandbox with walled room, two balls, pull-release-shoot, physics collisions.

**Step 1.1: Project Bootstrap**
- `npm init`, install phaser, vite, seedrandom, zzfx
- Create `index.html`, `vite.config.js`, `.gitignore`, `CLAUDE.md`
- Create `src/main.js` with Phaser config (Matter.js physics, gravity: 0)
- Create `BootScene.js` (shows "Loading..." text)
- **Verify:** `npm run dev` opens browser, shows loading text

**Step 1.2: Walled Room + Player Ball**
- Create `Constants.js` with initial values
- Create `Ball.js`: Matter.js circle body + Phaser Graphics circle + centered weight text
- Create basic `GameScene.js`: rectangular walled room using Matter static rectangle bodies
- Place one white player ball in center
- Create `CoordinateUtils.js` and `MathUtils.js`
- **Verify:** Ball renders in walled room, bounces off walls

**Step 1.3: Pull-Release Mechanic**
- Create `InputSystem.js`: pointerdown on ball -> drag backward -> compute angle/power -> release fires impulse
- Create `TrajectoryRenderer.js`: dotted line showing predicted direction, color-coded by power
- The trajectory must point in the direction the ball will travel (opposite to drag direction)
- **Verify:** Click-drag-release shoots ball, trajectory previews correctly

**Step 1.4: Two-Ball Collisions**
- Create `PlayerBall.js` and `EnemyBall.js` (extend Ball)
- Create `EntityFactory.js`
- Create `PhysicsSystem.js`: collision categories (BALL, WALL), ball-ball collision events
- Add a red enemy ball, test collisions
- **Verify:** Shoot player ball into enemy, realistic collision (light pushes heavy barely, heavy crushes light)

**Step 1.5: Settlement Detection**
- In `PhysicsSystem.js`: poll all ball velocities each frame, emit `BODIES_SETTLED` when all below `MOTION_THRESHOLD`, with `MOTION_TIMEOUT` safety
- **Verify:** After shot, system detects when all balls stop

---

### Phase 2: Weight Classes & Force System

**Goal:** Weighted physics with Force economy and HUD.

**Step 2.1: Weight Class Data**
- Create `WeightClassData.js`: lookup by weight -> { class, mass, friction, restitution, maxHP, immunities }
- Update `Ball.js` to set Matter.js mass/friction/restitution from weight class
- **Verify:** Weight 1 ball flies far from light push; weight 12 barely moves from same impulse

**Step 2.2: Force System**
- Create `ForceSystem.js`: pool tracking, cost = `pullPower * ballWeight`, canAfford(), spend()
- Create `EventBus.js` (Phaser EventEmitter singleton)
- Wire `InputSystem` to check force before firing; show real-time force cost in trajectory preview
- **Verify:** Force depletes correctly, shots blocked when insufficient, cost preview accurate

**Step 2.3: Basic Turn System**
- Create `TurnSystem.js` with FSM: PLAYER_AIM -> PHYSICS_ACTIVE -> TURN_END -> PLAYER_AIM
- Move counting, Force regen every N moves
- Create `GameState.js` and `SessionState.js`
- **Verify:** Turns increment, Force regenerates, can't shoot during physics active

**Step 2.4: HUD Scene**
- Create `HUDScene.js`: Force bar, turn counter, active ball weight display
- Create `UIComponents.js`: reusable progress bar, text panel
- Subscribe HUD to EventBus events (FORCE_CHANGED, TURN_ADVANCED)
- **Verify:** HUD updates in real-time

**Step 2.5: Ball Rendering**
- Create `BallRenderer.js`: color by owner, weight number centered on ball, size scales slightly with weight
- Glow/highlight effect when ball is selected for aiming
- **Verify:** All balls show weight number clearly, visually distinct by class

---

### Phase 3: Hazards & Health Logic

**Goal:** Tile-based arena with Abyss, Water, Spikes. Win by pushing enemies into hazards.

**Step 3.1: Tile Grid Foundation**
- Create `TileGrid.js`: 2D array of tile objects { type, friction, metadata }
- Create `TileRenderer.js`: procedural rendering of Safe Ground (varying stippling for friction)
- Create `WallBuilder.js`: auto-generate perimeter walls from grid
- Refactor `GameScene` to build room from TileGrid
- **Verify:** Visible tile grid with walls

**Step 3.2: Abyss Hazard**
- Abyss tile: dark void rendering (black with subtle pattern)
- Matter.js sensor bodies on Abyss tiles (detect overlap, no physics collision)
- Create `HazardSystem.js`: detect ball-on-Abyss, queue destruction
- Class 1 (W1-4) immune (fly over), Class 2+3 perish
- Ball destruction: emit `BALL_DESTROYED`, removal animation (fade/shrink)
- **Verify:** Class 2/3 destroyed, Class 1 passes over

**Step 3.3: Water Hazard**
- Water tile: blue animated fill
- Class 3 (W9-12) sinks/perishes, Class 2 (W5-8) floats (stops in place, high friction), Class 1 immune
- **Verify:** Each weight class interacts correctly

**Step 3.4: Spike Hazard**
- Spike tile: gray with spike visual pattern
- HP system in `Ball.js`: `damage(amount)` decrements HP, destroy at 0
- W1-2: 1 hit to perish. W3-4: 2 hits. W5-8: 3 hits. W9-12: immune (bounce off)
- Visual degradation in `BallRenderer.js`: crack overlay increases with damage
- **Verify:** Correct damage per weight class, visual degradation, destruction at 0 HP

**Step 3.5: Full Turn Resolution**
- Wire complete FSM: PHYSICS_ACTIVE -> HAZARD_RESOLVE -> MODIFIER_RESOLVE -> TURN_END
- Hazards resolve only after all balls settle
- Win condition: all enemy balls destroyed. Lose condition: all player balls destroyed (or out of Force with no way to win)
- **Verify:** Push enemy into Abyss -> enemy removed after physics settle -> win if last enemy

---

### Phase 4: Terrain & Modifiers

**Goal:** Full terrain system with fans, streams, bouncers, modifiers, and audio.

**Step 4.1: Terrain Friction Variants**
- Multiple Safe Ground variants with different friction values
- `TerrainSystem.js`: each physics step, check ball's tile, apply friction override
- Visual: darker stippling = higher friction (sand-like)
- **Verify:** Balls slide further on low-friction, stop faster on high-friction

**Step 4.2: Fans**
- Fan tiles with directional arrow rendering (N/S/E/W)
- TerrainSystem applies continuous force to Class 1 balls on fan tiles each physics step
- No effect on Class 2/3
- **Verify:** Light balls pushed by fans, heavy balls unaffected

**Step 4.3: Water Streams**
- Stream tiles with directional flow rendering (animated arrows)
- TerrainSystem applies continuous force to Class 2 balls each physics step
- No effect on Class 1/3
- **Verify:** Wooden balls carried by streams, others unaffected

**Step 4.4: Bouncy Elements**
- Create `Bumper.js`: static Matter bodies with high restitution (~1.0-1.2)
- Round bumpers (circle) and square bumpers (rectangle), can span multiple tiles
- Bright colored rendering with pulse animation
- **Verify:** Balls bounce energetically off bumpers

**Step 4.5: Modifier Pads**
- Modifier pad tiles with +N or -N label rendered on tile
- `ModifierSystem.js`: detect ball passing over pad, queue weight change
- **Delayed Update Mechanic:** Show floating "+N" or "-N" text above ball while moving. Only apply actual weight/mass change in MODIFIER_RESOLVE phase (after ball stops). Ball retains original physics class until fully stopped.
- Handle class transitions on weight change (recalculate all physics properties, re-render)
- Clamp weight to 1-12 range
- **Verify:** Ball crosses +3 pad at weight 2, shows "+3" floating text while moving, becomes weight 5 (Class 2) after stopping

**Step 4.6: Modifier Bouncers**
- Bumpers that also queue weight modifiers on bounce contact
- Combine Bumper physics with ModifierSystem
- **Verify:** Ball bounces off modifier bouncer, gets weight change after settling

**Step 4.7: Audio (ZzFX)**
- Create `AudioSystem.js`: ZzFX wrapper with named sound definitions
- Sounds: shoot, collide_light, collide_heavy, splash (water), crack (spikes), fall (abyss), puff (fan), bounce (bumper), modifier_apply, ui_click, win, lose, force_regen
- Wire sounds to EventBus collision/hazard/UI events
- **Verify:** All interactions produce appropriate procedural sounds

---

### Phase 5: Procedural Generation

**Goal:** Infinite replayable content via deterministic seeds.

**Step 5.1: Seeded Random**
- Create `SeededRandom.js`: wrap seedrandom.js
- Parse seed format: `{RandomString}-{DifficultyInt}` (e.g., "alphaOmega-3")
- Expose: next(), range(min, max), pick(array), chance(prob), shuffle(array)
- **Verify:** Same seed -> identical sequence across runs

**Step 5.2: Basic Level Generator**
- Create `LevelGenerator.js`:
  1. Grid size from difficulty: interpolate from 5x5 (diff 1) to 20x30 (diff 10)
  2. Fill with Safe Ground
  3. Place Abyss clusters (random walk, count scales with difficulty)
  4. Place player ball(s) in safe zone
  5. Place enemy balls with minimum distance from player
- **Verify:** Same seed = identical level. Different seeds = different levels.

**Step 5.3: Full Terrain Generation**
- Add Water bodies (cellular automata: random fill -> smoothing passes)
- Add Spike strips (linear segments near hazards)
- Add Fans (adjacent to Abyss/Water, pointing toward hazards - creates traps)
- Add Water Streams (connecting to water bodies)
- Add Bumpers (near hazards, near walls)
- Add Modifier Pads (1-3 per level, in accessible locations)
- **Verify:** Generated levels use all terrain types, feel varied

**Step 5.4: Level Validation**
- Create `LevelValidator.js`:
  - Flood-fill from player: can reach at least one enemy
  - No balls placed on lethal hazards
  - At least one hazard reachable to push enemies into
- If invalid, retry with incremented seed suffix (deterministic)
- **Verify:** No unwinnable levels across 100 random seeds

**Step 5.5: Difficulty Scaling**
- Difficulty 1-10 affects: grid size, enemy count (1-2 -> 5-8), enemy weights (more Class 3 at higher diff), hazard density, hazard proximity to player spawn, initial Force pool (high -> low), Force regen frequency
- **Verify:** Difficulty 1 feels easy, difficulty 10 feels punishing

---

### Phase 6: AI & Game Modes

**Goal:** All four game modes playable with complete menu flow.

**Step 6.1: Main Menu & Scene Flow**
- Create `MainMenuScene.js`: title "Momentum: Stranded", 4 mode buttons, settings
- Create `SeedInputScene.js`: seed text input, difficulty slider, random seed button
- Create `GameOverScene.js`: win/loss, score, seed display, replay/next/menu
- Wire all scene transitions
- **Verify:** Full menu flow for all modes

**Step 6.2: Rogue Mode**
- Sequence: enter seed -> generate level -> play -> win -> next level (difficulty+1, same base seed) -> repeat
- Lose = game over, show run summary (levels cleared, total score)
- Score formula: enemies defeated x difficulty x turns efficiency bonus
- **Verify:** Complete Rogue run from difficulty 1 through progression

**Step 6.3: AI System**
- Create `AISystem.js`:
  - For each enemy ball, evaluate N candidate shot angles (evenly distributed around circle)
  - For each candidate: estimate where player ball would end up if hit
  - Score by proximity of player ball to nearest hazard (lower distance = better)
  - Select best (ball, angle, power) with noise for lower difficulties
  - AI has own Force pool, respects Force system
  - Brief "thinking" delay before AI executes shot
- **Verify:** AI makes reasonable moves targeting player toward hazards

**Step 6.4: Skirmish Mode**
- Like Rogue but turns alternate: Player -> AI -> Player -> AI
- Win: all enemy balls destroyed. Lose: all player balls destroyed.
- **Verify:** Full Skirmish game with competent AI opponent

**Step 6.5: PvP Mode (Local Hotseat)**
- Two players alternate turns with own ball sets (blue vs red)
- Each player has own Force pool
- Turn indicator in HUD, screen transition overlay ("Player 2's Turn")
- **Verify:** Two humans can play on same device

**Step 6.6: Campaign Mode**
- Create `LevelLoader.js`: parse campaign JSON -> same output as LevelGenerator
- Create `CampaignSelectScene.js`: mission list with lock/unlock status
- Create `CampaignIndex.js`: manifest with unlock conditions
- **10 GDD-specified mission types:**
  1. **Clear the Board:** Push all enemies into hazards before running out of Force
  2. **Precision Strike:** Perish the designated "King" ball; hitting other enemies costs heavy Force penalty
  3. **Efficiency Expert:** Board wipe with extremely tight Force limit (1-2 shots)
  4. **Pacifist Survival:** Enemy AI hunts you; survive N turns without perishing
  5. **Chain Reaction:** All enemies must perish in a single continuous shot/turn
  6. **Weight Watcher:** Navigate modifier pads to hit exact target weight before interacting with hazard/enemy
  7. **The Escort:** Protect a friendly W1 balloon from enemy AI and fans, guide to safe zone
  8. **Environmentalist:** Perish enemies using only one designated hazard type
  9. **Time Attack:** Complete puzzle within real-time limit
  10. **Pinball Wizard:** Player ball must bounce off 5+ bumpers before final blow
- Design 2-3 hand-crafted levels per mission type as JSON
- Difficulty ramps: heavier enemies, player spawns near hazards, reduced Force, multi-stage logic, combined mission types
- **Verify:** All 10 mission types playable and completable

**Step 6.7: Persistence**
- Create `PersistenceManager.js`: LocalStorage with versioned schema
- Save: campaign progress (unlocked/completed missions, scores), Rogue/Skirmish high scores, settings
- Auto-save on level complete / game over
- **Verify:** Progress survives browser refresh

**Step 6.8: Pause System**
- Create `PauseScene.js`: overlay with resume/restart/quit
- Pause/resume physics and turn system
- **Verify:** Pause mid-turn, resume without state corruption

---

### Phase 7: Polish & Effects

**Goal:** Polished, responsive, visually appealing game.

**Step 7.1: Visual Effects**
- Create `EffectsRenderer.js`:
  - Abyss death: shrink + fade into darkness
  - Water death: splash ring particles
  - Spike death: crack + shatter fragments
  - Spike damage: flash red, crack overlay
  - Force regen: glow pulse on Force bar
  - Weight change: shimmer + size transition
  - Collision: flash at contact point (intensity proportional to force)
  - Bumper hit: bumper pulse/flash

**Step 7.2: Responsive Camera & Scaling**
- Compute optimal zoom to fit grid on screen at any viewport size
- Camera smoothly follows action during physics (pan to moving balls)
- Ensure "chunky, clearly visible" rendering per GDD (internal points -> large pixel blocks)

**Step 7.3: Debug Tooling**
- Create `DebugUtils.js`: toggle physics body outlines, tile grid overlay, FPS counter, force vectors
- URL param `?debug=true` enables overlays

**Step 7.4: Edge Cases**
- Ball-on-ball stacking resolution
- Balls stuck in walls (post-correction)
- Very long physics sims (timeout -> force settle)
- Weight transition integrity (modifier changing class mid-level)
- Prevent shooting during PHYSICS_ACTIVE or resolve phases

---

## Verification Strategy

| Phase | How to Verify |
|-------|--------------|
| 1: Sandbox | `npm run dev`, click-drag-release shoots ball, bounces off walls, two balls collide realistically |
| 2: Weight/Force | Weight 1 vs 12 movement dramatically different, Force depletes/blocks/regens correctly, HUD updates live |
| 3: Hazards | Push each weight class into each hazard - verify immunity matrix matches table above exactly |
| 4: Terrain | Fan pushes Class 1 only, Stream carries Class 2 only, modifiers apply delayed, bumpers bounce, all sounds play |
| 5: ProcGen | Same seed = identical level (run 10x), generate 100+ levels across difficulties - all pass validation |
| 6: Modes | Play each mode start-to-finish, AI makes non-trivial moves, PvP alternation works, campaign saves/loads |
| 7: Polish | Test Chrome/Firefox/Edge, test multiple viewport sizes (800x600 to 2560x1440), effects play, no layout breaks |

---

## Critical Design Decisions

1. **All procedural graphics** via Phaser Graphics API - zero external assets, zero load time
2. **Matter.js exclusively** - no Arcade physics, real mass/friction/restitution
3. **Gravity = 0** (top-down perspective)
4. **Hazard tiles use Matter.js sensors** (detect overlap without physics collision) for clean detection
5. **Terrain effects (fans/streams) applied per-frame** during PHYSICS_ACTIVE for smooth continuous forces
6. **Delayed modifier updates** - weight changes queue during motion, apply only after all balls settle in MODIFIER_RESOLVE phase
7. **EventBus decoupling** - systems communicate via events, HUD subscribes independently
8. **AI uses angle sampling + heuristic scoring** - predictable performance, tunable difficulty via noise
9. **Level validation with deterministic retry** - if generated level is unwinnable, increment seed suffix and regenerate
