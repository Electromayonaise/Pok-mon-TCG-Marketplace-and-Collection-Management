import { AsyncLocalStorage } from 'node:async_hooks';
import type { Tx } from './ports.js';

// AD-SYS-4 rule 9: the transaction runner records the open `Tx` here, so a neighbour query called
// inside it reads on that connection and never asks the pool for a second one (with `max: 1`
// that second connection would wait forever). `src/server/db.ts` owns the name `db()` for the
// pooled client, so the ambient half is these two functions.

// A slot, not the `Tx` itself: async work started inside the scope keeps the store after the
// scope ends (a timer, a listener), and must not reach a connection already released to the pool.
const ambient = new AsyncLocalStorage<{ tx: Tx | undefined }>();

/** Runs `work` with `tx` as the ambient transaction; every transaction runner wraps its work in it. */
export async function withAmbientTx<T>(tx: Tx, work: () => Promise<T>): Promise<T> {
  const slot = { tx: tx as Tx | undefined };
  try {
    return await ambient.run(slot, work);
  } finally {
    slot.tx = undefined;
  }
}

/** The transaction open in this async context, if any; `undefined` once its scope has ended. */
export function ambientTx(): Tx | undefined {
  return ambient.getStore()?.tx;
}
