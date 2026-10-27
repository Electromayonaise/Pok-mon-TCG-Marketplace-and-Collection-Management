// CatServiceV2, the edges the bound tests leave out. continueFeedRun (CAT-2.ingress, AD-CAT-1
// rules 2–4, 7): a lease lost between batches, the 50 s budget that hands the lease back, a
// source failure, an unknown or finished run, and the batch's quarantine and price rules
// (AD-CAT-2 rules 1–2). listFeedRuns (CAT-1.runs): paging and a foreign cursor.
// upsertCatalogEntry (CAT-2): the revision's before and after, and a KindChanged row that writes
// no revision. listQuarantinedRows (CAT-2.quarantine): the reason filter, paging, a cursor from
// another run and an unknown run. getPriceProvenance (CAT-3): input order, no observation, a zero
// baseline, duplicate ids. fetchTrm and getFxRate (S-FR-CAT-8, AD-CAT-3): a stored row, an
// identical and a mismatched re-fetch, a throwing source, and a date with no rate at all.
// browseCatalog and the §15.11 ports: nameQuery's prefix and escaping, the facets, paging, the
// bounds, getEntry's 404, input order, asOf staleness and the history's from ≤ to.
import { describe, expect, it } from 'vitest';
import type { CatalogFeedSource, FeedSourceRow } from '../../../shared-kernel/external.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, httpOf } from '../../../../test-support/errors.js';
import { FixtureFeedSource, FixtureFxRateSource } from '../../../../test-support/simulated/index.js';
import { admin, at, catalogEntry, DAY, explainAssert, feedRun, HOUR, id, ins, observation, rows, wiring } from '../../../../test-support/solu2/fixtures.js';
import type { ValidFeedRow } from '../dto/cat.v2.dto.js';
import { CatServiceV2 } from './cat.v2.js';

const db = useTestDatabase();

function setup(feed: CatalogFeedSource = new FixtureFeedSource({ current: [], previous: [], defects: [], renamed: [] }), fx = new FixtureFxRateSource([])) {
  const w = wiring(db);
  return { w, fx, cat: new CatServiceV2({ ...w, feed, fx }) };
}
const card = (n: number, o: FeedSourceRow = {}): FeedSourceRow => ({ externalKey: `sv1-${n}`, setCode: 'SV1', number: String(n), name: `Carta ${n}`, kind: 'card', eraCode: 'SV', ...o });
const feedOf = (current: FeedSourceRow[]) => new FixtureFeedSource({ current, previous: [], defects: [], renamed: [] });
async function given(): Promise<void> {
  await admin(db);
  await ins(db, 'CatalogSet', { id: id('setsv1'), code: 'SV1', name: 'Escarlata y Púrpura', era: 'SV' });
  await feedRun(db, id('run1'), { status: 'Running', startedAt: at(-HOUR) });
}
const continueRun = (cat: CatServiceV2) => cat.continueFeedRun({ actorId: id('admin'), runId: id('run1') });

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
    expect(await rows(db, 'FeedIngestionRun')).toMatchObject([{ status: 'Running', cursor: 500, created: 500, leaseToken: null, leaseUntil: null }]);
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
    expect(await rows(db, 'audit_events', `action = 'catalog.feedRun.failed'`)).toHaveLength(1);
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
    ]);
    await ins(db, 'FxRate', { id: id('fx1'), copPerUsdCentavos: 401_237, validFrom: '2026-09-30', validTo: '2026-09-30', source: 'fixture', fetchedAt: at(-DAY) }, 'created');
    expect(await continueRun(setup(feed).cat)).toEqual({ done: true, status: 'Completed', cursor: 5 });
    expect(await rows(db, 'FeedIngestionRun')).toMatchObject([{ created: 3, quarantined: 2, deferredNoFx: 1, cursor: 5 }]);
    expect(await rows(db, 'QuarantinedFeedRow', 'TRUE ORDER BY "rowNumber"')).toMatchObject([{ rowNumber: 4, reasonCode: 'UnknownSet' }, { rowNumber: 5, reasonCode: 'BadNumberFormat' }]);
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
    expect(codeOf(await caught(() => list(cat, { runId: id('ghost') })))).toBe('RequestValidationFailed');
  });
});

describe('CatServiceV2.getPriceProvenance (CAT-3)', () => {
  it('answers in input order: no observation reads null, and a zero baseline gives no trend', async () => {
    await catalogEntry(db, id('none'));
    await catalogEntry(db, id('zero'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o1'), catalogEntryId: id('zero'), cop: 0, observedAt: at(-40 * DAY), runId: id('run1') });
    await observation(db, { id: id('o2'), catalogEntryId: id('zero'), cop: 5_000, observedAt: at(-HOUR), runId: id('run1') });
    const { items } = await setup().cat.getPriceProvenance({ catalogEntryIds: [id('zero'), id('none')], period: 30 });
    expect(items.map((i) => i.catalogEntryId)).toEqual([id('zero'), id('none')]);
    expect(items[0]).toMatchObject({ freshness: 'fresh', trend: { referencePriceAtStart: { cop: 0 }, changePercentHundredths: null } });
    explainAssert(items[0]!.trend.decision, { code: 'TrendNoBaseline', rule: 'FR-CAT-6' });
    expect(items[1]).toMatchObject({ lastTransactionReference: null, freshness: null, trend: { changePercentHundredths: null } });
    explainAssert(items[1]!.decision, { code: 'ReferencePriceMissing', outcome: 'allowed', rule: 'FR-CAT-5' });
  });

  it('refuses duplicate ids, and cites every unknown id', async () => {
    await catalogEntry(db, id('pika'));
    const { cat } = setup();
    expect(codeOf(await caught(() => cat.getPriceProvenance({ catalogEntryIds: [id('pika'), id('pika')], period: 30 })))).toBe('RequestValidationFailed');
    const error = await caught(() => cat.getPriceProvenance({ catalogEntryIds: [id('pika'), id('g1'), id('g2')], period: 7 }));
    explainAssert(error, { code: 'CatalogEntryNotFound', rule: 'FR-CAT-5', inputs: { missingIds: `${id('g1')},${id('g2')}`, missingCount: 2 } });
  });
});

describe('CatServiceV2.fetchTrm and getFxRate (S-FR-CAT-8, AD-CAT-3)', () => {
  const RATE = { valor: '4130.005', validFrom: '2026-10-01', validTo: '2026-10-01' };
  const yesterday = () => ins(db, 'FxRate', { id: id('fx0'), copPerUsdCentavos: 412_337, validFrom: '2026-09-30', validTo: '2026-09-30', source: 'fixture', fetchedAt: at(-DAY) }, 'created');

  it("stores the source's row as delivered, rounded half-up to centavos, with one audit row", async () => {
    const { cat } = setup(undefined, new FixtureFxRateSource([RATE]));
    expect((await cat.fetchTrm({ trigger: 'daily-morning' })).outcome).toBe('stored');
    expect(await db.query(`SELECT "copPerUsdCentavos"::text AS c, "validFrom"::text AS f FROM "FxRate"`)).toEqual([{ c: '413001', f: '2026-10-01' }]);
    expect(await rows(db, 'audit_events', `action = 'catalog.fxRate.stored'`)).toHaveLength(1);
    expect(await cat.getFxRate({ date: '2026-10-01' })).toMatchObject({ copPerUsdCentavos: 413_001, stale: false, decision: { reasonCode: 'FxRateCovered' } });
  });

  it('a weekend range that overlaps a stored day with another value keeps the stored row and is logged', async () => {
    await ins(db, 'FxRate', { id: id('fx1'), copPerUsdCentavos: 412_900, validFrom: '2026-09-29', validTo: '2026-09-30', source: 'fixture', fetchedAt: at(-DAY) }, 'created');
    const { cat } = setup(undefined, new FixtureFxRateSource([{ ...RATE, validFrom: '2026-09-29' }]));
    const result = await cat.fetchTrm({ trigger: 'tick' });
    expect(result.outcome).toBe('mismatchKept');
    explainAssert(result.decision, { code: 'FxRateSourceMismatch', rule: 'AD-CAT-3 rule 4', inputs: { storedCopPerUsdCentavos: 412_900, storedValidFrom: '2026-09-29' } });
    expect(await rows(db, 'FxRate')).toHaveLength(1);
    expect(await rows(db, 'audit_events', `action = 'catalog.fxRate.sourceMismatch'`)).toHaveLength(1);
  });

  it('a re-fetch that races a stored identical row is alreadyCovered and writes nothing', async () => {
    const fx = new FixtureFxRateSource([RATE]);
    const racing = { getRateCovering: async (date: string) => {
      const r = await fx.getRateCovering(date);
      await ins(db, 'FxRate', { id: id('fxr'), copPerUsdCentavos: 413_001, validFrom: '2026-10-01', validTo: '2026-10-01', source: 'fixture', fetchedAt: at(0) }, 'created');
      return r;
    } };
    const w = wiring(db);
    const result = await new CatServiceV2({ ...w, feed: new FixtureFeedSource({ current: [], previous: [], defects: [], renamed: [] }), fx: racing }).fetchTrm({ trigger: 'admin' });
    expect(result.outcome).toBe('alreadyCovered');
    expect(await rows(db, 'FxRate')).toHaveLength(1);
    expect(await rows(db, 'audit_events')).toHaveLength(0);
  });

  it('a source that throws is sourceUnavailable, and a date with no rate at all is Unexpected', async () => {
    const { cat } = setup(undefined, { getRateCovering: async () => { throw new Error('timeout'); } } as unknown as FixtureFxRateSource);
    expect((await cat.fetchTrm({ trigger: 'tick' })).outcome).toBe('sourceUnavailable');
    expect(await rows(db, 'FxRate')).toHaveLength(0);
    expect(codeOf(await caught(() => cat.getFxRate({ date: '2026-10-01' })))).toBe('Unexpected');
    await yesterday();
    expect(await cat.getFxRate({ date: '2026-10-03' })).toMatchObject({ validFrom: '2026-09-30', stale: true });
  });
});

describe('CatServiceV2.browseCatalog (S-FR-CAT-1)', () => {
  async function catalog(): Promise<void> {
    await ins(db, 'CatalogSet', { id: id('seta'), code: 'A', name: 'A', era: 'SV' });
    await ins(db, 'CatalogSet', { id: id('setb'), code: 'B', name: 'B', era: 'SV' });
    const entry = (key: string, setId: string, name: string, n: number, kind = 'card') =>
      ins(db, 'CatalogEntry', { id: id(key), externalKey: key, setId, kind, name, number: String(n), numberSort: n });
    await entry('e1', id('seta'), 'Pikachu', 2);
    await entry('e2', id('seta'), 'Pikachú ex', 1);
    await entry('e3', id('setb'), 'Pika_100%', 1);
    await entry('e4', id('setb'), 'Caja Pikachu', 2, 'sealedProduct');
  }

  it('nameQuery is an accent-blind prefix whose % and _ are literal; facets count the matched set', async () => {
    await catalog();
    const { cat } = setup();
    const pika = await cat.browseCatalog({ filters: { nameQuery: 'PIKACHU' }, page: 1, pageSize: 24 });
    expect(pika.entries.map((e) => e.catalogEntryId)).toEqual([id('e2'), id('e1')]);
    expect(pika.facets).toEqual([{ name: 'setId', values: [{ value: id('seta'), count: 2 }] }, { name: 'kind', values: [{ value: 'card', count: 2 }] }]);
    expect((await cat.browseCatalog({ filters: { nameQuery: 'pika_' }, page: 1, pageSize: 24 })).entries.map((e) => e.catalogEntryId)).toEqual([id('e3')]);
    expect((await cat.browseCatalog({ filters: { nameQuery: '%' }, page: 1, pageSize: 24 })).total).toBe(0);
  });

  it('pages in (setId, numberSort, id) order with the total of every page, and refuses page 0 and pageSize 101', async () => {
    await catalog();
    const { cat } = setup();
    const second = await cat.browseCatalog({ filters: {}, page: 2, pageSize: 3 });
    expect([second.entries.map((e) => e.catalogEntryId), second.total]).toEqual([[id('e4')], 4]);
    expect(Object.keys(second.entries[0]!)).not.toContain('numberSort');
    expect(codeOf(await caught(() => cat.browseCatalog({ filters: {}, page: 0, pageSize: 3 })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => cat.browseCatalog({ filters: {}, page: 1, pageSize: 101 })))).toBe('RequestValidationFailed');
  });
});

describe('CatServiceV2 offered ports (contracts.md §15.11)', () => {
  it('getEntry raises CatalogEntryNotFound (404); the batch ports keep input order and refuse 0 or 501 ids', async () => {
    await catalogEntry(db, id('b'));
    await catalogEntry(db, id('a'));
    const { cat } = setup();
    const error = await caught(() => cat.getEntry({ catalogEntryId: id('ghost') }));
    expect([codeOf(error), httpOf(error)]).toEqual(['CatalogEntryNotFound', 404]);
    expect((await cat.getEntries({ catalogEntryIds: [id('b'), id('a'), id('b')] })).entries.map((e) => e.catalogEntryId)).toEqual([id('b'), id('a')]);
    expect(codeOf(await caught(() => cat.getEntries({ catalogEntryIds: [] })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => cat.resolveItemRefs({ refs: Array.from({ length: 501 }, (_, k) => id(`r${k}`)) })))).toBe('RequestValidationFailed');
  });

  it('asOf ages a price relative to asOf, and a missing price is null and not stale', async () => {
    await catalogEntry(db, id('char'));
    await catalogEntry(db, id('none'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o1'), catalogEntryId: id('char'), cop: 40_000, observedAt: at(-3 * DAY), runId: id('run1') });
    const { prices } = await setup().cat.getReferencePricesAsOf({ catalogEntryIds: [id('none'), id('char')], asOf: at(-2 * DAY) });
    expect(prices).toEqual([{ catalogEntryId: id('none'), price: null, stale: false }, expect.objectContaining({ catalogEntryId: id('char'), stale: false })]);
    expect((await setup().cat.getReferencePricesAsOf({ catalogEntryIds: [id('char')], asOf: at(0) })).prices[0]?.stale).toBe(true);
  });

  it('the history refuses from after to, and an entry with no observation has an empty series', async () => {
    await catalogEntry(db, id('none'));
    const { cat } = setup();
    expect(codeOf(await caught(() => cat.getPriceHistory({ catalogEntryIds: [id('none')], from: at(0), to: at(-DAY) })))).toBe('RequestValidationFailed');
    expect(await cat.getPriceHistory({ catalogEntryIds: [id('none')], from: at(-DAY), to: at(0) })).toEqual({ series: [{ catalogEntryId: id('none'), observations: [] }] });
  });
});
