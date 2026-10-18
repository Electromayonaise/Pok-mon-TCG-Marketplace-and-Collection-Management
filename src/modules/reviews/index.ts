// Public surface of `reviews` (AD-1).
import type { Clock, IdGenerator, Sql, TransactionRunner } from '../../shared-kernel/ports.js';
import { RepService, type RepUseCases } from './application/rep.js';
import { PgReviewRepository } from './infra/pg.js';
import type { IdentityForReviews, OrdersForReviews } from './ports/rep.js';

export type * from './dto/rep.dto.js';
export type { RepUseCases } from './application/rep.js';
export type { IdentityForReviews, OrdersForReviews } from './ports/rep.js';

export interface ReviewsWiring {
  sql: Sql;
  transactions: TransactionRunner;
  clock: Clock;
  ids: IdGenerator;
  identity: IdentityForReviews;
  orders: OrdersForReviews;
}

/** Composition root for REP (contracts.md §12). */
export function createRepModule(w: ReviewsWiring): RepUseCases {
  return new RepService({ reviews: new PgReviewRepository(w.sql), identity: w.identity, orders: w.orders, transactions: w.transactions, clock: w.clock, ids: w.ids });
}
