import { NotImplementedError } from './errors.js';
import type { EventEnvelope } from './events.js';
import type { Clock, TransactionRunner, Tx } from './ports.js';
import type { CuidId } from './types.js';

// The outbox dispatcher, sweeper and replay (AD-SYS-2 rules 4–7): the driving adapter that runs
// a subscriber's handler for one EventDelivery. Interface stub (Solutioning stop-point): the
// ATDD proofs of AD-SYS-2 in docs/solu-2/test/atdd/sys_contracts.test.ts call it and are red.

export type SubscriberName = 'commission' | 'listings' | 'collections';

/**
 * One subscriber's handler, run inside the delivery's handler transaction (rule 4 step 2), so
 * the subscriber's state and the `delivered` row commit together. It reads only the envelope's
 * payload (AD-9) and is idempotent by its natural keys (ARCH §7).
 */
export type DeliveryHandler = (tx: Tx, envelope: EventEnvelope) => Promise<void>;

export interface DispatcherV2 {
  /** Rule 5: after commit, one attempt per pending delivery of these events. */
  dispatch(eventIds: CuidId[]): Promise<{ delivered: number; failed: number }>;
  /** Rule 6: pending deliveries older than 60 s, oldest first, at most 50, one attempt each. */
  sweep(): Promise<{ attempted: number; delivered: number; failed: number }>;
  /** Rule 7: re-runs one `failed` delivery in its claim transaction; writes one EventReplayLog row. */
  replay(eventId: CuidId, subscriber: SubscriberName, adminId: CuidId): Promise<{ status: 'delivered' | 'failed'; replayed: boolean }>;
}

export interface DispatcherV2Deps {
  transactions: TransactionRunner;
  clock: Clock;
}

export class OutboxDispatcherV2 implements DispatcherV2 {
  constructor(
    protected readonly deps: DispatcherV2Deps,
    protected readonly handlers: Readonly<Record<SubscriberName, DeliveryHandler>>,
  ) {}
  async dispatch(_eventIds: CuidId[]): Promise<{ delivered: number; failed: number }> {
    throw new NotImplementedError('shared-kernel.dispatch');
  }
  async sweep(): Promise<{ attempted: number; delivered: number; failed: number }> {
    throw new NotImplementedError('shared-kernel.sweep');
  }
  async replay(_eventId: CuidId, _subscriber: SubscriberName, _adminId: CuidId): Promise<{ status: 'delivered' | 'failed'; replayed: boolean }> {
    throw new NotImplementedError('shared-kernel.replay');
  }
}
