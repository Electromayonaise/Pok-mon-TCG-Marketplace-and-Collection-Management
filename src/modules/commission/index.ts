// Public surface of `commission` (AD-1).
import type { Clock, IdGenerator, Outbox, Sql } from '../../shared-kernel/ports.js';
import { ComService, type ComUseCases } from './application/com.js';
import { PgCommissionAccountRepository, PgCommissionLedgerRepository, PgTopUpRepository } from './infra/pg.js';

export type * from './dto/com.dto.js';
export type * from './dto/com.v2.dto.js';
export type { ComUseCases } from './application/com.js';

export interface CommissionWiring {
  sql: Sql;
  outbox: Outbox;
  clock: Clock;
  ids: IdGenerator;
}

/** Composition root for COM (contracts.md §7). */
export function createComModule(w: CommissionWiring): ComUseCases {
  return new ComService({
    ledger: new PgCommissionLedgerRepository(w.sql),
    accounts: new PgCommissionAccountRepository(w.sql),
    topUps: new PgTopUpRepository(w.sql),
    outbox: w.outbox,
    clock: w.clock,
    ids: w.ids,
  });
}

// <gen-solu2-api>
export { ComServiceV2 } from './application/com.v2.js';
export type { ComV2UseCases } from './application/com.v2.js';
export type * from './ports/com.v2.js';
// </gen-solu2-api>
