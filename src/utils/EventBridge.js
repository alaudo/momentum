// ============================================================
// EventBridge.js — Lightweight gameObject shim for raw Matter bodies
// ============================================================
// Phaser's MatterCollisionEvents plugin calls body.gameObject.emit()
// on every collision pair.  Raw Matter bodies (walls, bumpers, etc.)
// don't have a Phaser GameObject wrapper, so we attach a minimal
// EventEmitter-compatible shim that satisfies the plugin contract.
// ============================================================

const EventBridge = {
  /**
   * Create a minimal object that satisfies Phaser's requirement for
   * body.gameObject.emit() without pulling in the full EventEmitter.
   *
   * @param {object|null} ref - Optional entity reference (Ball, Bumper, etc.)
   * @returns {{ emit: Function, ref: object|null }}
   */
  create(ref = null) {
    return {
      ref,
      emit() { /* no-op — satisfies Phaser MatterCollisionEvents plugin */ },
    };
  },
};

export default EventBridge;
