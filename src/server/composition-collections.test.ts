// The production composition over HTTP (decision log Impl-1 #24): collections and valuation.
// Covers S-FR-COL-1, COL-1 to COL-3 through a replay, S-FR-COL-3..6 and VAL-1 to VAL-3, all through serveTrpc as app/api/trpc/[trpc]/route.ts calls it.
// One of the composition-*.test.ts files split from composition.test.ts (test review HIGH-1); the harness,
// test-support/http-app.ts, composes a fresh app per test at T0 (HIGH-8).
import { PrismaPg } from '@prisma/adapter-pg';
import { describe, expect, it } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client.js';
import { SECRET, useComposedApp } from '../../test-support/http-app.js';
import { admin, at, catalogEntry, collection, DAY, entry, failedDelivery, feedRun, id, observation, rows, user } from '../../test-support/solu2/fixtures.js';
import { createAuth } from './auth.js';
import { compose } from './composition.js';
import { betterAuthSessions } from './sessions.js';
import { serveTrpc } from './trpc/init.js';

const { db, clock, signIn, post, get } = useComposedApp();

describe('collections over HTTP (S-FR-COL-1, COL-3, COL-1, COL-2, S-FR-COL-3..6; Stories 11.1–11.3, 11.5)', () => {
  it('an owner creates, lists, renames and deletes collections; a taken name is CollectionNameTaken 409 and a foreign id is CollectionNotFound 404 (Story 11.1)', async () => {
    await user(db, { id: id('valentina') });
    await user(db, { id: id('julian') });
    const valentina = await signIn(id('valentina'));
    const keep = await post('collections.create', { name: 'Keep' }, valentina);
    expect(keep.status).toBe(200);
    const collectionId = keep.json.result?.data.collectionId as string;
    expect((await post('collections.create', { name: 'For trade' }, valentina)).status).toBe(200);
    const taken = await post('collections.create', { name: 'keep' }, valentina);
    expect([taken.status, taken.json.error?.code]).toEqual([409, 'CollectionNameTaken']);
    expect((await get('collections.list', {}, valentina)).json.result?.data).toEqual({
      collections: [{ collectionId: expect.any(String), name: 'For trade', entryCount: 0 }, { collectionId, name: 'Keep', entryCount: 0 }],
    });
    expect((await post('collections.rename', { collectionId, name: 'Guardadas' }, valentina)).status).toBe(200);
    const foreign = await post('collections.delete', { collectionId, confirm: true }, await signIn(id('julian')));
    expect([foreign.status, foreign.json.error?.code]).toEqual([404, 'CollectionNotFound']);
    const deleted = await post('collections.delete', { collectionId, confirm: true }, valentina);
    expect(deleted.json.result?.data).toMatchObject({ entriesRemoved: 0, platformPurchaseEntriesRemoved: 0 });
    expect(await rows(db, 'Collection', 'id = $1', [collectionId])).toHaveLength(0);
  });

  it('the first add of a catalog card creates "General" through the real catalog; an unknown card is InvalidCatalogEntry 400 (Story 11.2)', async () => {
    await user(db, { id: id('valentina') });
    await catalogEntry(db, id('char'));
    const valentina = await signIn(id('valentina'));
    const added = await post('collections.addEntry', { collectionId: null, catalogEntryId: id('char'), qty: 2, acquiredAt: '2026-09-15', acquiredPriceCop: 40_000 }, valentina);
    expect(added.json.result?.data).toMatchObject({ createdGeneral: true });
    expect(await rows(db, 'Collection')).toMatchObject([{ ownerId: id('valentina'), name: 'General' }]);
    const unknown = await post('collections.addEntry', { collectionId: null, catalogEntryId: id('ghost'), qty: 1, acquiredAt: '2026-09-15', acquiredPriceCop: null }, valentina);
    expect([unknown.status, unknown.json.error?.code]).toEqual([400, 'InvalidCatalogEntry']);
    expect(await rows(db, 'CollectionEntry')).toMatchObject([{ source: 'Manual', qty: 2, manualPosition: 0 }]);
  });

  it('a replayed OrderClosed creates one prompt through the real collections handler; the buyer lists it and accepts it into a collection (Story 11.3)', async () => {
    await admin(db);
    await user(db, { id: id('camila') });
    const auth = createAuth({ prisma: new PrismaClient({ adapter: new PrismaPg(db.pool) }), secret: SECRET, baseUrl: 'http://localhost:3000', clock });
    const real = compose({ pool: db.pool, clock, sessions: betterAuthSessions(auth), handlers: { commission: async () => undefined } });
    const payload = {
      orderId: id('o1'), buyerId: id('camila'), businessId: id('andres'), totalCop: 45_000, lines: [{ itemRef: id('char'), title: 'Charizard ex', qty: 1, unitPriceCop: 45_000 }],
      sellerReceivedConfirmedAt: null, buyerItemReceivedConfirmedAt: '2026-10-01T03:30:00.000Z',
    };
    await failedDelivery(db, { eventId: id('ev1'), type: 'OrderClosed', aggregateId: id('o1'), payload, subscriber: 'collections' });
    const replay = await serveTrpc(new Request('http://localhost/api/trpc/admin.events.replay', {
      method: 'POST', headers: { 'content-type': 'application/json', cookie: await signIn(id('admin')) }, body: JSON.stringify({ eventId: id('ev1'), subscriber: 'collections' }),
    }), real.router, clock, { identity: real.identity });
    expect(((await replay.json()) as { result?: { data: { status: string } } }).result?.data.status).toBe('delivered');
    const camila = await signIn(id('camila'));
    const listed = await get('collections.prompts.list', { status: 'Pending' }, camila);
    const prompts = listed.json.result?.data.prompts as { promptId: string; orderId: string; lineCount: number }[];
    expect(prompts).toMatchObject([{ orderId: id('o1'), lineCount: 1 }]);
    const collectionId = (await post('collections.create', { name: 'Compras' }, camila)).json.result?.data.collectionId;
    const accepted = await post('collections.prompts.accept', { promptId: prompts[0]!.promptId, collectionId }, camila);
    expect(accepted.json.result?.data).toMatchObject({ status: 'Accepted', entryIds: [expect.any(String)] });
    const again = await post('collections.prompts.dismiss', { promptId: prompts[0]!.promptId }, camila);
    expect([again.status, again.json.error?.code]).toEqual([409, 'PromptAlreadyResolved']);
    expect(await rows(db, 'CollectionEntry')).toMatchObject([{ source: 'PlatformPurchase', orderId: id('o1'), acquiredPriceCop: '45000' }]);
  });

  it('the binder, a link, a copy and the wishlist through the real catalog and listings; spoofed links, foreign ids and unknown cards are refused (Story 11.5)', async () => {
    await user(db, { id: id('julian') });
    await user(db, { id: id('camila') });
    await catalogEntry(db, id('char'), { name: 'Charizard ex', number: '006' });
    await collection(db, { id: id('coll1'), ownerId: id('julian'), name: 'General' });
    await collection(db, { id: id('coll2'), ownerId: id('julian'), name: 'Intercambio' });
    await entry(db, { id: id('e1'), collectionId: id('coll1'), catalogEntryId: id('char'), qty: 1, acquiredAt: '2026-09-01' });
    const julian = await signIn(id('julian'));
    const link = { collectionId: id('coll1'), url: 'https://promos.example/pikachu', title: 'Pikachu promo', imageUrl: null, qty: 1, acquiredAt: '2026-09-02' };
    const added = await post('collections.addExternal', link, julian);
    expect([added.status, added.json.result?.data.decision]).toEqual([200, expect.objectContaining({ reasonCode: 'CollectionEntryAdded' })]);
    // Every unsafe link reaches the service and is S-FR-COL-3's own InvalidExternalLink citing url (decision log Impl-2 #20).
    const http = await post('collections.addExternal', { ...link, url: 'http://promos.example/pikachu' }, julian);
    expect([http.status, http.json.error?.code]).toEqual([400, 'InvalidExternalLink']);
    const spoof = await post('collections.addExternal', { ...link, url: 'https://user:pass@promos.example/pikachu' }, julian);
    expect([spoof.status, spoof.json.error?.code]).toEqual([400, 'InvalidExternalLink']);
    const binder = await get('collections.binder', { collectionId: id('coll1'), sort: ['acquiredAt'], setId: null }, julian);
    expect(binder.json.result?.data).toMatchObject({ rows: 3, cols: 3, completion: null, entries: [{ entryId: id('e1'), title: 'Charizard ex' }, { cardKind: 'external', title: 'Pikachu promo', externalUrl: link.url }] });
    const copied = await post('collections.copyEntry', { entryId: id('e1'), targetCollectionId: id('coll2') }, julian);
    expect(copied.json.result?.data).toMatchObject({ collectionId: id('coll2'), decision: { reasonCode: 'CollectionEntryCopied' } });
    expect((await post('collections.moveEntry', { entryId: id('e1'), targetCollectionId: id('coll2') }, julian)).json.result?.data).toMatchObject({ entryId: id('e1') });
    expect((await post('collections.setLayout', { collectionId: id('coll1'), rows: 2, cols: 4 }, julian)).status).toBe(200);
    expect((await post('collections.reorder', { collectionId: id('coll1'), orderedEntryIds: [added.json.result?.data.entryId] }, julian)).status).toBe(200);
    const camila = await signIn(id('camila'));
    const foreign = await get('collections.binder', { collectionId: id('coll1'), sort: [], setId: null }, camila);
    expect([foreign.status, foreign.json.error?.code]).toEqual([404, 'CollectionNotFound']);
    const notHers = await post('collections.moveEntry', { entryId: id('e1'), targetCollectionId: id('coll1') }, camila);
    expect([notHers.status, notHers.json.error?.code]).toEqual([404, 'CollectionEntryNotFound']);
    const wished = await post('collections.wishlist.add', { catalogEntryId: id('char'), maxPriceCop: 50_000, note: null }, camila);
    expect(wished.json.result?.data).toEqual({ rows: [{ catalogEntryId: id('char'), maxPriceCop: 50_000, lowestPriceCop: null, availableCount: 0 }] });
    const ghost = await post('collections.wishlist.add', { catalogEntryId: id('ghost'), maxPriceCop: null, note: null }, camila);
    expect([ghost.status, ghost.json.error?.code]).toEqual([400, 'InvalidCatalogEntry']);
    expect((await get('collections.wishlist.list', {}, camila)).json.result?.data).toEqual(wished.json.result?.data);
    expect((await post('collections.wishlist.remove', { catalogEntryId: id('char') }, camila)).json.result?.data).toEqual({ rows: [] });
    expect(await rows(db, 'CatalogEntry')).toHaveLength(1);
  });
});

describe('valuation over HTTP (VAL-1, VAL-2, VAL-3; Stories 12.1, 12.2)', () => {
  it('the owner values a collection through the real catalog in one snapshot; another user gets CollectionNotFound 404', async () => {
    await user(db, { id: id('valentina') });
    await user(db, { id: id('julian') });
    await catalogEntry(db, id('char'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('obs1'), catalogEntryId: id('char'), cop: 45_000, observedAt: at(-DAY), runId: id('run1') });
    await collection(db, { id: id('coll1'), ownerId: id('valentina'), name: 'General' });
    await entry(db, { id: id('e1'), collectionId: id('coll1'), catalogEntryId: id('char'), qty: 2, acquiredAt: '2026-09-01' });
    const valued = await get('valuation.current', { collectionId: id('coll1') }, await signIn(id('valentina')));
    expect(valued.json.result?.data).toMatchObject({ totalCop: 90_000, valuedCount: 1, staleCount: 0, notValued: [], decision: { reasonCode: 'CollectionValued' } });
    const foreign = await get('valuation.current', { collectionId: id('coll1') }, await signIn(id('julian')));
    expect([foreign.status, foreign.json.error?.code]).toEqual([404, 'CollectionNotFound']);
  });

  it('the owner reads the 30-day trend and a 7-day history; a 14-day period and 366 days are refused at the parser', async () => {
    await user(db, { id: id('valentina') });
    await catalogEntry(db, id('char'));
    await feedRun(db, id('run1'));
    await observation(db, { id: id('obs0'), catalogEntryId: id('char'), cop: 40_000, observedAt: at(-40 * DAY), runId: id('run1') });
    await observation(db, { id: id('obs1'), catalogEntryId: id('char'), cop: 45_000, observedAt: at(-DAY), runId: id('run1') });
    await collection(db, { id: id('coll1'), ownerId: id('valentina'), name: 'General' });
    await entry(db, { id: id('e1'), collectionId: id('coll1'), catalogEntryId: id('char'), qty: 1, acquiredAt: '2026-08-01' });
    const valentina = await signIn(id('valentina'));
    const trend = await get('valuation.trend', { collectionId: id('coll1'), period: 30 }, valentina);
    expect(trend.json.result?.data).toMatchObject({ valueAtStartCop: 40_000, valueNowCop: 45_000, changePercentHundredths: 1_250, label: 'current-cards-were-worth', decision: { reasonCode: 'ValuationTrendComputed' } });
    const history = await get('valuation.history', { collectionId: id('coll1'), days: 7 }, valentina);
    const points = history.json.result?.data.points as { date: string; valueCop: number; stale: boolean }[];
    expect(points).toHaveLength(7);
    // The −40-day price carries forward, stale, until the −1-day observation (never interpolated).
    expect(points.slice(0, 5).every((p) => p.valueCop === 40_000 && p.stale)).toBe(true);
    expect(points.at(-1)).toEqual({ date: '2026-10-01', valueCop: 45_000, stale: false });
    expect((await get('valuation.trend', { collectionId: id('coll1'), period: 14 }, valentina)).status).toBe(400);
    expect((await get('valuation.history', { collectionId: id('coll1'), days: 366 }, valentina)).json.error?.code).toBe('RequestValidationFailed');
  });
});
