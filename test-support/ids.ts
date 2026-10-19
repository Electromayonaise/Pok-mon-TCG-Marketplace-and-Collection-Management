// Deterministic IdGenerator binding: cuid2-shaped ids (`^[a-z][0-9a-z]{23}$`) from a counter,
// so every Given step and every assertion can name rows exactly (no randomness, AD-SYS-6).
import type { IdGenerator } from '../src/shared-kernel/ports.js';

export class SequentialIds implements IdGenerator {
  private n = 0;
  constructor(private readonly prefix: string = 'x') {
    if (!/^[a-z][0-9a-z]{0,7}$/.test(prefix)) throw new Error(`bad id prefix ${prefix}`);
  }
  next(): string {
    this.n += 1;
    return this.prefix + this.n.toString(36).padStart(24 - this.prefix.length, '0');
  }
}

/**
 * A readable fixed id: `id('valentina')` → 'valentinax00000000000000' (24 chars).
 * The name is followed by one 'x' and zero padding, so the mapping is injective
 * ('r1' and 'r10' no longer collide): the name is everything before the last 'x'.
 */
export function id(name: string): string {
  const base = name.toLowerCase().replace(/[^0-9a-z]/g, '');
  if (!/^[a-z]/.test(base) || base.length > 23) throw new Error(`bad fixture id ${name}`);
  return (base + 'x').padEnd(24, '0');
}
