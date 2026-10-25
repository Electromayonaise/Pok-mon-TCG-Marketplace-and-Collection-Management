// The ambient transaction (AD-SYS-4 rule 9): a neighbour query called inside a transaction finds
// it here instead of taking a second connection.
import { describe, expect, it } from 'vitest';
import { ambientTx, withAmbientTx } from './db.js';
import type { Tx } from './ports.js';

const fakeTx = (): Tx => ({ isTransaction: true, query: async () => ({ rows: [], rowCount: 0 }) });

describe('ambient transaction (AD-SYS-4 rule 9)', () => {
  it('is the open transaction inside the scope, across awaits, and gone after it', async () => {
    const tx = fakeTx();
    expect(ambientTx()).toBeUndefined();
    const seen = await withAmbientTx(tx, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return ambientTx();
    });
    expect(seen).toBe(tx);
    expect(ambientTx()).toBeUndefined();
  });

  it('keeps concurrent scopes apart', async () => {
    const [a, b] = [fakeTx(), fakeTx()];
    const seen = await Promise.all([
      withAmbientTx(a, async () => { await new Promise((resolve) => setTimeout(resolve, 2)); return ambientTx(); }),
      withAmbientTx(b, async () => ambientTx()),
    ]);
    expect(seen).toEqual([a, b]);
  });

  it('is gone for work that outlives its scope, so a released connection is never reused', async () => {
    let late: Promise<Tx | undefined> = Promise.resolve(undefined);
    await withAmbientTx(fakeTx(), async () => {
      late = new Promise((resolve) => setTimeout(() => resolve(ambientTx()), 5));
    });
    expect(await late).toBeUndefined();
  });
});
