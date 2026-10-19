import { NotImplementedError } from './errors.js';
import type { CuidId } from './types.js';

// The outbox dispatcher and sweeper (AD-SYS-2 rules 4–6): the driving adapter that runs a
// subscriber's handler for each pending EventDelivery. Interface stub (Solutioning stop-point):
// the ATDD proofs of AD-SYS-2 in docs/solu-2/test/atdd/sys_contracts.test.ts call it and are red.

export type SubscriberName = 'commission' | 'listings' | 'collections';

/** One subscriber's handler, run inside the delivery's handler transaction (rule 4 step 2). */
export type DeliveryHandler = (eventId: CuidId) => Promise<void>;

export interface DispatcherV2 {
  /** Rule 5: after commit, one attempt per pending delivery of these events. */
  dispatch(eventIds: CuidId[]): Promise<{ delivered: number; failed: number }>;
  /** Rule 6: pending deliveries older than 60 s, oldest first, at most 50, one attempt each. */
  sweep(): Promise<{ attempted: number; delivered: number; failed: number }>;
}

export class OutboxDispatcherV2 implements DispatcherV2 {
  constructor(protected readonly handlers: Readonly<Record<SubscriberName, DeliveryHandler>>) {}
  async dispatch(_eventIds: CuidId[]): Promise<{ delivered: number; failed: number }> {
    throw new NotImplementedError('shared-kernel.dispatch');
  }
  async sweep(): Promise<{ attempted: number; delivered: number; failed: number }> {
    throw new NotImplementedError('shared-kernel.sweep');
  }
}
