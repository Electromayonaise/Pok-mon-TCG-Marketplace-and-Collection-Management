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

/** The Solu-2 Postgres adapters of `IdnRepository` and `VerRepository`, for the composition that builds the one `repo` (R-14). */
export { PgIdnRepository, PgVerRepository } from './infra/pg.js';
export { PgLegalIdentityRepository } from './infra/legalIdentityRepository.js';
/** S-FR-IDN-7: the gates the procedure builders ask, and the session port Better Auth binds. */
export { IdentityGateV2, type IdentityGateDeps } from './application/gate.js';
export type { SessionReader } from './ports/session.js';
/** AD-16: the admin guard a neighbour's admin operation runs in its own transaction (decision log Impl-1 #32). */
export { isAdmin, requireAdmin, requireBusinessAccount, sellerKindOf, type AdminFactsReader } from './application/admin.js';

// <gen-solu2-api>
export { IdnServiceV2 } from './application/idn.v2.js';
export type { IdnV2UseCases } from './application/idn.v2.js';
export type * from './ports/idn.v2.js';
export { VerServiceV2 } from './application/ver.v2.js';
export type { VerV2UseCases } from './application/ver.v2.js';
export type * from './ports/ver.v2.js';
// </gen-solu2-api>
