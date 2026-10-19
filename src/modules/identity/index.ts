// Public surface of `identity` (AD-1): the only importable path for other modules and tests.
import type { Clock, IdGenerator, Outbox, Sql, TransactionRunner } from '../../shared-kernel/ports.js';
import { IdnService, type IdnUseCases } from './application/idn.js';
import { VerService, type VerUseCases } from './application/ver.js';
import { PgBusinessApplicationRepository, PgBusinessProfileRepository, PgRejectionReasonRepository, PgUserRepository } from './infra/pg.js';

export type * from './dto/idn.dto.js';
export type * from './dto/ver.dto.js';
export type * from './dto/idn.v2.dto.js';
export type * from './dto/ver.v2.dto.js';
export type { IdnUseCases } from './application/idn.js';
export type { VerUseCases } from './application/ver.js';

export interface IdentityWiring {
  sql: Sql;
  transactions: TransactionRunner;
  outbox: Outbox;
  clock: Clock;
  ids: IdGenerator;
}

/** Composition root for IDN (contracts.md §1). */
export function createIdnModule(w: IdentityWiring): IdnUseCases {
  return new IdnService({ users: new PgUserRepository(w.sql), clock: w.clock });
}

/** Composition root for VER (contracts.md §2). */
export function createVerModule(w: IdentityWiring): VerUseCases {
  return new VerService({
    applications: new PgBusinessApplicationRepository(w.sql),
    reasons: new PgRejectionReasonRepository(w.sql),
    profiles: new PgBusinessProfileRepository(w.sql),
    transactions: w.transactions,
    outbox: w.outbox,
    clock: w.clock,
    ids: w.ids,
  });
}
