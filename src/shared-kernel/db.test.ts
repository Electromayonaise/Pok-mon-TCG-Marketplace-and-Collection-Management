// The ambient transaction (AD-SYS-4 rule 9): a neighbour query called inside a transaction finds
// it here instead of taking a second connection. Interleavings are forced with gates the test
// opens itself, never with timers (decision log Impl-2 #8).
import { describe, expect, it } from 'vitest';
import { ambientTx, withAmbientTx } from './db.js';
import type { Tx } from './ports.js';

const fakeTx = (): Tx => ({ isTransaction: true, query: async () => ({ rows: [], rowCount: 0 }) });

/** A promise the test resolves when it chooses. */
function gate(): { opened: Promise<void>; open: () => void } {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => { open = resolve; });
  return { opened, open };
}

describe('ambient transaction (AD-SYS-4 rule 9)', () => {
  it('is the open transaction inside the scope, across awaits, and gone after it', async () => {
    const tx = fakeTx();
    const g = gate();
    expect(ambientTx()).toBeUndefined();
    const seen = withAmbientTx(tx, async () => {
      await g.opened;
      return ambientTx();
    });
    g.open();
    expect(await seen).toBe(tx);
    expect(ambientTx()).toBeUndefined();
  });

  it('keeps concurrent scopes apart', async () => {
    const [a, b] = [fakeTx(), fakeTx()];
    const g = gate();
    // a waits inside its scope until b has read its own: the two scopes overlap.
    const seen = await Promise.all([
      withAmbientTx(a, async () => { await g.opened; return ambientTx(); }),
      withAmbientTx(b, async () => { const mine = ambientTx(); g.open(); return mine; }),
    ]);
    expect(seen).toEqual([a, b]);
  });

  it('is gone for work that outlives its scope, so a released connection is never reused', async () => {
    const g = gate();
    let late: Promise<Tx | undefined> = Promise.resolve(undefined);
    await withAmbientTx(fakeTx(), async () => {
      late = g.opened.then(() => ambientTx());
    });
    g.open();
    expect(await late).toBeUndefined();
  });
});
