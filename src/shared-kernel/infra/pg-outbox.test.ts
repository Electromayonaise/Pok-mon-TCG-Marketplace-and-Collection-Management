// PgOutboxV2 against a real database (AD-SYS-2 rule 1): the event and its pending deliveries
// commit or roll back with the publisher's transaction.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../test-support/db.js';
import { SequentialIds } from '../../../test-support/ids.js';
import { id, rows, T0, wiring } from '../../../test-support/solu2/fixtures.js';
import { REDACTED } from '../regulated.js';
import { PgOutboxV2 } from './pg-outbox.js';

const db = useTestDatabase();
const payload = { businessId: id('tienda'), ledgerSeq: 7, balanceAfter: -1_200 };

describe('PgOutboxV2.enqueue', () => {
  it('writes the event and one pending delivery per subscriber, and returns the R-1 envelope', async () => {
    const w = wiring(db);
    const envelope = await w.transactions.run((tx) => new PgOutboxV2(w.ids, w.clock).enqueue(tx, 'OrderClosed', id('ord1'), {
      orderId: id('ord1'), buyerId: id('buyer'), businessId: id('tienda'), totalCop: 50_000, lines: [],
      sellerReceivedConfirmedAt: null, buyerItemReceivedConfirmedAt: T0,
    }));
    // The event id is the IdGenerator's next id (wiring's ids use the prefix 'n').
    expect(envelope).toMatchObject({ eventId: new SequentialIds('n').next(), type: 'OrderClosed', occurredAt: T0, schemaVersion: 1 });
    expect(await rows(db, 'OutboxEvent')).toMatchObject([{ id: envelope.eventId, type: 'OrderClosed', aggregateId: id('ord1'), createdAt: new Date(T0) }]);
    const deliveries = await rows<{ subscriber: string }>(db, 'EventDelivery');
    expect(deliveries.map((d) => d.subscriber).sort()).toEqual(['collections', 'commission']);
    expect(deliveries).toMatchObject([{ eventId: envelope.eventId, status: 'pending', attempts: 0 }, { status: 'pending', attempts: 0 }]);
  });

  it('a rolled-back publisher leaves neither the event nor its deliveries', async () => {
    const w = wiring(db);
    const outbox = new PgOutboxV2(w.ids, w.clock);
    const aborted = w.transactions.run(async (tx) => {
      await outbox.enqueue(tx, 'CommissionBalanceExhausted', id('tienda'), payload);
      throw new Error('publisher aborts');
    });
    await expect(aborted).rejects.toThrow('publisher aborts');
    expect(await rows(db, 'OutboxEvent')).toEqual([]);
    expect(await rows(db, 'EventDelivery')).toEqual([]);
  });

  it('an event with no subscribers is stored without deliveries', async () => {
    const w = wiring(db);
    await w.transactions.run((tx) => new PgOutboxV2(w.ids, w.clock).enqueue(tx, 'TradeAccepted', id('trade'), { tradeId: id('trade') } as never));
    expect(await rows(db, 'OutboxEvent')).toHaveLength(1);
    expect(await rows(db, 'EventDelivery')).toEqual([]);
  });

  it('stores the payload through the redactor (the outbox egress of AD-SYS-8)', async () => {
    const w = wiring(db);
    const envelope = await w.transactions.run((tx) => new PgOutboxV2(w.ids, w.clock).enqueue(tx, 'CommissionBalanceExhausted', id('tienda'), { ...payload, phone: '+573009912345' } as never));
    expect(await rows(db, 'OutboxEvent')).toMatchObject([{ payload: { ...payload, phone: REDACTED } }]);
    expect(envelope.payload).toEqual({ ...payload, phone: REDACTED });
  });
});
