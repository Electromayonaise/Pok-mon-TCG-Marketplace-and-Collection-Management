// `fake_clock` fixture: deterministic, advanceable time with no real sleep (AD-SYS-6).
import type { Clock } from '../src/shared-kernel/ports.js';

/** The seed instant of ARCH §4 (Test environment). */
export const SEED_INSTANT = Date.parse('2026-10-01T15:00:00.000Z');

export class VirtualClock implements Clock {
  private current: number;
  constructor(startMs: number = SEED_INSTANT) {
    this.current = startMs;
  }
  now(): Date {
    return new Date(this.current);
  }
  /** ISO string of the current instant (for SQL parameters and DTOs). */
  iso(): string {
    return new Date(this.current).toISOString();
  }
  advance(ms: number): void {
    this.current += ms;
  }
  set(ms: number): void {
    this.current = ms;
  }
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
