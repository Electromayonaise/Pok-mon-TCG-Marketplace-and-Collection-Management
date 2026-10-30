// Public surface of `trading` (AD-1).
import type { Clock, Outbox, Sql, TransactionRunner } from '../../shared-kernel/ports.js';
import { TrdService, type TrdUseCases } from './application/trd.js';
import { PgTradeOfferRepository } from './infra/pg.js';
import type { ListingsForTrading } from './ports/trd.js';

export type * from './dto/trd.dto.js';
export type * from './dto/trd.v2.dto.js';
export type { TrdUseCases } from './application/trd.js';
export type { ListingsForTrading } from './ports/trd.js';

export interface TradingWiring {
  sql: Sql;
  transactions: TransactionRunner;
  outbox: Outbox;
  clock: Clock;
  listings: ListingsForTrading;
}

/** Composition root for TRD (contracts.md §8). */
export function createTrdModule(w: TradingWiring): TrdUseCases {
  return new TrdService({ offers: new PgTradeOfferRepository(w.sql), listings: w.listings, transactions: w.transactions, outbox: w.outbox, clock: w.clock });
}

export { PgTrdRepository } from './infra/pg.js';

// <gen-solu2-api>
export { TrdServiceV2 } from './application/trd.v2.js';
export type { TrdV2UseCases } from './application/trd.v2.js';
export type * from './ports/trd.v2.js';
// </gen-solu2-api>
