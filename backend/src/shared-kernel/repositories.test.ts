// oneRepository (R-14): the one `repo` object every service receives binds each module adapter's
// methods, and a method two adapters both define fails at wiring instead of shadowing one.
import { describe, expect, it } from 'vitest';
import { oneRepository } from './repositories.js';

class Counter {
  private n = 0;
  async bump(): Promise<number> { return ++this.n; }
}
class Greeter {
  constructor(private readonly name: string) {}
  async greet(): Promise<string> { return `hola ${this.name}`; }
}
class OtherCounter {
  async bump(): Promise<number> { return -1; }
}

describe('oneRepository', () => {
  it('exposes every adapter method bound to its own instance', async () => {
    const repo = oneRepository(new Counter(), new Greeter('Valentina'));
    const { bump, greet } = repo;
    expect(await bump()).toBe(1);
    expect(await repo.bump()).toBe(2);
    expect(await greet()).toBe('hola Valentina');
  });

  it('refuses two adapters that define the same method', () => {
    expect(() => oneRepository(new Counter(), new OtherCounter())).toThrow(/bump/);
  });
});
