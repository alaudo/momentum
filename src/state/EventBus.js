// ============================================================
// EventBus.js — Phaser EventEmitter singleton for decoupling
// ============================================================

import Phaser from 'phaser';

const EventBus = new Phaser.Events.EventEmitter();

export default EventBus;
