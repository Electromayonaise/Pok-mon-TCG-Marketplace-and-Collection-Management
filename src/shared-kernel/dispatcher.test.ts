// OutboxDispatcherV2 against a real database (AD-SYS-2 rules 4, 6 and 7; ARCH §7.3 as corrected by
// decision log Impl-1 #17): the cases the bound SYS-2 and S-SYS.replay proofs leave open.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../test-support/db.js';
import { at, DAY, id, ins, rows, T0, wiring } from '../../test-support/solu2/fixtures.js';
import { type DeliveryHandler, OutboxDispatcherV2, type ReplayOutcome } from './dispatcher.js';
import { DomainError } from './errors.js';
import type { TransactionRunner, Tx } from './ports.js';

const db = useTestDatabase();
const cite = [{ rule: 'AD-SYS-1', inputs: { probe: 1 } }] as [{ rule: string; inputs: { probe: number } }];
const leak = 'secret 10.0.0.7';

/** One OutboxEvent and its `listings` delivery in `status`. */
async function delivery(status: 'pending' | 'delivered' | 'failed', attempts = 1, createdAt = T0) {
  await ins(db, 'OutboxEvent', { id: id('ev1'), type: 'CommissionBalanceExhausted', aggregateId: id('tienda'), schemaVersion: 1, payload: JSON.stringify({ businessId: id('tienda'), ledgerSeq: 1, balanceAfter: 0 }) }, 'created');
  const failed = status === 'failed';
  await ins(db, 'EventDelivery', {
    eventId: id('ev1'), subscriber: 'listings', status, attempts,
    lastErrorCode: failed ? 'DeliveryAttemptsExhausted' : null, firstFailedAt: failed ? at(-DAY) : null, lastFailedAt: failed ? at(-DAY) : null,
    deliveredAt: status === 'delivered' ? at(-DAY) : null, createdAt,
  }, 'both');
}

/**
 * A dispatcher whose `listings` handler optionally throws (or is `listings`), plus a `record`
 * callback that logs each outcome. Call number `failRun` of the transaction runner fails before
 * its work runs, as a dropped connection would.
 */
function setup(o: { fail?: () => Error; listings?: DeliveryHandler; failRun?: number } = {}) {
  const w = wiring(db);
  const recorded: ReplayOutcome[] = [];
  const record = async (_tx: Tx, outcome: ReplayOutcome) => { recorded.push(outcome); };
  const ok = async () => undefined;
  const listings = o.listings ?? (async () => { if (o.fail) throw o.fail(); });
  let runs = 0;
  const transactions: TransactionRunner = {
    run: (work, options) => (++runs === o.failRun ? Promise.reject(new Error('connection terminated')) : w.transactions.run(work, options)),
  };
  return { w, recorded, record, d: new OutboxDispatcherV2({ transactions, clock: w.clock }, { commission: ok, listings, collections: ok }) };
}

describe('OutboxDispatcherV2 attempt procedure (rule 4)', () => {
  it('an error outside the handler leaves the delivery pending with its attempt counted, and is rethrown', async () => {
    await delivery('pending');
    let ran = 0;
    // Runs: 1 reads the pending keys, 2 counts the attempt (step 1), 3 claims and runs the handler (step 2).
    const { d } = setup({ listings: async () => { ran++; }, failRun: 3 });
    await expect(d.dispatch([id('ev1')])).rejects.toThrow('connection terminated');
    expect(ran).toBe(0);
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'pending', attempts: 2, lastErrorCode: null, firstFailedAt: null }]);
  });

  it('a handler that throws a plain Error stores Unexpected, never its message', async () => {
    await delivery('pending');
    const { d } = setup({ fail: () => new Error(leak) });
    expect(await d.dispatch([id('ev1')])).toEqual({ delivered: 0, failed: 1 });
    const stored = await rows(db, 'EventDelivery');
    expect(stored).toMatchObject([{ status: 'failed', lastErrorCode: 'Unexpected', firstFailedAt: new Date(T0) }]);
    expect(JSON.stringify(stored)).not.toContain('10.0.0.7');
  });

  it("a throwing handler's writes roll back with its transaction", async () => {
    await delivery('pending');
    const { d } = setup({
      listings: async (tx) => {
        await tx.query(`INSERT INTO "OutboxEvent" (id, type, "aggregateId", "schemaVersion", payload, "createdAt") VALUES ($1, 'CommissionBalanceExhausted', $2, 1, '{}', $3)`, [id('ev2'), id('tienda'), T0]);
        throw new DomainError('ListingNotFound', cite);
      },
    });
    expect(await d.dispatch([id('ev1')])).toEqual({ delivered: 0, failed: 1 });
    expect((await rows<{ id: string }>(db, 'OutboxEvent')).map((r) => r.id)).toEqual([id('ev1')]);
  });

  it('the sweeper leaves a pending delivery of exactly 60 s alone and attempts it 1 ms later', async () => {
    await delivery('pending', 0, at(-60_000));
    const { w, d } = setup();
    expect(await d.sweep()).toEqual({ attempted: 0, delivered: 0, failed: 0 });
    w.clock.advance(1);
    expect(await d.sweep()).toEqual({ attempted: 1, delivered: 1, failed: 0 });
  });

  it('a dispatch and a sweep racing on one delivery run its handler once', async () => {
    await delivery('pending', 0, at(-120_000));
    let ran = 0;
    const { d } = setup({ listings: async (tx) => { ran++; await tx.query('SELECT pg_sleep(0.05)'); } });
    const [dispatched, swept] = await Promise.all([d.dispatch([id('ev1')]), d.sweep()]);
    expect(ran).toBe(1);
    expect(dispatched.delivered + swept.delivered).toBe(1);
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'delivered' }]);
  });
});

describe('OutboxDispatcherV2.replay', () => {
  it('replays a delivery that failed at attempts = 3 to delivered without counting an attempt (decision #17)', async () => {
    await delivery('failed', 3);
    const { d, record, recorded } = setup();
    expect(await d.replay(id('ev1'), 'listings', record)).toEqual({ status: 'delivered', replayed: true });
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'delivered', attempts: 3, deliveredAt: new Date(T0), lastAttemptAt: new Date(T0), firstFailedAt: new Date(at(-DAY)) }]);
    expect(recorded).toEqual(['delivered']);
  });

  it('a throwing handler keeps the row failed with its code, leaves firstFailedAt and attempts alone, and records failed', async () => {
    await delivery('failed');
    const { d, record, recorded } = setup({ fail: () => new DomainError('ListingNotFound', cite) });
    expect(await d.replay(id('ev1'), 'listings', record)).toEqual({ status: 'failed', replayed: true, errorCode: 'ListingNotFound' });
    expect(await rows(db, 'EventDelivery')).toMatchObject([{
      status: 'failed', attempts: 1, lastErrorCode: 'ListingNotFound', firstFailedAt: new Date(at(-DAY)), lastFailedAt: new Date(T0), lastAttemptAt: new Date(T0),
    }]);
    expect(recorded).toEqual(['failed']);
  });

  it('a handler that throws a plain Error is stored as Unexpected, never its message', async () => {
    await delivery('failed');
    const { d, record } = setup({ fail: () => new Error(leak) });
    expect(await d.replay(id('ev1'), 'listings', record)).toEqual({ status: 'failed', replayed: true, errorCode: 'Unexpected' });
    const stored = await rows(db, 'EventDelivery');
    expect(stored).toMatchObject([{ status: 'failed', lastErrorCode: 'Unexpected' }]);
    expect(JSON.stringify(stored)).not.toContain('10.0.0.7');
  });

  it('sets lastAttemptAt to the claim time in both outcomes, however long the handler runs', async () => {
    await delivery('failed');
    const slow = setup({ listings: async () => { slow.w.clock.advance(5_000); } });
    await slow.d.replay(id('ev1'), 'listings', slow.record);
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'delivered', lastAttemptAt: new Date(T0), deliveredAt: new Date(at(5_000)) }]);
    await db.query(`UPDATE "EventDelivery" SET status = 'failed', "deliveredAt" = NULL`);
    const failing = setup({ listings: async () => { failing.w.clock.advance(5_000); throw new DomainError('ListingNotFound', cite); } });
    await failing.d.replay(id('ev1'), 'listings', failing.record);
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'failed', lastAttemptAt: new Date(T0), lastFailedAt: new Date(at(5_000)) }]);
  });

  it('a record that throws rolls the delivered outcome back with it (same transaction)', async () => {
    await delivery('failed');
    const { d } = setup();
    await expect(d.replay(id('ev1'), 'listings', async () => { throw new Error('log write failed'); })).rejects.toThrow('log write failed');
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'failed', deliveredAt: null }]);
  });

  it('a row held by a concurrent replay is a no-op that records noop', async () => {
    await delivery('failed');
    const { d, record, recorded } = setup();
    const holder = await db.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT 1 FROM "EventDelivery" WHERE "eventId" = $1 FOR UPDATE`, [id('ev1')]);
      expect(await d.replay(id('ev1'), 'listings', record)).toEqual({ status: 'failed', replayed: false });
    } finally {
      await holder.query('ROLLBACK');
      holder.release();
    }
    expect(recorded).toEqual(['noop']);
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'failed', lastFailedAt: new Date(at(-DAY)) }]);
  });

  it.each([['delivered'], ['pending'], ['none']] as const)('a %s delivery is EventDeliveryNotReplayable citing that status, and nothing is recorded', async (status) => {
    if (status !== 'none') await delivery(status);
    const { d, record, recorded } = setup();
    const error = await d.replay(id('ev1'), 'listings', record).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ code: 'EventDeliveryNotReplayable', citations: [{ rule: 'AD-SYS-2', inputs: { eventId: id('ev1'), subscriber: 'listings', status } }] });
    expect(recorded).toEqual([]);
  });
});
