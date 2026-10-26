// NFR benchmark — post-commit events are exactly-once in effect (NFR-SYS-6; AD-SYS-2 rules 4–6).
// 500 committed events whose dispatch never ran (a crash after every commit), plus 20 deliveries
// that crashed mid-attempt, are drained by the sweeper alone: every subscriber runs exactly once
// per delivery, nothing stays pending, and the sweeper needs no more batches than ⌈rows / 50⌉.
// RED until the dispatcher is implemented: the first sweep throws NotImplementedError.
import { describe, expect, it } from 'vitest';
import { OutboxDispatcherV2, type DeliveryHandler, type SubscriberName } from '../../../src/shared-kernel/dispatcher.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { id, rows, wiring } from '../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();

describe('NFR-SYS-6 — crash between commit and dispatch (AD-SYS-2)', () => {
  it('[NFR-SYS-6.sweep] 500 undispatched events and 20 half-attempted deliveries drain exactly once', async () => {
    const w = wiring(db);
    // Given: 250 OrderClosed (commission + collections) and 250 CommissionBalanceExhausted (listings) committed, never dispatched.
    for (let k = 0; k < 500; k++) {
      await w.transactions.run(async (tx): Promise<unknown> => k % 2
        ? w.outbox.enqueue(tx, 'CommissionBalanceExhausted', id(`biz${k}`), { businessId: id(`biz${k}`), ledgerSeq: k, balanceAfter: -k })
        : w.outbox.enqueue(tx, 'OrderClosed', id(`ord${k}`), { orderId: id(`ord${k}`), buyerId: id('buyer'), businessId: id('biz'), totalCop: 45_000, lines: [{ itemRef: id('char'), title: 'Charizard ex', qty: 1, unitPriceCop: 45_000 }], sellerReceivedConfirmedAt: null, buyerItemReceivedConfirmedAt: w.clock.iso() }));
    }
    // And: 20 deliveries whose attempt was counted but whose instance died before recording an outcome.
    await db.query(`UPDATE "EventDelivery" SET attempts = 1, "lastAttemptAt" = "createdAt" WHERE ctid IN (SELECT ctid FROM "EventDelivery" ORDER BY "eventId", subscriber LIMIT 20)`);
    const total = (await rows(db, 'EventDelivery')).length;
    w.clock.advance(61_000);

    const runs = new Map<string, number>();
    const handler = (s: SubscriberName): DeliveryHandler => async (_tx, e) => { const key = `${e.eventId}/${s}`; runs.set(key, (runs.get(key) ?? 0) + 1); };
    const d = new OutboxDispatcherV2({ transactions: w.transactions, clock: w.clock }, { commission: handler('commission'), listings: handler('listings'), collections: handler('collections') });
    let sweeps = 0;
    for (;;) {
      const r = await d.sweep();
      sweeps++;
      if (r.attempted === 0) break;
      if (sweeps > 100) break;
    }

    expect(await rows(db, 'EventDelivery', `status <> 'delivered'`)).toEqual([]);
    expect(runs.size).toBe(total);
    expect([...runs.values()].filter((n) => n !== 1)).toEqual([]);
    expect(sweeps).toBeLessThanOrEqual(Math.ceil(total / 50) + 1);
  }, 300_000);
});
