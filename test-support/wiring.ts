// Per-test wiring of the shared ports: a fresh virtual clock, deterministic ids and the
// SQL outbox over the per-file database.
import type { TestDb } from './db.js';
import { VirtualClock } from './clock.js';
import { SequentialIds } from './ids.js';
import { SqlOutbox } from './outbox.js';

export interface Wiring {
  sql: TestDb['sql'];
  transactions: TestDb['transactions'];
  clock: VirtualClock;
  ids: SequentialIds;
  outbox: SqlOutbox;
}

export function wiring(db: TestDb, idPrefix = 'n'): Wiring {
  const clock = new VirtualClock();
  const ids = new SequentialIds(idPrefix);
  return { sql: db.sql, transactions: db.transactions, clock, ids, outbox: new SqlOutbox(ids, clock) };
}
