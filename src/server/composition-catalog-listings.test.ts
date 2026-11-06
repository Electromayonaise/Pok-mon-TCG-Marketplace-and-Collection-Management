// The production composition over HTTP (decision log Impl-1 #24): catalog, inventory and discovery.
// Covers CAT-1, CAT-2.ingress, CAT-1.runs, CAT-2.quarantine, CAT-3, S-FR-CAT-8.fetch, S-FR-CAT-8.breaker, S-FR-CAT-1, INV-2, S-FR-INV-2, -9, -10, DSC-1 and DSC-2, all through serveTrpc as app/api/trpc/[trpc]/route.ts calls it.
// One of the composition-*.test.ts files split from composition.test.ts (test review HIGH-1); the harness,
// test-support/http-app.ts, composes a fresh app per test at T0 (HIGH-8).
import { describe, expect, it } from 'vitest';
import { useComposedApp } from '../../test-support/http-app.js';
import { admin, at, business, catalogEntry, catalogSet, DAY, feedRun, HOUR, id, individualSeller, ins, observation, rows, user } from '../../test-support/solu2/fixtures.js';

const { db, signIn, post, get } = useComposedApp();

/** One inventory.create input: 3 NM copies of the card `char` at 45,000 COP, at the seller's meeting point (location null). */
const listingInput = { itemRef: id('char'), condition: 'NM', priceCop: 45_000, quantity: 3, location: null, description: '', openToTrade: false };

describe('the catalog feed over HTTP (CAT-1, CAT-2.ingress, CAT-1.runs; Story 4.1)', () => {
  it('a signed-in non-admin is AdminOnly 403 on start, continue and runs, and no run exists', async () => {
    await user(db, { id: id('camila') });
    const cookie = await signIn(id('camila'));
    expect((await post('catalog.feed.start', {}, cookie)).status).toBe(403);
    expect((await post('catalog.feed.continue', { runId: id('run1') }, cookie)).status).toBe(403);
    expect((await get('catalog.feed.runs', { cursor: null }, cookie)).status).toBe(403);
    expect(await rows(db, 'FeedIngestionRun')).toHaveLength(0);
  });

  it('an admin starts a run, continues it to the end and lists it, and the audit row names the session admin', async () => {
    await admin(db);
    await catalogSet(db, { id: id('setsv1'), code: 'SV1', name: 'Escarlata y Púrpura' });
    const cookie = await signIn(id('admin'));
    const started = await post('catalog.feed.start', {}, cookie);
    expect([started.status, started.json.result?.data]).toEqual([200, expect.objectContaining({ decision: expect.objectContaining({ reasonCode: 'FeedRunStarted' }) })]);
    const runId = started.json.result?.data.runId;
    const continued = await post('catalog.feed.continue', { runId }, cookie);
    expect([continued.status, continued.json.result?.data]).toEqual([200, { done: true, status: 'Completed', cursor: 1 }]);
    const listed = await get('catalog.feed.runs', { cursor: null }, cookie);
    expect(listed.json.result?.data).toMatchObject({ runs: [{ runId, status: 'Completed', created: 1 }], nextCursor: null });
    expect(await rows(db, 'audit_events', `action = 'catalog.feedRun.started'`)).toMatchObject([{ actorId: id('admin') }]);
  });

  it('an admin lists a run\'s quarantined rows without the raw row (CAT-2.quarantine, Story 4.2); a non-admin is AdminOnly 403', async () => {
    await admin(db);
    await user(db, { id: id('camila') });
    await feedRun(db, id('run1'));
    await ins(db, 'QuarantinedFeedRow', { id: id('q1'), runId: id('run1'), rowNumber: 7, externalKey: 'sv1-025', reasonCode: 'KindChanged', rawRow: '{"secret":"raw"}' }, 'created');
    const listed = await get('catalog.feed.quarantine', { runId: id('run1'), cursor: null }, await signIn(id('admin')));
    expect([listed.status, listed.json.result?.data]).toEqual([200, { rows: [{ rowNumber: 7, externalKey: 'sv1-025', reasonCode: 'KindChanged' }], nextCursor: null }]);
    expect((await get('catalog.feed.quarantine', { runId: id('run1'), cursor: null }, await signIn(id('camila')))).status).toBe(403);
  });

  it('a second start while a run is live is FeedRunInProgress 409', async () => {
    await admin(db);
    await feedRun(db, id('run1'), { status: 'Running', startedAt: at(-DAY / 2) });
    const { status, json } = await post('catalog.feed.start', {}, await signIn(id('admin')));
    expect([status, json.error?.code]).toEqual([409, 'FeedRunInProgress']);
  });
});

describe('the reference prices over HTTP (CAT-3, S-FR-CAT-8.fetch; Story 4.4)', () => {
  it('anyone reads the provenance without a session; an unknown id is CatalogEntryNotFound 404', async () => {
    await catalogEntry(db, id('char'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o1'), catalogEntryId: id('char'), cop: 45_000, observedAt: at(-HOUR), runId: id('run1') });
    const read = await get('catalog.provenance', { catalogEntryIds: [id('char')], period: 30 }, '');
    expect([read.status, read.json.result?.data]).toEqual([200, { items: [expect.objectContaining({ freshness: 'fresh', lastTransactionReference: expect.objectContaining({ cop: 45_000 }) })] }]);
    const missing = await get('catalog.provenance', { catalogEntryIds: [id('ghost')], period: 30 }, '');
    expect([missing.status, missing.json.error?.code]).toEqual([404, 'CatalogEntryNotFound']);
  });

  it('an admin retries the TRM fetch and today\'s rate is stored once; a non-admin is AdminOnly 403', async () => {
    await admin(db);
    await user(db, { id: id('camila') });
    expect((await post('catalog.fx.retry', {}, await signIn(id('camila')))).status).toBe(403);
    const cookie = await signIn(id('admin'));
    expect((await post('catalog.fx.retry', {}, cookie)).json.result?.data).toMatchObject({ outcome: 'stored' });
    expect((await post('catalog.fx.retry', {}, cookie)).json.result?.data).toMatchObject({ outcome: 'alreadyCovered' });
    expect(await rows(db, 'FxRate')).toHaveLength(1);
  });

  it('an admin reads the TRM source breaker on page 2.3 (S-FR-CAT-8.breaker; Story 4.6), and an open one answers the retry circuitOpen; a non-admin is AdminOnly 403', async () => {
    await admin(db);
    await user(db, { id: id('camila') });
    expect((await get('catalog.fx.breaker', {}, await signIn(id('camila')))).status).toBe(403);
    const cookie = await signIn(id('admin'));
    expect((await get('catalog.fx.breaker', {}, cookie)).json.result?.data).toMatchObject({ state: 'closed', consecutiveFailures: 0, failureThreshold: 3, decision: { reasonCode: 'FxSourceHealthy' } });
    await ins(db, 'FxSourceBreaker', { port: 'FxRateSource', state: 'open', consecutiveFailures: 3, openedAt: at(-10 * 60_000), retryAt: at(20 * 60_000), probeToken: null });
    expect((await get('catalog.fx.breaker', {}, cookie)).json.result?.data).toMatchObject({ state: 'open', retryAt: at(20 * 60_000), decision: { reasonCode: 'FxRateCircuitOpen' } });
    expect((await post('catalog.fx.retry', {}, cookie)).json.result?.data).toMatchObject({ outcome: 'circuitOpen', decision: { reasonCode: 'FxRateCircuitOpen' } });
    expect(await rows(db, 'FxRate')).toHaveLength(0);
  });
});

describe('catalog.browse over HTTP (S-FR-CAT-1; Story 4.5)', () => {
  it('anyone browses without a session; pageSize 101 is RequestValidationFailed 400 from the parser', async () => {
    await catalogEntry(db, id('pika'), { name: 'Pikachu' });
    const read = await get('catalog.browse', { filters: { nameQuery: 'pika' }, page: 1, pageSize: 24 }, '');
    expect([read.status, read.json.result?.data]).toEqual([200, expect.objectContaining({ total: 1, entries: [expect.objectContaining({ catalogEntryId: id('pika') })] })]);
    const refused = await get('catalog.browse', { filters: {}, page: 1, pageSize: 101 }, '');
    expect([refused.status, refused.json.error?.code]).toEqual([400, 'RequestValidationFailed']);
  });
});

describe('inventory.create over HTTP (INV-2; Story 5.1)', () => {
  it('without a session it is NotAuthenticated 401 and nothing is written', async () => {
    const { status, json } = await post('inventory.create', listingInput);
    expect([status, json.error?.code]).toEqual([401, 'NotAuthenticated']);
    expect(await db.counts(['Listing', 'InventoryUnit'])).toEqual({ Listing: 0, InventoryUnit: 0 });
  });

  it('an individual seller lists through the real identity and catalog: 200 Active, and the listing is the session user\'s', async () => {
    await individualSeller(db, id('valentina'));
    await catalogEntry(db, id('char'));
    const { status, json } = await post('inventory.create', listingInput, await signIn(id('valentina')));
    expect([status, json.result?.data]).toEqual([200, expect.objectContaining({ state: 'Active', availability: 3 })]);
    // A null location defaults to the meeting point (decision log Impl-1 #31).
    expect(await rows(db, 'Listing')).toMatchObject([{ sellerId: id('valentina'), sellerKindAtCreation: 'individual', lat: 4.711, lng: -74.0721 }]);
  });

  it('an Approved business with no projection lists Paused; open to trade it is OpenToTradeNotAllowed 409', async () => {
    await business(db, id('andres'), 'Approved');
    await catalogEntry(db, id('char'));
    const cookie = await signIn(id('andres'));
    expect((await post('inventory.create', listingInput, cookie)).json.result?.data).toMatchObject({ state: 'Paused' });
    const refused = await post('inventory.create', { ...listingInput, openToTrade: true }, cookie);
    expect([refused.status, refused.json.error?.code]).toEqual([409, 'OpenToTradeNotAllowed']);
  });
});

describe('the seller\'s inventory procedures over HTTP (S-FR-INV-2, -9, -10; Story 5.6)', () => {
  it('a seller bundles, restocks, edits, deactivates and lists; a buyer reads only the visible listing', async () => {
    await individualSeller(db, id('valentina'));
    await catalogEntry(db, id('char'));
    await catalogEntry(db, id('pika'));
    const cookie = await signIn(id('valentina'));
    const listingId = (await post('inventory.create', { ...listingInput, openToTrade: true }, cookie)).json.result?.data.listingId as string;
    const bundle = await post('inventory.createBundle', { title: 'Lote', priceCop: 80_000, location: null, description: '',
      components: [{ itemRef: id('char'), condition: 'NM', perBundleQty: 1, quantity: 9 }, { itemRef: id('pika'), condition: 'LP', perBundleQty: 2, quantity: 4 }] }, cookie);
    expect(bundle.json.result?.data).toMatchObject({ state: 'Active', availability: 2 });
    expect((await post('inventory.restock', { listingId, delta: 2 }, cookie)).json.result?.data).toMatchObject({ availability: 5 });
    expect((await post('inventory.update', { listingId, expectedVersion: 0, changes: { priceCop: 50_000 } }, cookie)).json.result?.data).toMatchObject({ version: 1 });
    const stale = await post('inventory.update', { listingId, expectedVersion: 0, changes: { priceCop: 51_000 } }, cookie);
    expect([stale.status, stale.json.error?.code]).toEqual([400, 'RequestValidationFailed']);
    expect((await get('inventory.get', { listingId }, '')).json.result?.data).toMatchObject({ state: 'Active', priceCop: 50_000, availability: 5 });
    expect((await post('inventory.deactivate', { listingId }, cookie)).json.result?.data).toMatchObject({ version: 2 });
    const hidden = await get('inventory.get', { listingId }, '');
    expect([hidden.status, hidden.json.error?.code]).toEqual([404, 'ListingNotFound']);
    const mine = (await get('inventory.mine', { cursor: null }, cookie)).json.result?.data as { items: { state: string }[]; nextCursor: string | null };
    expect([mine.items.map((i) => i.state).sort(), mine.nextCursor]).toEqual([['Active', 'Deactivated'], null]);
    expect((await post('inventory.reactivate', { listingId }, cookie)).json.result?.data).toMatchObject({ version: 3 });
  });

  it('another seller restocking is ListingNotOwnedByCaller 403, and the unit is unchanged', async () => {
    await individualSeller(db, id('valentina'));
    await individualSeller(db, id('mateo'));
    await catalogEntry(db, id('char'));
    const listingId = (await post('inventory.create', listingInput, await signIn(id('valentina')))).json.result?.data.listingId;
    const refused = await post('inventory.restock', { listingId, delta: 2 }, await signIn(id('mateo')));
    expect([refused.status, refused.json.error?.code]).toEqual([403, 'ListingNotOwnedByCaller']);
    expect(await rows(db, 'InventoryUnit')).toMatchObject([{ quantity: 3 }]);
  });
});

describe('discovery.search over HTTP (DSC-1; Story 6.2)', () => {
  it('a listing created with no location is found at its seller\'s meeting point, ranked and explained; a 301 km radius is refused', async () => {
    await individualSeller(db, id('valentina'));
    await catalogEntry(db, id('char'));
    const created = await post('inventory.create', listingInput, await signIn(id('valentina')));
    const area = { lat: 4.711, lng: -74.0721, radiusKm: 15 };
    const found = (await get('discovery.search', { view: 'listings', area, page: 1, pageSize: 24 }, '')).json.result?.data as { results: Record<string, unknown>[]; excluded: { unusableLocation: number } };
    expect(found.results).toMatchObject([{ listingId: created.json.result?.data.listingId, distanceKm: 0, sellerKind: 'individual', pickupAvailable: true, purchasable: false, explanation: { outcome: 'ranked', reasonCode: 'ListingRanked' } }]);
    expect(found.excluded.unusableLocation).toBe(0);
    const refused = await get('discovery.search', { view: 'listings', area: { ...area, radiusKm: 301 }, page: 1, pageSize: 24 }, '');
    expect([refused.status, refused.json.error?.code]).toEqual([400, 'InvalidSearchArea']);
  });
});

describe('discovery.cardDetail over HTTP (DSC-2; Story 6.3)', () => {
  it('anyone reads a card with its nearby listings and its separate reference price; an unknown card is CatalogEntryNotFound 404', async () => {
    await individualSeller(db, id('valentina'));
    await catalogEntry(db, id('char'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('o1'), catalogEntryId: id('char'), cop: 52_000, observedAt: at(-HOUR), runId: id('run1') });
    await post('inventory.create', { ...listingInput, quantity: 1 }, await signIn(id('valentina')));
    const area = { lat: 4.711, lng: -74.0721, radiusKm: 5 };
    const read = (await get('discovery.cardDetail', { catalogEntryId: id('char'), area }, '')).json.result?.data;
    expect(read).toMatchObject({ entry: { catalogEntryId: id('char') }, listingPriceCop: 45_000, hasActiveListings: true, excluded: { unusableLocation: 0 },
      provenance: { lastTransactionReference: { cop: 52_000 } }, listings: [{ sellerKind: 'individual', pickupAvailable: true }] });
    const missing = await get('discovery.cardDetail', { catalogEntryId: id('ghost'), area: null }, '');
    expect([missing.status, missing.json.error?.code]).toEqual([404, 'CatalogEntryNotFound']);
  });
});
