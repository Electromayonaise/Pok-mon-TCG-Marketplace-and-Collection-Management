// AdminEventsServiceV2.replayEventDelivery (S-SYS.replay; decision log Impl-1 #15, #16): the
// explained decision of each outcome and the one EventReplayLog row written with it.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../test-support/db.js';
import { admin, at, DAY, explainAssert, id, ins, rows, T0, wiring } from '../../test-support/solu2/fixtures.js';
import { AdminEventsServiceV2 } from './admin-events.js';
import { OutboxDispatcherV2 } from './dispatcher.js';
import { DomainError } from './errors.js';

const db = useTestDatabase();
const input = { adminId: id('admin'), eventId: id('ev1'), subscriber: 'listings' } as const;
const inputs = { eventId: id('ev1'), subscriber: 'listings' };

async function failedDelivery() {
  await admin(db);
  await ins(db, 'OutboxEvent', { id: id('ev1'), type: 'CommissionBalanceExhausted', aggregateId: id('tienda'), schemaVersion: 1, payload: JSON.stringify({ businessId: id('tienda'), ledgerSeq: 1, balanceAfter: 0 }) }, 'created');
  await ins(db, 'EventDelivery', { eventId: id('ev1'), subscriber: 'listings', status: 'failed', attempts: 3, lastErrorCode: 'DeliveryAttemptsExhausted', firstFailedAt: at(-DAY), lastFailedAt: at(-DAY) });
}

function service(fail?: () => Error) {
  const w = wiring(db);
  const ok = async () => undefined;
  const listings = async () => { if (fail) throw fail(); };
  return new AdminEventsServiceV2({ ...w, dispatcher: new OutboxDispatcherV2({ transactions: w.transactions, clock: w.clock }, { commission: ok, listings, collections: ok }) });
}

describe('AdminEventsServiceV2.replayEventDelivery', () => {
  it('a delivered replay is allowed, cites AD-SYS-2 with the new status, and logs one delivered row with the admin', async () => {
    await failedDelivery();
    const result = await service().replayEventDelivery(input);
    expect(result).toMatchObject({ status: 'delivered', replayed: true });
    explainAssert(result.decision, { code: 'EventDeliveryReplayed', outcome: 'allowed', rule: 'AD-SYS-2', inputs: { ...inputs, status: 'delivered' }, occurredAt: T0 });
    expect(await rows(db, 'EventReplayLog')).toMatchObject([{ adminId: id('admin'), eventId: id('ev1'), subscriber: 'listings', outcome: 'delivered', createdAt: new Date(T0) }]);
  });

  it('a replay whose handler throws is rejected with the handler code and logs one failed row', async () => {
    await failedDelivery();
    const cite = [{ rule: 'AD-INV-3', inputs: { listingId: id('lst') } }] as [{ rule: string; inputs: { listingId: string } }];
    const result = await service(() => new DomainError('ListingNotFound', cite)).replayEventDelivery(input);
    expect(result).toMatchObject({ status: 'failed', replayed: true });
    explainAssert(result.decision, { code: 'ListingNotFound', outcome: 'rejected', rule: 'AD-SYS-2', inputs: { ...inputs, status: 'failed' }, occurredAt: T0 });
    expect(await rows(db, 'EventReplayLog')).toMatchObject([{ outcome: 'failed' }]);
  });

  it('a replay of a row another replay holds is an allowed no-op and logs one noop row', async () => {
    await failedDelivery();
    const holder = await db.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT 1 FROM "EventDelivery" WHERE "eventId" = $1 FOR UPDATE`, [id('ev1')]);
      const result = await service().replayEventDelivery(input);
      expect(result).toMatchObject({ status: 'failed', replayed: false });
      explainAssert(result.decision, { code: 'EventDeliveryReplayInProgress', outcome: 'allowed', rule: 'AD-SYS-2', inputs: { ...inputs, status: 'failed' } });
    } finally {
      await holder.query('ROLLBACK');
      holder.release();
    }
    expect(await rows(db, 'EventReplayLog')).toMatchObject([{ outcome: 'noop' }]);
  });
});
