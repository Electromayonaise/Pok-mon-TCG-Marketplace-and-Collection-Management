// Public surface of `orders` (AD-1).
import type { Clock, Outbox, Sql, TransactionRunner } from '../../shared-kernel/ports.js';
import { OrdService, type OrdUseCases } from './application/ord.js';
import { PgOrderRepository } from './infra/pg.js';
import type { ListingsForOrders } from './ports/ord.js';

export type * from './dto/ord.dto.js';
export type * from './dto/ord.v2.dto.js';
export type { OrdUseCases } from './application/ord.js';
export type { ListingsForOrders } from './ports/ord.js';

export interface OrdersWiring {
  sql: Sql;
  transactions: TransactionRunner;
  outbox: Outbox;
  clock: Clock;
  listings: ListingsForOrders;
}

/** Composition root for ORD (contracts.md §6). */
export function createOrdModule(w: OrdersWiring): OrdUseCases {
  return new OrdService({ orders: new PgOrderRepository(w.sql), listings: w.listings, transactions: w.transactions, outbox: w.outbox, clock: w.clock });
}

// <gen-solu2-api>
export { OrdServiceV2 } from './application/ord.v2.js';
export type { OrdV2UseCases } from './application/ord.v2.js';
export type * from './ports/ord.v2.js';
// </gen-solu2-api>
