// ATDD — CAT (contracts.md §3, §15, §15.11–12). Red phase: every test must fail with NotImplementedError.
import { describe, expect, it } from 'vitest';
import { CatServiceV2 } from '../../../src/modules/catalog/index.js';
import type { ValidFeedRow } from '../../../src/modules/catalog/index.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../test-support/errors.js';
import { codeOf, race } from '../../../test-support/concurrency.js';
import { FixtureFeedSource, FixtureFxRateSource, type FeedFiles } from '../../../test-support/simulated/index.js';
import { admin, at, catalogEntry, collection, DAY, entry, explainAssert, feedRun, HOUR, id, ins, listing, observation, rows, unit, user, wiring } from '../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();
const NO_FILES: FeedFiles = { current: [], previous: [], defects: [], renamed: [] };
const RATES = [{ valor: '4123.37', validFrom: '2026-09-30', validTo: '2026-09-30' }, { valor: '4130.00', validFrom: '2026-10-01', validTo: '2026-10-01' }];

function setup(files: FeedFiles = NO_FILES) {
  const w = wiring(db);
  const feed = new FixtureFeedSource(files);
  const fx = new FixtureFxRateSource(RATES);
  return { w, feed, fx, cat: new CatServiceV2({ ...w, feed, fx }) };
}
const row = (o: Partial<ValidFeedRow> = {}): ValidFeedRow => ({
  externalKey: 'sv1-025', setCode: 'SV1', number: '025', name: 'Pikachu', kind: 'card', eraCode: 'SV',
  pokemon: 'Pikachu', colour: 'Lightning', style: null, artist: 'Atsuko Nishida', imageUrl: null, ...o,
});
async function setSv1(): Promise<void> {
  await ins(db, 'CatalogSet', { id: id('setsv1'), code: 'SV1', name: 'Escarlata y Púrpura', era: 'SV' });
}

describe('CAT-1 — startFeedRun (contracts.md §3)', () => {
  it('[CAT-1.Q1] an admin starts a run: one Running row at now, and one audit row', async () => {
    await admin(db);
    const { w, cat } = setup();
    const result = await cat.startFeedRun({ actorId: id('admin') });
    expect(result.startedAt).toBe(w.clock.iso());
    expect(await rows(db, 'FeedIngestionRun', `status = 'Running'`)).toMatchObject([{ id: result.runId, cursor: 0 }]);
    expect(await rows(db, 'audit_events', `action = 'catalog.feedRun.started'`)).toHaveLength(1);
  });

  it('[CAT-1.QF1] while a run is live, a start is FeedRunInProgress (409) citing that run', async () => {
    await admin(db);
    await feedRun(db, id('run1'), { status: 'Running', startedAt: at(-HOUR) });
    const error = await caught(() => setup().cat.startFeedRun({ actorId: id('admin') }));
    expect(codeOf(error)).toBe('FeedRunInProgress');
    expect(httpOf(error)).toBe(409);
    expect(citedInputs(error)).toMatchObject({ runId: id('run1') });
    expect(await rows(db, 'FeedIngestionRun')).toHaveLength(1);
  });

  it('[CAT-1.Q2] a run abandoned for more than 24 h is failed, and the new run starts', async () => {
    await admin(db);
    await feedRun(db, id('stale'), { status: 'Running', startedAt: at(-25 * HOUR) });
    const result = await setup().cat.startFeedRun({ actorId: id('admin') });
    expect(await rows(db, 'FeedIngestionRun', 'id = $1', [id('stale')])).toMatchObject([{ status: 'Failed' }]);
    expect(await rows(db, 'FeedIngestionRun', `status = 'Running'`)).toMatchObject([{ id: result.runId }]);
  });

  it('[CAT-1.I1] 50 concurrent starts leave exactly one Running run (AD-CAT-1 rule 1)', async () => {
    await admin(db);
    const outcome = await race(50, () => setup().cat.startFeedRun({ actorId: id('admin') }));
    expect(outcome.rejected.map(codeOf).filter((c) => c !== 'FeedRunInProgress')).toEqual([]);
    expect(outcome.fulfilled).toHaveLength(1);
    expect(await rows(db, 'FeedIngestionRun', `status = 'Running'`)).toHaveLength(1);
  });
});

describe('CAT-2 — upsertCatalogEntry (contracts.md §3)', () => {
  it('[CAT-2.Q1] a new externalKey creates one entry', async () => {
    await setSv1();
    await feedRun(db, id('run1'), { status: 'Running', leaseUntil: at(HOUR) });
    const result = await db.transactions.run((tx) => setup().cat.upsertCatalogEntry(tx, { row: row(), runId: id('run1'), rowNumber: 1 }));
    expect(result.outcome).toBe('created');
    expect(await rows(db, 'CatalogEntry', `"externalKey" = 'sv1-025'`)).toMatchObject([{ id: result.catalogEntryId, name: 'Pikachu' }]);
  });

  it('[CAT-2.Q2] a renamed row updates the existing entry in place and writes one revision', async () => {
    await setSv1();
    await feedRun(db, id('run1'), { status: 'Running', leaseUntil: at(HOUR) });
    await ins(db, 'CatalogEntry', { id: id('pika'), externalKey: 'sv1-025', setId: id('setsv1'), kind: 'card', name: 'Pikachu', number: '025', numberSort: 25 });
    const result = await db.transactions.run((tx) => setup().cat.upsertCatalogEntry(tx, { row: row({ name: 'Pikachu ex' }), runId: id('run1'), rowNumber: 1 }));
    expect(result).toMatchObject({ catalogEntryId: id('pika'), outcome: 'updated' });
    expect(result.changedFields).toContain('name');
    expect(await rows(db, 'CatalogEntryRevision')).toMatchObject([{ catalogEntryId: id('pika'), runId: id('run1') }]);
  });

  it('[CAT-2.QF1] a row whose kind differs is quarantined as KindChanged and the entry is untouched', async () => {
    await setSv1();
    await feedRun(db, id('run1'), { status: 'Running', leaseUntil: at(HOUR) });
    await ins(db, 'CatalogEntry', { id: id('pika'), externalKey: 'sv1-025', setId: id('setsv1'), kind: 'card', name: 'Pikachu', number: '025', numberSort: 25 });
    const result = await db.transactions.run((tx) => setup().cat.upsertCatalogEntry(tx, { row: row({ kind: 'sealedProduct' }), runId: id('run1'), rowNumber: 7 }));
    expect(result).toEqual({ catalogEntryId: id('pika'), outcome: 'quarantinedKindChanged', changedFields: ['kind'] });
    expect(await rows(db, 'QuarantinedFeedRow')).toMatchObject([{ runId: id('run1'), rowNumber: 7, reasonCode: 'KindChanged' }]);
    expect(await rows(db, 'CatalogEntry', 'id = $1', [id('pika')])).toMatchObject([{ kind: 'card' }]);
  });

  it('[CAT-2.I1] rerunning the same rows converges: every row unchanged and no revision (AD-CAT-1 rule 6)', async () => {
    await setSv1();
    await feedRun(db, id('run1'), { status: 'Running', leaseUntil: at(HOUR) });
    const { cat } = setup();
    const first = await db.transactions.run((tx) => cat.upsertCatalogEntry(tx, { row: row(), runId: id('run1'), rowNumber: 1 }));
    const second = await db.transactions.run((tx) => cat.upsertCatalogEntry(tx, { row: row(), runId: id('run1'), rowNumber: 1 }));
    expect(second).toEqual({ catalogEntryId: first.catalogEntryId, outcome: 'unchanged', changedFields: [] });
    expect(await rows(db, 'CatalogEntryRevision')).toHaveLength(0);
  });

  it('[CAT-2.I3] [CAT-2.MEC] a reprinted card keeps its id; its 3 listings and 2 binder entries are byte-identical afterwards (AD-7)', async () => {
    await setSv1();
    await feedRun(db, id('run1'), { status: 'Running', leaseUntil: at(HOUR) });
    await ins(db, 'CatalogEntry', { id: id('pika'), externalKey: 'sv1-025', setId: id('setsv1'), kind: 'card', name: 'Pikachu', number: '025', numberSort: 25 });
    await user(db, { id: id('valentina'), sellerTrack: 'individual' });
    await unit(db, { id: id('u1'), sellerId: id('valentina'), catalogEntryId: id('pika'), quantity: 3 });
    for (const l of ['l1', 'l2', 'l3']) await listing(db, { id: id(l), sellerId: id('valentina'), unitId: id('u1'), sellerKind: 'individual' });
    await collection(db, { id: id('coll1'), ownerId: id('valentina') });
    for (const e of ['e1', 'e2']) await entry(db, { id: id(e), collectionId: id('coll1'), catalogEntryId: id('pika') });
    const before = JSON.stringify([await rows(db, 'Listing'), await rows(db, 'CollectionEntry')]);
    const result = await db.transactions.run((tx) => setup().cat.upsertCatalogEntry(tx, { row: row({ name: 'Pikachu (reimpresión)', artist: 'Kagemaru Himeno' }), runId: id('run1'), rowNumber: 1 }));
    expect(result.catalogEntryId).toBe(id('pika'));
    expect(JSON.stringify([await rows(db, 'Listing'), await rows(db, 'CollectionEntry')])).toBe(before);
  });

  it('[CAT-2.ingress.h] continuing a run processes the fixture file and completes it', async () => {
    await admin(db);
    await setSv1();
    await feedRun(db, id('run1'), { status: 'Running', startedAt: at(-HOUR) });
    const { cat } = setup({ ...NO_FILES, current: [{ ...row(), setCode: 'SV1' }] });
    const result = await cat.continueFeedRun({ actorId: id('admin'), runId: id('run1') });
    expect(result).toMatchObject({ done: true, status: 'Completed', cursor: 1 });
    expect(await rows(db, 'CatalogEntry')).toHaveLength(1);
  });

  it('[CAT-2.ingress.f] a live lease held by another caller is FeedRunInProgress', async () => {
    await admin(db);
    await feedRun(db, id('run1'), { status: 'Running', startedAt: at(-HOUR), leaseUntil: at(60_000) });
    const error = await caught(() => setup().cat.continueFeedRun({ actorId: id('admin'), runId: id('run1') }));
    expect(codeOf(error)).toBe('FeedRunInProgress');
  });
});

describe('CAT-3 — getPriceProvenance (contracts.md §3)', () => {
  async function priced(): Promise<void> {
    await catalogEntry(db, id('char'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o1'), catalogEntryId: id('char'), cop: 40_000, observedAt: at(-31 * DAY), runId: id('run1') });
    await observation(db, { id: id('o2'), catalogEntryId: id('char'), cop: 45_000, observedAt: at(-HOUR), runId: id('run1') });
  }

  it('[CAT-3.Q1] the latest observation and the 30-day baseline give +12.50 % (ADD-§2.2)', async () => {
    await priced();
    const { items } = await setup().cat.getPriceProvenance({ catalogEntryIds: [id('char')], period: 30 });
    expect(items[0]).toMatchObject({ catalogEntryId: id('char'), freshness: 'fresh', lastTransactionReference: { cop: 45_000, observedAt: at(-HOUR) }, trend: { period: 30, changePercentHundredths: 1250, referencePriceAtStart: { cop: 40_000 } } });
  });

  it('[CAT-3.Q4] an observation older than 36 h is stale, explained with ReferencePriceStale; exactly 36 h is fresh', async () => {
    await catalogEntry(db, id('old'));
    await catalogEntry(db, id('edge'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o1'), catalogEntryId: id('old'), cop: 10_000, observedAt: at(-36 * HOUR - 1000), runId: id('run1') });
    await observation(db, { id: id('o2'), catalogEntryId: id('edge'), cop: 10_000, observedAt: at(-36 * HOUR), runId: id('run1') });
    const { items } = await setup().cat.getPriceProvenance({ catalogEntryIds: [id('old'), id('edge')], period: 30 });
    expect(items.map((i) => i.freshness)).toEqual(['stale', 'fresh']);
    explainAssert(items[0]!.decision, { code: 'ReferencePriceStale', outcome: 'stale', rule: 'FR-CAT-7', inputs: { thresholdHours: 36 } });
  });

  it('[CAT-3.Q5] without a baseline the trend is null with TrendNoBaseline', async () => {
    await catalogEntry(db, id('new'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o1'), catalogEntryId: id('new'), cop: 9_000, observedAt: at(-HOUR), runId: id('run1') });
    const { items } = await setup().cat.getPriceProvenance({ catalogEntryIds: [id('new')], period: 7 });
    expect(items[0]?.trend.changePercentHundredths).toBeNull();
    explainAssert(items[0]!.trend.decision, { code: 'TrendNoBaseline', rule: 'FR-CAT-6' });
  });

  it('[CAT-3.P2] an unknown id is CatalogEntryNotFound (404)', async () => {
    const error = await caught(() => setup().cat.getPriceProvenance({ catalogEntryIds: [id('ghost')], period: 30 }));
    expect(codeOf(error)).toBe('CatalogEntryNotFound');
    expect(httpOf(error)).toBe(404);
  });

  it('[CAT-3.I1] two sources at one instant: the value is one stored row, chosen by source order, never an average (AD-CAT-2 rule 5)', async () => {
    await catalogEntry(db, id('char'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o1'), catalogEntryId: id('char'), cop: 45_000, observedAt: at(-HOUR), runId: id('run1'), source: 'b-source' });
    await observation(db, { id: id('o2'), catalogEntryId: id('char'), cop: 47_000, observedAt: at(-HOUR), runId: id('run1'), source: 'a-source' });
    const { items } = await setup().cat.getPriceProvenance({ catalogEntryIds: [id('char')], period: 30 });
    expect(items[0]?.lastTransactionReference).toMatchObject({ cop: 47_000, source: 'a-source' });
  });
});

describe('Supporting CAT contracts (contracts.md §15)', () => {
  it('[S-FR-CAT-1.h] filtering by pokemon returns only matches, in (setId, numberSort, id) order', async () => {
    await setSv1();
    await ins(db, 'CatalogEntry', { id: id('p2'), externalKey: 'k2', setId: id('setsv1'), kind: 'card', name: 'Pikachu', number: '090', numberSort: 90, pokemon: 'Pikachu' });
    await ins(db, 'CatalogEntry', { id: id('p1'), externalKey: 'k1', setId: id('setsv1'), kind: 'card', name: 'Pikachu', number: '025', numberSort: 25, pokemon: 'Pikachu' });
    await ins(db, 'CatalogEntry', { id: id('c1'), externalKey: 'k3', setId: id('setsv1'), kind: 'card', name: 'Charmander', number: '004', numberSort: 4, pokemon: 'Charmander' });
    const result = await setup().cat.browseCatalog({ filters: { pokemon: 'Pikachu' }, page: 1, pageSize: 24 });
    expect(result.entries.map((e) => e.catalogEntryId)).toEqual([id('p1'), id('p2')]);
    expect(result.total).toBe(2);
  });

  it('[S-FR-CAT-1.f] a filter on an unknown set is an empty page with total 0, not an error (pageSize > 100 belongs to the parser, AD-SYS-1 rule 7)', async () => {
    await catalogEntry(db, id('pika'));
    const result = await setup().cat.browseCatalog({ filters: { setIds: [id('noset')] }, page: 1, pageSize: 24 });
    expect(result).toMatchObject({ entries: [], total: 0 });
  });

  it('[S-FR-CAT-8.h] a fetch on a day already covered writes nothing and makes no source call', async () => {
    await ins(db, 'FxRate', { id: id('fx1'), copPerUsdCentavos: 413_000, validFrom: '2026-10-01', validTo: '2026-10-01', source: 'fixture', fetchedAt: at(-HOUR) }, 'created');
    const { cat, fx } = setup();
    const result = await cat.fetchTrm({ trigger: 'daily-morning' });
    expect(result.outcome).toBe('alreadyCovered');
    expect(fx.calls).toBe(0);
    expect(await rows(db, 'FxRate')).toHaveLength(1);
  });

  it("[S-FR-CAT-8.f] with the source down no row is written, and today's rate is yesterday's, stale, FxRateCarriedForward", async () => {
    await ins(db, 'FxRate', { id: id('fx0'), copPerUsdCentavos: 412_337, validFrom: '2026-09-30', validTo: '2026-09-30', source: 'fixture', fetchedAt: at(-DAY) }, 'created');
    const { cat, fx } = setup();
    fx.fault = 'down';
    expect((await cat.fetchTrm({ trigger: 'tick' })).outcome).toBe('sourceUnavailable');
    expect(await rows(db, 'FxRate')).toHaveLength(1);
    const rate = await cat.getFxRate({ date: '2026-10-01' });
    expect(rate).toMatchObject({ copPerUsdCentavos: 412_337, validFrom: '2026-09-30', stale: true });
    explainAssert(rate.decision, { code: 'FxRateCarriedForward', rule: 'FR-CAT-8' });
  });

  it('[CAT-1.runs.h] runs are listed newest first with their counters', async () => {
    await admin(db);
    await feedRun(db, id('r1'), { startedAt: at(-3 * DAY) });
    await feedRun(db, id('r2'), { startedAt: at(-DAY) });
    const result = await setup().cat.listFeedRuns({ actorId: id('admin'), cursor: null });
    expect(result.runs.map((r) => r.runId)).toEqual([id('r2'), id('r1')]);
  });

  it('[CAT-2.quarantine.h] a KindChanged row is listed for its run, without the raw row', async () => {
    await admin(db);
    await feedRun(db, id('r1'));
    await ins(db, 'QuarantinedFeedRow', { id: id('q1'), runId: id('r1'), rowNumber: 7, externalKey: 'sv1-025', reasonCode: 'KindChanged', rawRow: JSON.stringify({ secret: 'raw' }) }, 'created');
    const result = await setup().cat.listQuarantinedRows({ actorId: id('admin'), runId: id('r1'), cursor: null });
    expect(result.rows).toEqual([{ rowNumber: 7, externalKey: 'sv1-025', reasonCode: 'KindChanged' }]);
  });
});

describe('Offered ports — catalog (contracts.md §15.11)', () => {
  it('[P-CAT.entry.h] getEntry returns the entry by its stable id', async () => {
    await catalogEntry(db, id('pika'), { name: 'Pikachu' });
    expect(await setup().cat.getEntry({ catalogEntryId: id('pika') })).toMatchObject({ catalogEntryId: id('pika'), name: 'Pikachu' });
  });

  it('[P-CAT.entries.h] an unknown id is listed in missing, never thrown', async () => {
    await catalogEntry(db, id('pika'));
    const result = await setup().cat.getEntries({ catalogEntryIds: [id('pika'), id('ghost')] });
    expect(result.entries.map((e) => e.catalogEntryId)).toEqual([id('pika')]);
    expect(result.missing).toEqual([id('ghost')]);
  });

  it('[P-CAT.match.h] a filter matching 20,001 entries answers tooBroad', async () => {
    await setSv1();
    await db.query(`INSERT INTO "CatalogEntry" (id, "externalKey", "setId", kind, name, number, "numberSort", pokemon, "createdAt", "updatedAt")
      SELECT 'm' || lpad(to_hex(n), 23, '0'), 'mk' || n, $1, 'card', 'Pikachu', n::text, n, 'Pikachu', $2, $2 FROM generate_series(1, 20001) n`, [id('setsv1'), at(0)]);
    expect(await setup().cat.matchEntryIds({ filters: { pokemon: 'Pikachu' } })).toEqual({ ids: [], tooBroad: true });
  });

  it('[P-CAT.refs.h] kinds are returned per ref, and unknown refs are missing', async () => {
    await catalogEntry(db, id('pika'));
    await catalogEntry(db, id('etb'), { kind: 'sealedProduct' });
    const result = await setup().cat.resolveItemRefs({ refs: [id('pika'), id('etb'), id('ghost')] });
    expect(result.resolved).toEqual([{ ref: id('pika'), kind: 'card' }, { ref: id('etb'), kind: 'sealedProduct' }]);
    expect(result.missing).toEqual([id('ghost')]);
  });

  it('[P-CAT.asOf.h] an observation after asOf is never returned', async () => {
    await catalogEntry(db, id('char'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o1'), catalogEntryId: id('char'), cop: 40_000, observedAt: at(-DAY), runId: id('run1') });
    await observation(db, { id: id('o2'), catalogEntryId: id('char'), cop: 99_000, observedAt: at(HOUR), runId: id('run1') });
    const result = await setup().cat.getReferencePricesAsOf({ catalogEntryIds: [id('char')], asOf: at(0) });
    expect(result.prices[0]?.price).toMatchObject({ cop: 40_000 });
  });

  it('[P-CAT.history.h] the history carries in the last observation before from', async () => {
    await catalogEntry(db, id('char'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o0'), catalogEntryId: id('char'), cop: 38_000, observedAt: at(-10 * DAY), runId: id('run1') });
    await observation(db, { id: id('o1'), catalogEntryId: id('char'), cop: 40_000, observedAt: at(-2 * DAY), runId: id('run1') });
    const result = await setup().cat.getPriceHistory({ catalogEntryIds: [id('char')], from: at(-5 * DAY), to: at(0) });
    expect(result.series[0]?.observations.map((o) => o.cop)).toEqual([38_000, 40_000]);
  });

  it('[P-CAT.sets.h] cardEntryCount counts cards only, never sealed products', async () => {
    await catalogEntry(db, id('pika'), { setId: id('setx') });
    await catalogEntry(db, id('etb'), { setId: id('setx'), kind: 'sealedProduct', number: '999' });
    const result = await setup().cat.getSetSummaries({ setIds: [id('setx')] });
    expect(result.sets).toMatchObject([{ setId: id('setx'), cardEntryCount: 1 }]);
  });
});
