// The shared Given steps of the SYS ATDD files (`atdd/sys_contracts.test.ts`, `atdd/sys_admin.test.ts`), moved verbatim
// out of one 303-line file by the Impl-2 test review re-run (decision log Impl-2 #38). Call it once at the top of a test file.
import { AdminEventsServiceV2 } from '../../src/shared-kernel/admin-events.js';
import { OutboxDispatcherV2, type DeliveryHandler, type SubscriberName } from '../../src/shared-kernel/dispatcher.js';
import type { EventEnvelope } from '../../src/shared-kernel/events.js';
import { useTestDatabase } from '../db.js';
import { id, ins, T0, wiring } from '../solu2/fixtures.js';

export function useSysSuite() {
  const db = useTestDatabase();

  /** A dispatcher whose handlers record each envelope they run, and optionally throw. */
  function dispatcher(w: ReturnType<typeof wiring>, fail: Partial<Record<SubscriberName, () => Error>> = {}) {
    const ran: { subscriber: SubscriberName; envelope: EventEnvelope }[] = [];
    const handler = (subscriber: SubscriberName): DeliveryHandler => async (_tx, envelope) => {
      ran.push({ subscriber, envelope });
      const f = fail[subscriber];
      if (f) throw f();
    };
    return { ran, d: new OutboxDispatcherV2({ transactions: w.transactions, clock: w.clock }, { commission: handler('commission'), listings: handler('listings'), collections: handler('collections') }) };
  }
  /** Commits one CommissionBalanceExhausted event (one `listings` delivery) at the virtual clock's now. */
  async function publish(w: ReturnType<typeof wiring>): Promise<string> {
    const envelope = await w.transactions.run((tx) => w.outbox.enqueue(tx, 'CommissionBalanceExhausted', id('tienda'), { businessId: id('tienda'), ledgerSeq: 7, balanceAfter: -1_200 }));
    return envelope.eventId;
  }
  /** An OutboxEvent plus one delivery in a given state, for the admin panel reads. */
  async function delivery(eventId: string, o: { status: 'pending' | 'delivered' | 'failed'; attempts?: number; createdAt?: string; firstFailedAt?: string }) {
    await ins(db, 'OutboxEvent', { id: eventId, type: 'CommissionBalanceExhausted', aggregateId: id('tienda'), schemaVersion: 1, payload: JSON.stringify({ businessId: id('tienda'), ledgerSeq: 1, balanceAfter: 0 }), createdAt: o.createdAt ?? T0 }, 'none');
    const failed = o.status === 'failed';
    await ins(db, 'EventDelivery', {
      eventId, subscriber: 'listings', status: o.status, attempts: o.attempts ?? (failed ? 1 : 0),
      lastErrorCode: failed ? 'Unexpected' : null, firstFailedAt: failed ? (o.firstFailedAt ?? T0) : null, lastFailedAt: failed ? (o.firstFailedAt ?? T0) : null,
      deliveredAt: o.status === 'delivered' ? T0 : null, createdAt: o.createdAt ?? T0, updatedAt: o.createdAt ?? T0,
    });
  }
  function events(w: ReturnType<typeof wiring>) {
    return new AdminEventsServiceV2({ ...w, dispatcher: dispatcher(w).d });
  }

  return { db, dispatcher, publish, delivery, events };
}
