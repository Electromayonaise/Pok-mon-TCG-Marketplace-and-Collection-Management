// CatServiceV2's feed, the edges the bound tests leave out. continueFeedRun (CAT-2.ingress, AD-CAT-1
// rules 2–4, 7): a lease lost between batches, the 50 s budget that hands the lease back, a
// source failure, an unknown or finished run, and the batch's quarantine and price rules
// (AD-CAT-2 rules 1–2). listFeedRuns (CAT-1.runs): paging and a foreign cursor.
// upsertCatalogEntry (CAT-2): the revision's before and after, and a KindChanged row that writes
// no revision. listQuarantinedRows (CAT-2.quarantine): the reason filter, paging, a cursor from
// another run and an unknown run.
// Split from cat.v2.test.ts by the Impl-2 test review (HIGH-5); the shared Given steps are in test-support/suites/cat.ts.
import { describe, expect, it } from 'vitest';
import type { CatalogFeedSource } from '../../../shared-kernel/external.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, httpOf } from '../../../../test-support/errors.js';
import { admin, at, feedRun, fxRate, HOUR, id, ins, rows } from '../../../../test-support/solu2/fixtures.js';
import type { ValidFeedRow } from '../dto/cat.v2.dto.js';
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import { CatServiceV2 } from './cat.v2.js';
import { useCatSuite } from '../../../../test-support/suites/cat.js';

const { db, setup, card, feedOf, given, continueRun } = useCatSuite();

describe('CatServiceV2.continueFeedRun — the lease (AD-CAT-1 rules 2–4)', () => {
  it('a batch whose renewal finds another token writes nothing and returns done: false', async () => {
    await given();
    const fixture = feedOf([card(1)]);
    const thief: CatalogFeedSource = {
      openRun: () => fixture.openRun(),
      readRows: async (cursor, limit) => {
        await db.query(`UPDATE "FeedIngestionRun" SET "leaseToken" = 'otro', "leaseUntil" = $1`, [at(HOUR)]);
        return fixture.readRows(cursor, limit);
      },
    };
    expect(await continueRun(setup(thief).cat)).toEqual({ done: false, status: 'Running', cursor: 0 });
    expect(await rows(db, 'CatalogEntry')).toHaveLength(0);
    expect(await rows(db, 'FeedIngestionRun')).toMatchObject([{ leaseToken: 'otro', cursor: 0 }]);
  });

  it('stops after 50 s at a batch boundary and hands the lease back', async () => {
    await given();
    const fixture = feedOf(Array.from({ length: 501 }, (_, k) => card(k + 1)));
    const { w, cat } = setup({ openRun: () => fixture.openRun(), readRows: async (c, l) => { w.clock.advance(50_000); return fixture.readRows(c, l); } });
    expect(await continueRun(cat)).toEqual({ done: false, status: 'Running', cursor: 500 });
    // The lease is handed back expired, not cleared, so the abandonment rule still sees the last activity.
    expect(await rows(db, 'FeedIngestionRun')).toMatchObject([{ status: 'Running', cursor: 500, created: 500, leaseUntil: new Date(Date.parse(w.clock.iso()) - 1) }]);
    expect(await continueRun(cat)).toEqual({ done: true, status: 'Completed', cursor: 501 });
    expect(await rows(db, 'audit_events', `action = 'catalog.feedBatch.applied'`)).toHaveLength(2);
  });

  it('a source that fails fails the run (rule 7)', async () => {
    await given();
    const feed = feedOf([card(1)]);
    feed.fault = 'down';
    const { w, cat } = setup(feed);
    expect(await continueRun(cat)).toEqual({ done: true, status: 'Failed', cursor: 0 });
    expect(await rows(db, 'FeedIngestionRun')).toMatchObject([{ status: 'Failed', endedAt: new Date(w.clock.iso()), leaseToken: null }]);
    expect(await rows(db, 'audit_events', `action = 'catalog.feedRun.failed'`)).toMatchObject([{ data: { cursor: 0, cause: 'FeedUnavailable' } }]);
  });

  it('a missing feed adapter propagates as NotImplemented and leaves the run Running', async () => {
    await given();
    const unwired: CatalogFeedSource = { openRun: async () => { throw new NotImplementedError('feed.openRun'); }, readRows: async () => ({ rows: [], done: true }) };
    expect(codeOf(await caught(() => continueRun(setup(unwired).cat)))).toBe('NotImplementedError');
    expect(await rows(db, 'FeedIngestionRun')).toMatchObject([{ status: 'Running' }]);
  });

  it('a source with no rows yet but not done hands the run back instead of spinning', async () => {
    await given();
    const fixture = feedOf([]);
    expect(await continueRun(setup({ openRun: () => fixture.openRun(), readRows: async () => ({ rows: [], done: false }) }).cat)).toEqual({ done: false, status: 'Running', cursor: 0 });
    expect(await rows(db, 'audit_events', `action = 'catalog.feedBatch.applied'`)).toHaveLength(0);
  });

  it('a run continued in slices for more than 24 h is not failed as abandoned by a start', async () => {
    await given();
    await db.query(`UPDATE "FeedIngestionRun" SET "startedAt" = $1`, [at(-25 * HOUR)]);
    const fixture = feedOf(Array.from({ length: 501 }, (_, k) => card(k + 1)));
    const { w, cat } = setup({ openRun: () => fixture.openRun(), readRows: async (c, l) => { w.clock.advance(50_000); return fixture.readRows(c, l); } });
    await continueRun(cat);
    expect(codeOf(await caught(() => cat.startFeedRun({ actorId: id('admin') })))).toBe('FeedRunInProgress');
  });

  it('a continue that loses its lease to a run failed meanwhile answers the run as it stands', async () => {
    await given();
    const fixture = feedOf([card(1)]);
    const failer: CatalogFeedSource = {
      openRun: () => fixture.openRun(),
      readRows: async (cursor, limit) => {
        await db.query(`UPDATE "FeedIngestionRun" SET status = 'Failed', "endedAt" = $1, "leaseUntil" = NULL, "leaseToken" = NULL`, [at(0)]);
        return fixture.readRows(cursor, limit);
      },
    };
    expect(await continueRun(setup(failer).cat)).toEqual({ done: true, status: 'Failed', cursor: 0 });
  });

  it('a finished run answers done; an unknown run is RequestValidationFailed on runId', async () => {
    await admin(db);
    await feedRun(db, id('run1'), { status: 'Completed' });
    expect(await continueRun(setup().cat)).toEqual({ done: true, status: 'Completed', cursor: 0 });
    const error = await caught(() => setup().cat.continueFeedRun({ actorId: id('admin'), runId: id('ghost') }));
    expect([codeOf(error), httpOf(error)]).toEqual(['RequestValidationFailed', 400]);
  });
});

describe('CatServiceV2.continueFeedRun — the batch (AD-CAT-1 rule 3, AD-CAT-2 rules 1–2)', () => {
  it('quarantines invalid rows, stores COP prices as delivered, converts USD once and defers USD without a TRM', async () => {
    await given();
    const feed = feedOf([
      card(1, { cop: 9_000 }),
      card(2, { usdCents: 1234, observedAt: at(-HOUR) }),
      card(3, { usdCents: 500, observedAt: '2026-09-01T12:00:00Z' }),
      card(4, { setCode: 'XX9' }),
      card(5, { number: 'twenty' }),
      card(1, { kind: 'sealedProduct', cop: 1 }),
    ]);
    await fxRate(db, { id: id('fx1'), copPerUsdCentavos: 401_237, validFrom: '2026-09-30' });
    expect(await continueRun(setup(feed).cat)).toEqual({ done: true, status: 'Completed', cursor: 6 });
    expect(await rows(db, 'FeedIngestionRun')).toMatchObject([{ created: 3, quarantined: 3, deferredNoFx: 1, cursor: 6 }]);
    expect(await rows(db, 'QuarantinedFeedRow', 'TRUE ORDER BY "rowNumber"')).toMatchObject([
      { rowNumber: 4, reasonCode: 'UnknownSet' }, { rowNumber: 5, reasonCode: 'BadNumberFormat' },
      // A KindChanged row keeps what the feed sent, price included.
      { rowNumber: 6, reasonCode: 'KindChanged', rawRow: { kind: 'sealedProduct', cop: 1 } },
    ]);
    const prices = await db.query<{ cop: string; copDerivation: string; fxRateDate: string | null; source: string }>(
      `SELECT cop::text, "copDerivation", "fxRateDate"::text, source FROM "ReferencePriceObservation" ORDER BY "copDerivation" DESC`);
    expect(prices).toEqual([
      { cop: '9000', copDerivation: 'sourceNative', fxRateDate: null, source: 'fixture-feed' },
      { cop: '49513', copDerivation: 'fxDerived', fxRateDate: '2026-09-30', source: 'fixture-feed' },
    ]);
  });
});

describe('CatServiceV2.listFeedRuns (CAT-1.runs)', () => {
  it('pages 25 newest first and refuses a foreign cursor', async () => {
    for (let k = 0; k < 26; k++) await feedRun(db, id(`r${k}`), { startedAt: at(-(k + 1) * HOUR) });
    const { cat } = setup();
    const first = await cat.listFeedRuns({ actorId: id('admin'), cursor: null });
    expect(first.runs).toHaveLength(25);
    expect(first.runs[0]?.runId).toBe(id('r0'));
    const second = await cat.listFeedRuns({ actorId: id('admin'), cursor: first.nextCursor });
    expect([second.runs.map((r) => r.runId), second.nextCursor]).toEqual([[id('r25')], null]);
    expect(codeOf(await caught(() => cat.listFeedRuns({ actorId: id('admin'), cursor: 'bogus' })))).toBe('RequestValidationFailed');
  });
});

describe('CatServiceV2.upsertCatalogEntry (CAT-2)', () => {
  const valid = (o: Partial<ValidFeedRow> = {}): ValidFeedRow => ({
    externalKey: 'sv1-025', setCode: 'SV1', number: '025', name: 'Pikachu', kind: 'card', eraCode: 'SV', pokemon: 'Pikachu', colour: null, style: null, artist: null, imageUrl: null, ...o,
  });

  it('a renamed and renumbered row keeps the id; the revision holds the before and after of the changed fields only', async () => {
    await given();
    const { cat } = setup();
    const first = await db.transactions.run((tx) => cat.upsertCatalogEntry(tx, { row: valid(), runId: id('run1'), rowNumber: 1 }));
    const second = await db.transactions.run((tx) => cat.upsertCatalogEntry(tx, { row: valid({ name: 'Pikachu ex', number: '025/165' }), runId: id('run1'), rowNumber: 1 }));
    expect(second).toEqual({ catalogEntryId: first.catalogEntryId, outcome: 'updated', changedFields: ['name', 'number'] });
    const [revision] = await rows<{ before: Record<string, unknown>; after: Record<string, unknown>; changedFields: string[] }>(db, 'CatalogEntryRevision');
    expect([revision?.before.name, revision?.after.name, revision?.after.numberSort, revision?.changedFields]).toEqual(['Pikachu', 'Pikachu ex', 25, ['name', 'number']]);
    expect(await rows(db, 'CatalogEntry')).toMatchObject([{ id: first.catalogEntryId, kind: 'card', externalKey: 'sv1-025', name: 'Pikachu ex' }]);
  });

  it('a kind change with new attributes writes neither the attributes nor a revision', async () => {
    await given();
    const { cat } = setup();
    await db.transactions.run((tx) => cat.upsertCatalogEntry(tx, { row: valid(), runId: id('run1'), rowNumber: 1 }));
    const result = await db.transactions.run((tx) => cat.upsertCatalogEntry(tx, { row: valid({ kind: 'sealedProduct', name: 'Caja' }), runId: id('run1'), rowNumber: 2 }));
    expect(result.outcome).toBe('quarantinedKindChanged');
    expect(await rows(db, 'CatalogEntry')).toMatchObject([{ name: 'Pikachu', kind: 'card' }]);
    expect(await rows(db, 'CatalogEntryRevision')).toHaveLength(0);
  });
});

describe('CatServiceV2.listQuarantinedRows (CAT-2.quarantine)', () => {
  async function quarantined(n: number): Promise<void> {
    await feedRun(db, id('r1'));
    await feedRun(db, id('r2'));
    for (let k = 1; k <= n; k++) {
      await ins(db, 'QuarantinedFeedRow', { id: id(`q${k}`), runId: id('r1'), rowNumber: k, externalKey: `k${k}`, reasonCode: k % 2 ? 'UnknownSet' : 'KindChanged', rawRow: '{}' }, 'created');
    }
  }
  const list = (cat: CatServiceV2, o: { runId?: string; reasonCode?: string; cursor?: string | null } = {}) =>
    cat.listQuarantinedRows({ actorId: id('admin'), runId: o.runId ?? id('r1'), cursor: o.cursor ?? null, ...(o.reasonCode ? { reasonCode: o.reasonCode } : {}) });

  it('pages 50 by rowNumber and filters by reason', async () => {
    await quarantined(51);
    const { cat } = setup();
    const first = await list(cat);
    expect([first.rows.length, first.rows[0]?.rowNumber]).toEqual([50, 1]);
    expect((await list(cat, { cursor: first.nextCursor })).rows).toEqual([{ rowNumber: 51, externalKey: 'k51', reasonCode: 'UnknownSet' }]);
    expect((await list(cat, { reasonCode: 'KindChanged' })).rows.map((r) => r.rowNumber).slice(0, 3)).toEqual([2, 4, 6]);
  });

  it("refuses another run's cursor and an unknown run", async () => {
    await quarantined(51);
    const { cat } = setup();
    const first = await list(cat);
    expect(codeOf(await caught(() => list(cat, { runId: id('r2'), cursor: first.nextCursor })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => list(cat, { reasonCode: 'KindChanged', cursor: first.nextCursor })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => list(cat, { runId: id('ghost') })))).toBe('RequestValidationFailed');
  });
});
