// Public surface of `collections` (AD-1). Hosts COL and VAL (ARCH §6.10, §6.11).
import type { Clock, IdGenerator, Sql, TransactionRunner } from '../../shared-kernel/ports.js';
import { ColService, type ColUseCases } from './application/col.js';
import { ValService, type ValUseCases } from './application/val.js';
import { PgCollectionRepository, PgPromptRepository } from './infra/pg.js';
import type { CatalogForCollections } from './ports/collections.js';

export type * from './dto/col.dto.js';
export type * from './dto/val.dto.js';
export type * from './dto/col.v2.dto.js';
export type * from './dto/val.v2.dto.js';
export type { ColUseCases } from './application/col.js';
export type { ValUseCases } from './application/val.js';
export type { CatalogForCollections } from './ports/collections.js';

export interface CollectionsWiring {
  sql: Sql;
  transactions: TransactionRunner;
  clock: Clock;
  ids: IdGenerator;
  catalog: CatalogForCollections;
}

/** Composition root for COL (contracts.md §10). */
export function createColModule(w: CollectionsWiring): ColUseCases {
  return new ColService({
    collections: new PgCollectionRepository(w.sql),
    prompts: new PgPromptRepository(w.sql),
    catalog: w.catalog,
    transactions: w.transactions,
    clock: w.clock,
    ids: w.ids,
  });
}

/** Composition root for VAL (contracts.md §11). */
export function createValModule(w: CollectionsWiring): ValUseCases {
  return new ValService({ collections: new PgCollectionRepository(w.sql), catalog: w.catalog, transactions: w.transactions, clock: w.clock });
}

export { PgColRepository } from './infra/pg.js';

// <gen-solu2-api>
export { ColServiceV2 } from './application/col.v2.js';
export type { ColV2UseCases } from './application/col.v2.js';
export type * from './ports/col.v2.js';
export { ValServiceV2 } from './application/val.v2.js';
export type { ValV2UseCases } from './application/val.v2.js';
export type * from './ports/val.v2.js';
// </gen-solu2-api>
