// AdminEventsServiceV2 (S-SYS; decision log Impl-1 #15, #16): the explained decision of each
// replay outcome and its EventReplayLog row, and the edges of the Story 1.5 reads: the tick
// silence window, the 3 h boundary, the deliveries cursor and its refusal, the latest digest.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../test-support/db.js';
import { admin, at, DAY, explainAssert, HOUR, id, ins, rows, T0, wiring } from '../../test-support/solu2/fixtures.js';
import { AdminEventsServiceV2, decodeDeliveryCursor, encodeDeliveryCursor, isTickSilent } from './admin-events.js';
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

describe('isTickSilent (ARCH §4)', () => {
  // Bogotá is UTC−5 with no DST: hh:mm Bogotá on 2026-10-01 is (hh + 5):mm UTC.
  const bogota = (hh: number, mm: number) => new Date(Date.UTC(2026, 9, 1, hh + 5, mm));

  it('with no tick at all, it is silent only inside 10:17–23:17 Bogotá, both ends included', () => {
    const read = (hh: number, mm: number) => isTickSilent(bogota(hh, mm), null);
    expect([read(10, 16), read(10, 17), read(23, 17), read(23, 18), read(3, 0)]).toEqual([false, true, true, false, false]);
  });

  it('a tick exactly 3 h before the read no longer counts; one a minute later does', () => {
    const now = bogota(14, 0);
    expect(isTickSilent(now, new Date(now.getTime() - 3 * HOUR).toISOString())).toBe(true);
    expect(isTickSilent(now, new Date(now.getTime() - 3 * HOUR + 60_000).toISOString())).toBe(false);
  });
});

describe('AdminEventsServiceV2.listDeliveries: the cursor', () => {
  const key = { kind: 'failed', at: T0, eventId: id('ev1'), subscriber: 'listings' } as const;

  it('round-trips the sort key it encodes', () => {
    expect(decodeDeliveryCursor(encodeDeliveryCursor(key), 'failed')).toEqual(key);
  });

  it('a malformed cursor, or one the other list issued, is RequestValidationFailed citing the cursor', () => {
    const wrongTime = Buffer.from(JSON.stringify(['failed', 'nope', id('ev1'), 'listings'])).toString('base64url');
    for (const cursor of ['x', wrongTime, encodeDeliveryCursor({ ...key, kind: 'stuck' })]) {
      expect(() => decodeDeliveryCursor(cursor, 'failed')).toThrow(expect.objectContaining({
        code: 'RequestValidationFailed', citations: [expect.objectContaining({ inputs: expect.objectContaining({ field: 'cursor' }) })],
      }));
    }
  });

  it('the next page continues after the last row, across a tie on firstFailedAt, and ends with a null cursor', async () => {
    await admin(db);
    for (let i = 0; i < 27; i++) {
      const ev = id(`ev${String(i).padStart(2, '0')}`);
      await ins(db, 'OutboxEvent', { id: ev, type: 'CommissionBalanceExhausted', aggregateId: id('tienda'), schemaVersion: 1, payload: JSON.stringify({ businessId: id('tienda'), ledgerSeq: 1, balanceAfter: 0 }) }, 'created');
      // Two rows share each firstFailedAt, so the page edge (row 25) falls inside a tie.
      await ins(db, 'EventDelivery', { eventId: ev, subscriber: 'listings', status: 'failed', attempts: 3, lastErrorCode: 'DeliveryAttemptsExhausted', firstFailedAt: at(-DAY + Math.floor(i / 2) * HOUR), lastFailedAt: at(-DAY) });
    }
    const svc = service();
    const first = await svc.listDeliveries({ adminId: id('admin'), kind: 'failed', cursor: null });
    const second = await svc.listDeliveries({ adminId: id('admin'), kind: 'failed', cursor: first.nextCursor });
    expect([first.rows.length, typeof first.nextCursor, second.rows.length, second.nextCursor]).toEqual([25, 'string', 2, null]);
    expect(new Set([...first.rows, ...second.rows].map((r) => r.eventId)).size).toBe(27);
  });
});

describe('AdminEventsServiceV2.getDeliveryHealth', () => {
  it('returns the latest FailedDeliveryDigest row next to the live counts', async () => {
    await ins(db, 'FailedDeliveryDigest', { date: '2026-09-29', count: 4, oldestFirstFailedAt: at(-3 * DAY), stuckPendingCount: 0, createdAt: at(-2 * DAY) }, 'created');
    await ins(db, 'FailedDeliveryDigest', { date: '2026-09-30', count: 2, oldestFirstFailedAt: at(-2 * DAY), stuckPendingCount: 1, createdAt: at(-DAY) }, 'created');
    expect(await service().getDeliveryHealth({ adminId: id('admin') })).toEqual({
      failedCount: 0, oldestFirstFailedAt: null, stuckPendingCount: 0, latestDigest: { date: '2026-09-30', count: 2, stuckPendingCount: 1 },
    });
  });
});
