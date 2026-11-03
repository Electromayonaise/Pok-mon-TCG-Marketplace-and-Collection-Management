// ATDD — Story 1.6: the scheduled job routes `/api/jobs/<job>` (ARCHITECTURE §4, §13; AD-SYS-4 rule 7;
// S-9; contracts.md §15 S-SYS.sweep). Flow A, ATDD-first (decision log Impl-2 #11): written before the
// route existed; every test fails on NotImplementedError until Story 1.6 is done. The app is composed as
// the route composes it (`compose().jobs`), on the test database and the virtual clock.
import { beforeAll, describe, expect, it } from 'vitest';
import { compose } from '../../../src/server/composition.js';
import { VirtualClock } from '../../../test-support/clock.js';
import { race } from '../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { FixtureFxRateSource } from '../../../test-support/simulated/index.js';
import { at, HOUR, id, ins, order, purchasableListing, rows, T0, user } from '../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();
const SECRET = 'jobs-test-secret-0123456789abcdef0123456789';
const JOBS = ['trm-fetch', 'expiry-materialize', 'commission-reconcile', 'outbox-sweep'] as const;
const clock = new VirtualClock();
let app: ReturnType<typeof compose>;

beforeAll(() => {
  const ok = async () => undefined;
  app = compose({
    pool: db.pool, clock, sessions: { userIdOf: async () => null }, handlers: { commission: ok, collections: ok },
    fx: new FixtureFxRateSource([{ valor: '4130.00', validFrom: '2026-10-01', validTo: '2026-10-01' }]), jobsSecret: SECRET,
  });
});

/** `POST /api/jobs/<job>?trigger=…` with the bearer, or without any `Authorization` header when `bearer` is null. */
async function call(job: string, o: { trigger?: string | null; authorization?: string | null } = {}) {
  const trigger = o.trigger === undefined ? 'tick' : o.trigger;
  const url = `http://localhost/api/jobs/${job}${trigger === null ? '' : `?trigger=${trigger}`}`;
  const authorization = o.authorization === undefined ? `Bearer ${SECRET}` : o.authorization;
  const res = await app.jobs(new Request(url, { method: 'POST', headers: authorization === null ? {} : { authorization } }));
  return { status: res.status, json: (await res.json()) as { outcome?: string; job?: string; trigger?: string; error?: { code: string; httpStatus: number } } };
}
const jobRuns = () => db.query<{ job: string; trigger: string; outcome: string; errorCode: string | null; startedAt: Date; finishedAt: Date | null }>(
  `SELECT job, trigger, outcome, "errorCode", "startedAt", "finishedAt" FROM "JobRun" ORDER BY "startedAt", id`,
);

/** One unpaid order of 1 unit, due an hour ago, whose reservation emptied the unit. */
async function dueOrder() {
  await user(db, { id: id('camila'), emailVerified: true });
  await purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity: 0 });
  await order(db, { id: id('o1'), buyerId: id('camila'), businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), createdAt: at(-49 * HOUR), expiresAt: at(-HOUR) });
}
const unitQuantity = async () => Number((await db.query<{ quantity: number }>(`SELECT quantity FROM "InventoryUnit" WHERE id = $1`, [id('uchar')]))[0]!.quantity);

describe('Story 1.6 — the job routes are behind JOBS_SECRET (S-9)', () => {
  it('[S-SYS.jobs.auth] a missing, wrong, truncated or non-bearer secret is 401 NotAuthenticated on every job, and no JobRun row is written', async () => {
    for (const job of JOBS) {
      for (const authorization of [null, 'Bearer wrong', `Bearer ${SECRET.slice(0, -1)}`, `Bearer ${SECRET}x`, `Basic ${SECRET}`, SECRET]) {
        const res = await call(job, { authorization });
        expect(res.status, `${job} with ${authorization}`).toBe(401);
        expect(res.json.error).toMatchObject({ code: 'NotAuthenticated', httpStatus: 401 });
      }
    }
    expect(await jobRuns()).toEqual([]);
  });

  it('[S-SYS.jobs.trigger] an unknown job is 404 and a missing or unknown trigger is 400 RequestValidationFailed, with no JobRun row', async () => {
    expect((await call('nightly-everything')).status).toBe(404);
    for (const trigger of [null, 'admin', 'hourly']) {
      const res = await call('trm-fetch', { trigger });
      expect(res.status).toBe(400);
      expect(res.json.error).toMatchObject({ code: 'RequestValidationFailed' });
    }
    expect(await jobRuns()).toEqual([]);
  });
});

describe('Story 1.6 — each run writes one JobRun row (ARCHITECTURE §4)', () => {
  it('[S-SYS.jobs.h] the tick runs trm-fetch: one succeeded JobRun with the tick trigger and the Clock\'s instants, and today\'s TRM is stored once', async () => {
    const res = await call('trm-fetch');
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ job: 'trm-fetch', trigger: 'tick', outcome: 'succeeded' });
    expect(await jobRuns()).toEqual([{ job: 'trm-fetch', trigger: 'tick', outcome: 'succeeded', errorCode: null, startedAt: new Date(T0), finishedAt: new Date(T0) }]);
    expect(await rows(db, 'FxRate')).toHaveLength(1);
    // A second run on a covered day, 1 ms later on the Clock, is a succeeded no-op: still one rate, now two runs.
    clock.advance(1);
    expect((await call('trm-fetch', { trigger: 'daily-morning' })).json).toMatchObject({ outcome: 'succeeded' });
    expect(await rows(db, 'FxRate')).toHaveLength(1);
    expect((await jobRuns()).map((r) => r.trigger)).toEqual(['tick', 'daily-morning']);
  });

  it('[S-SYS.jobs.failed] a job whose work throws is 500 Unexpected with no message in the body, and its JobRun row is failed with the error code', async () => {
    const broken = compose({ pool: db.pool, clock, sessions: { userIdOf: async () => null }, jobsSecret: SECRET }); // the UNWIRED_FX source
    const res = await broken.jobs(new Request('http://localhost/api/jobs/trm-fetch?trigger=tick', { method: 'POST', headers: { authorization: `Bearer ${SECRET}` } }));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text).error).toMatchObject({ code: 'Unexpected', httpStatus: 500 });
    expect(text).not.toMatch(/NotImplemented|fx\.getRateCovering|stack/);
    expect(await jobRuns()).toMatchObject([{ job: 'trm-fetch', outcome: 'failed', errorCode: 'NotImplemented' }]);
  });

  it('[S-SYS.sweep.h] the outbox sweep delivers a delivery stuck pending for over 60 s, and records the run', async () => {
    // A committed event whose (overridden, no-op) commission delivery was never dispatched.
    await ins(db, 'OutboxEvent', { id: id('ev1'), type: 'CommissionBalanceExhausted', aggregateId: id('tienda'), schemaVersion: 1, payload: JSON.stringify({ businessId: id('tienda'), ledgerSeq: 1, balanceAfter: 0 }) }, 'created');
    await ins(db, 'EventDelivery', { eventId: id('ev1'), subscriber: 'commission', status: 'pending', attempts: 0, createdAt: at(-120_000) }, 'both');
    const res = await call('outbox-sweep');
    expect(res.json).toMatchObject({ job: 'outbox-sweep', outcome: 'succeeded' });
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'delivered' }]);
    expect(await jobRuns()).toMatchObject([{ job: 'outbox-sweep', outcome: 'succeeded' }]);
  });
});

describe('Story 1.6 — single-flight under job:<name> (AD-SYS-4 rule 7)', () => {
  it('[S-SYS.jobs.single] while another run holds job:expiry-materialize the route is a skipped no-op; once it is released the run expires the due order', async () => {
    await dueOrder();
    const holder = await db.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT pg_advisory_xact_lock(hashtextextended('job:expiry-materialize', 0))`);
      expect((await call('expiry-materialize')).json).toMatchObject({ outcome: 'skipped' });
      expect(await unitQuantity()).toBe(0);
    } finally {
      await holder.query('ROLLBACK');
      holder.release();
    }
    // 1 ms later on the Clock, so the two rows order by their start, never by their random ids.
    clock.advance(1);
    expect((await call('expiry-materialize')).json).toMatchObject({ outcome: 'succeeded' });
    expect(await unitQuantity()).toBe(1);
    expect((await jobRuns()).map((r) => r.outcome)).toEqual(['skipped', 'succeeded']);
  });

  it('[S-SYS.jobs.C1] 20 concurrent expiry runs: each is succeeded or skipped, every one writes its JobRun row, and the due order releases its unit exactly once', async () => {
    await dueOrder();
    const { fulfilled, rejected } = await race(20, () => call('expiry-materialize'));
    // A rejected run fails the test with its own error, so the cause is never hidden behind a count.
    if (rejected.length > 0) throw rejected[0];
    expect(fulfilled.every((r) => r.status === 200 && ['succeeded', 'skipped'].includes(r.json.outcome!))).toBe(true);
    expect(fulfilled.some((r) => r.json.outcome === 'succeeded')).toBe(true);
    expect(await jobRuns()).toHaveLength(20);
    expect(await unitQuantity()).toBe(1);
    expect(await rows(db, 'Order', '"expiredAt" IS NOT NULL')).toHaveLength(1);
  });
});
