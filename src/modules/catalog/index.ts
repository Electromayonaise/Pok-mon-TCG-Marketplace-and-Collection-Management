// Public surface of `catalog` (AD-1). `catalog` depends on no module (ARCH §6.3).
import type { Clock, IdGenerator, Sql, TransactionRunner } from '../../shared-kernel/ports.js';
import { CatService, type CatUseCases } from './application/cat.js';
import { PgCatalogEntryRepository, PgFeedRunRepository, PgReferencePriceRepository } from './infra/pg.js';

export type * from './dto/cat.dto.js';
export type * from './dto/cat.v2.dto.js';
export type { CatUseCases } from './application/cat.js';

export interface CatalogWiring {
  sql: Sql;
  transactions: TransactionRunner;
  clock: Clock;
  ids: IdGenerator;
  freshnessThresholdHours?: number;
}

/** Composition root for CAT (contracts.md §3). */
export function createCatModule(w: CatalogWiring): CatUseCases {
  return new CatService({
    runs: new PgFeedRunRepository(w.sql),
    entries: new PgCatalogEntryRepository(w.sql),
    prices: new PgReferencePriceRepository(w.sql),
    transactions: w.transactions,
    clock: w.clock,
    ids: w.ids,
    freshnessThresholdHours: w.freshnessThresholdHours ?? 36,
  });
}
