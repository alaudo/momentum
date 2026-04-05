# Project Context
Game: "Momentum: Stranded" - A sci-fi survival top-down physics game.
Framework: Phaser 3 with Matter.js physics integration natively.
Language: ES6+ JavaScript modules.
Architecture: Modular. Logic separated into systems/, entities/, level/, rendering/, state/, config/, utils/.

# Core Directives
1. STRICT PHYSICS: Use Matter.js bodies exclusively via Phaser.Physics.Matter. Handle mass, friction, and restitution dynamically.
2. PROCEDURAL GRAPHICS: Generate all graphics using Phaser's Graphics API. No external image sprites.
3. AUDIO: Use ZzFX for procedural sound effects. No external audio files.
4. DELAYED STATE UPDATES: For modifier pads/bouncers, render floating text immediately but only apply weight changes once ball velocity reaches zero.

# Game Logic Constants & Rules
- SCALE: Grid-based, 5x5 to 20x30. Responsive rendering maps internal physics points to large screen pixels.
- WEIGHT CLASSES:
  - Class 1 (Weight 1-4): Flying (immune to pits/water), brittle (spikes kill in 1-2 hits).
  - Class 2 (Weight 5-8): Wooden (float in water, fall in pits), medium durability (3 spike hits).
  - Class 3 (Weight 9-12): Hard (sink in water, fall in pits), immune to spikes.
- FORCE SYSTEM: Shot cost = Pull Power * Ball Weight. Trajectory line shows real-time cost preview.

# Development Workflow
- Work incrementally per PLAN.md phases.
- Test base mechanics before adding layered rules.
