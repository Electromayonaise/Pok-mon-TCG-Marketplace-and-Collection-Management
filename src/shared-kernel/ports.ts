import type { CuidId } from './types.js';

// Outbound ports shared by every module (AD-SYS-6). Time, ids and I/O enter a module only
// through these interfaces. Domain code (`modules/*/domain/`) imports none of them.

/** The only source of "now" (AD-SYS-6 rules 1–2). Bound to a virtual clock in tests. */
export interface Clock {
  now(): Date;
}

/** The only source of new primary keys (cuid2). Bound to a deterministic sequence in tests. */
export interface IdGenerator {
  next(): CuidId;
}

export interface QueryResult<Row> {
  rows: Row[];
  rowCount: number;
}

/**
 * A minimal SQL executor: an interactive transaction (`Tx`) or the pooled client. The shape
 * is ours, not the driver's, so no framework object crosses a port signature.
 */
export interface Sql {
  query<Row = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<QueryResult<Row>>;
}

/** An open interactive transaction (AD-SYS-4 rule 1). Commands taking it never commit it. */
export interface Tx extends Sql {
  readonly isTransaction: true;
}

/** Opens one transaction, runs `work` in it, commits on resolve and rolls back on throw. */
export interface TransactionRunner {
  run<T>(work: (tx: Tx) => Promise<T>, options?: { isolation?: 'READ COMMITTED' | 'REPEATABLE READ'; readOnly?: boolean }): Promise<T>;
}

export type EventSubscriber = 'commission' | 'listings' | 'collections';

export interface OutboxEnvelope<Payload extends object = object> {
  type:
    | 'BusinessApplicationApproved'
    | 'BusinessApplicationRejected'
    | 'OrderPaymentConfirmedByBusiness'
    | 'OrderClosed'
    | 'CommissionBalanceExhausted'
    | 'CommissionBalanceReplenished'
    | 'TradeAccepted';
  aggregateId: CuidId;
  payload: Payload;
}

/** AD-SYS-2 rule 1: enqueue in the publisher's transaction; one pending delivery per subscriber. */
export interface Outbox {
  enqueue(tx: Tx, event: OutboxEnvelope): Promise<{ eventId: CuidId }>;
}
