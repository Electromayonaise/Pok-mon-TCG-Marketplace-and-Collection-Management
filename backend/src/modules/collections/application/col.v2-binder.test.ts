// ColServiceV2 against Postgres: Story 11.5's binder (with the real catalog), links, move/copy, layout, reorder and
// wishlist edges that the ATDD tests leave out.
// Split from col.v2.test.ts by the Impl-2 test review (HIGH-7).
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../../test-support/db.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { catalogEntry, collection, entry, fake, id, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import type { CatalogFeedSource, FxRateSource } from '../../../shared-kernel/external.js';
import { CatServiceV2 } from '../../catalog/index.js';
import type { ListingsForCol } from '../ports/col.v2.js';
import { ColServiceV2 } from './col.v2.js';

const db = useTestDatabase();

type Availability = { catalogEntryId: string; lowestPriceCop: number | null; availableCount: number };

/** COL with the real catalog (getEntries, getSetSummaries), as the composition root binds it, and a listings fake that records its calls. */
function binderCol(availability: (ids: string[]) => Availability[] = (ids) => ids.map((c) => ({ catalogEntryId: c, lowestPriceCop: null, availableCount: 0 }))) {
  const w = wiring(db);
  const calls: number[] = [];
  const catalog = new CatServiceV2({ ...w, feed: fake<CatalogFeedSource>('feed', {}), fx: fake<FxRateSource>('fx', {}) });
  const listings = fake<ListingsForCol>('listings', {
    getAvailabilitySummary: async ({ catalogEntryIds }) => {
      calls.push(catalogEntryIds.length);
      return { items: availability(catalogEntryIds) };
    },
  });
  return { col: new ColServiceV2({ ...w, catalog, listings }), calls };
}
const link = { ownerId: id('julian'), collectionId: id('c1'), url: 'https://promos.example/pikachu', title: 'Pikachu promo', imageUrl: 'https://promos.example/pikachu.png', qty: 1, acquiredAt: '2026-09-01' };

describe('getBinder with the real catalog (S-FR-COL-5.binder, AD-COL-1 rule 5)', () => {
  it('filters to one set, counts distinct owned cards only (no sealed product, no link, no duplicate) and sorts links after catalog cards', async () => {
    await user(db, { id: id('julian') });
    await collection(db, { id: id('c1'), ownerId: id('julian') });
    for (const [c, n] of [['s1a', '2'], ['s1b', '10'], ['s1c', '3']] as const) await catalogEntry(db, id(c), { setId: id('set1'), number: n, name: `Carta ${c}` });
    await catalogEntry(db, id('s1box'), { setId: id('set1'), kind: 'sealedProduct', number: '900' });
    await catalogEntry(db, id('s2a'), { setId: id('set2'), number: '1' });
    await entry(db, { id: id('e1'), collectionId: id('c1'), catalogEntryId: id('s1b'), position: 0 });
    await entry(db, { id: id('e2'), collectionId: id('c1'), catalogEntryId: id('s1a'), position: 1 });
    await entry(db, { id: id('e3'), collectionId: id('c1'), catalogEntryId: id('s1a'), position: 2 });
    await entry(db, { id: id('e4'), collectionId: id('c1'), catalogEntryId: id('s1box'), position: 3 });
    await entry(db, { id: id('e5'), collectionId: id('c1'), catalogEntryId: id('s2a'), position: 4 });
    await entry(db, { id: id('e6'), collectionId: id('c1'), external: true, position: 5 });
    const { col } = binderCol();
    const all = await col.getBinder({ ownerId: id('julian'), collectionId: id('c1'), sort: ['setNumber'], setId: null });
    expect([all.rows, all.cols, all.completion]).toEqual([3, 3, null]);
    // Within set1 by number as read (2, 2, 10, 900); the two entries of card 2 tie and fall to entryId; the link is last.
    const set1 = [id('e2'), id('e3'), id('e1'), id('e4')];
    const bySet = id('set1') < id('set2') ? [...set1, id('e5')] : [id('e5'), ...set1];
    expect(all.entries.map((e) => e.entryId)).toEqual([...bySet, id('e6')]);
    expect(all.entries.at(-1)).toMatchObject({ cardKind: 'external', catalogEntryId: null, title: 'Promo por enlace', externalUrl: 'https://example.org/promo', source: 'Manual' });
    const filtered = await col.getBinder({ ownerId: id('julian'), collectionId: id('c1'), sort: ['manual'], setId: id('set1') });
    expect(filtered.entries.map((e) => e.entryId)).toEqual([id('e1'), id('e2'), id('e3'), id('e4')]);
    expect(filtered.completion).toEqual({ setId: id('set1'), ownedDistinct: 2, cardEntryCount: 3, completionPercent: 66 });
    expect((await col.getBinder({ ownerId: id('julian'), collectionId: id('c1'), sort: [], setId: id('nosuchset') })).completion).toBeNull();
  });

  it('a foreign or unknown collection is CollectionNotFound, and more than 3 or repeated sort keys are RequestValidationFailed', async () => {
    await user(db, { id: id('julian') });
    await user(db, { id: id('camila') });
    await collection(db, { id: id('c1'), ownerId: id('camila') });
    const { col } = binderCol();
    const read = (o: Partial<Parameters<ColServiceV2['getBinder']>[0]>) => caught(() => col.getBinder({ ownerId: id('julian'), collectionId: id('c1'), sort: [], setId: null, ...o }));
    expect(codeOf(await read({}))).toBe('CollectionNotFound');
    expect(codeOf(await read({ collectionId: id('ghost') }))).toBe('CollectionNotFound');
    expect(codeOf(await read({ ownerId: id('camila'), sort: ['name', 'acquiredAt', 'setNumber', 'manual'] }))).toBe('RequestValidationFailed');
    expect(codeOf(await read({ ownerId: id('camila'), sort: ['name', 'name'] }))).toBe('RequestValidationFailed');
  });
});

describe('addExternalEntry (S-FR-COL-3)', () => {
  it('stores the link last in the binder with its image, audits it, and never writes the catalog', async () => {
    await user(db, { id: id('julian') });
    await collection(db, { id: id('c1'), ownerId: id('julian') });
    await entry(db, { id: id('e1'), collectionId: id('c1'), catalogEntryId: id('char'), position: 7 });
    const { col } = binderCol();
    const { entryId, decision } = await col.addExternalEntry(link);
    expect(decision).toMatchObject({ reasonCode: 'CollectionEntryAdded', citations: [{ rule: 'FR-COL-3', inputs: { entryId, cardKind: 'external', source: 'Manual' } }] });
    expect(await rows(db, 'CollectionEntry', 'id = $1', [entryId])).toMatchObject([{ cardKind: 'external', catalogEntryId: null, externalUrl: link.url, externalTitle: link.title, externalImageUrl: link.imageUrl, manualPosition: 8, source: 'Manual', orderId: null }]);
    expect(await rows(db, 'audit_events', `action = 'collections.entry.linked'`)).toHaveLength(1);
    expect(await rows(db, 'CatalogEntry')).toHaveLength(0);
  });

  it('a blank, over-long or NUL title is InvalidExternalLink on title; a foreign collection is CollectionNotFound; a bad qty or date is RequestValidationFailed; nothing is written', async () => {
    await user(db, { id: id('julian') });
    await user(db, { id: id('camila') });
    await collection(db, { id: id('c1'), ownerId: id('julian') });
    await collection(db, { id: id('cc'), ownerId: id('camila') });
    const { col } = binderCol();
    for (const title of ['   ', 'x'.repeat(121), 'a\u0000b']) {
      const error = await caught(() => col.addExternalEntry({ ...link, title }));
      expect([codeOf(error), citedInputs(error)?.field]).toEqual(['InvalidExternalLink', 'title']);
    }
    expect(codeOf(await caught(() => col.addExternalEntry({ ...link, collectionId: id('cc') })))).toBe('CollectionNotFound');
    // The virtual clock is 2026-10-01 in Bogotá: the next day is in the future.
    for (const bad of [{ qty: 0 }, { acquiredAt: '2026-10-02' }, { acquiredAt: '2026-02-30' }]) {
      expect(codeOf(await caught(() => col.addExternalEntry({ ...link, ...bad })))).toBe('RequestValidationFailed');
    }
    expect(await rows(db, 'CollectionEntry')).toHaveLength(0);
  });
});

describe('moveOrCopyEntry (S-FR-COL-4)', () => {
  it('a move puts the entry last in the target; a copy of a link keeps every field; each is audited and explained', async () => {
    await user(db, { id: id('julian') });
    await collection(db, { id: id('c1'), ownerId: id('julian') });
    await collection(db, { id: id('c2'), ownerId: id('julian'), name: 'Intercambio' });
    await entry(db, { id: id('e1'), collectionId: id('c1'), catalogEntryId: id('char'), position: 0 });
    await entry(db, { id: id('ex'), collectionId: id('c1'), external: true, position: 1 });
    await entry(db, { id: id('e9'), collectionId: id('c2'), catalogEntryId: id('char'), position: 4 });
    const { col } = binderCol();
    const moved = await col.moveOrCopyEntry({ ownerId: id('julian'), entryId: id('e1'), targetCollectionId: id('c2'), mode: 'move' });
    expect(moved).toMatchObject({ entryId: id('e1'), collectionId: id('c2'), decision: { reasonCode: 'CollectionEntryMoved', citations: [{ inputs: { fromCollectionId: id('c1'), toCollectionId: id('c2') } }] } });
    expect(await rows(db, 'CollectionEntry', 'id = $1', [id('e1')])).toMatchObject([{ collectionId: id('c2'), manualPosition: 5 }]);
    const copied = await col.moveOrCopyEntry({ ownerId: id('julian'), entryId: id('ex'), targetCollectionId: id('c2'), mode: 'copy' });
    expect(copied.decision).toMatchObject({ reasonCode: 'CollectionEntryCopied', citations: [{ inputs: { copiedFromEntryId: id('ex'), source: 'Manual' } }] });
    expect(await rows(db, 'CollectionEntry', 'id = $1', [copied.entryId])).toMatchObject([{ collectionId: id('c2'), cardKind: 'external', externalUrl: 'https://example.org/promo', externalTitle: 'Promo por enlace', manualPosition: 6 }]);
    expect(await rows(db, 'CollectionEntry', 'id = $1', [id('ex')])).toMatchObject([{ collectionId: id('c1') }]);
    expect(await rows(db, 'audit_events', `action IN ('collections.entry.moved', 'collections.entry.copied')`)).toHaveLength(2);
  });

  it('a foreign target is CollectionNotFound and an unknown entry CollectionEntryNotFound, with the entry where it was', async () => {
    await user(db, { id: id('julian') });
    await user(db, { id: id('camila') });
    await collection(db, { id: id('c1'), ownerId: id('julian') });
    await collection(db, { id: id('cc'), ownerId: id('camila') });
    await entry(db, { id: id('e1'), collectionId: id('c1'), catalogEntryId: id('char') });
    const { col } = binderCol();
    expect(codeOf(await caught(() => col.moveOrCopyEntry({ ownerId: id('julian'), entryId: id('e1'), targetCollectionId: id('cc'), mode: 'move' })))).toBe('CollectionNotFound');
    expect(codeOf(await caught(() => col.moveOrCopyEntry({ ownerId: id('julian'), entryId: id('ghost'), targetCollectionId: id('c1'), mode: 'copy' })))).toBe('CollectionEntryNotFound');
    expect(await rows(db, 'CollectionEntry')).toMatchObject([{ id: id('e1'), collectionId: id('c1') }]);
  });
});

describe('setBinderLayout and reorderEntries (S-FR-COL-5.layout, .reorder)', () => {
  it('a 4 × 2 layout and a reversed manual order are what the binder reads next', async () => {
    await user(db, { id: id('julian') });
    await collection(db, { id: id('c1'), ownerId: id('julian') });
    for (const [i, e] of ['ea', 'eb', 'ec'].entries()) await entry(db, { id: id(e), collectionId: id('c1'), catalogEntryId: id('char'), position: i });
    const { col } = binderCol();
    await col.setBinderLayout({ ownerId: id('julian'), collectionId: id('c1'), rows: 4, cols: 2 });
    await col.reorderEntries({ ownerId: id('julian'), collectionId: id('c1'), orderedEntryIds: [id('ec'), id('eb'), id('ea')] });
    const binder = await col.getBinder({ ownerId: id('julian'), collectionId: id('c1'), sort: ['manual'], setId: null });
    expect([binder.rows, binder.cols, binder.entries.map((e) => [e.entryId, e.manualPosition])]).toEqual([4, 2, [[id('ec'), 0], [id('eb'), 1], [id('ea'), 2]]]);
    // `char` is not in this catalog: the entry is shown as a card the catalog no longer has.
    expect(binder.entries[0]).toMatchObject({ title: 'Carta fuera del catálogo', imageUrl: null });
  });

  it('refuses a 6-row layout, a foreign collection, and a reorder that leaves out, repeats or adds an entry, changing nothing', async () => {
    await user(db, { id: id('julian') });
    await user(db, { id: id('camila') });
    await collection(db, { id: id('c1'), ownerId: id('julian') });
    await collection(db, { id: id('cc'), ownerId: id('camila') });
    for (const [i, e] of ['ea', 'eb'].entries()) await entry(db, { id: id(e), collectionId: id('c1'), catalogEntryId: id('char'), position: i });
    const { col } = binderCol();
    expect(codeOf(await caught(() => col.setBinderLayout({ ownerId: id('julian'), collectionId: id('c1'), rows: 6, cols: 0 })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => col.setBinderLayout({ ownerId: id('julian'), collectionId: id('cc'), rows: 2, cols: 2 })))).toBe('CollectionNotFound');
    expect(codeOf(await caught(() => col.reorderEntries({ ownerId: id('julian'), collectionId: id('cc'), orderedEntryIds: [] })))).toBe('CollectionNotFound');
    for (const orderedEntryIds of [[id('eb')], [id('eb'), id('eb')], [id('eb'), id('ea'), id('ghost')], [id('eb'), id('ghost')]]) {
      expect(codeOf(await caught(() => col.reorderEntries({ ownerId: id('julian'), collectionId: id('c1'), orderedEntryIds })))).toBe('RequestValidationFailed');
    }
    expect((await rows<{ id: string; manualPosition: number }>(db, 'CollectionEntry')).sort((a, b) => a.manualPosition - b.manualPosition).map((e) => e.id)).toEqual([id('ea'), id('eb')]);
    expect(await rows(db, 'Collection', 'id = $1', [id('cc')])).toMatchObject([{ binderRows: 3, binderCols: 3 }]);
    expect(await rows(db, 'audit_events')).toHaveLength(0);
  });
});

describe('the wishlist (S-FR-COL-6)', () => {
  it('a second add of a card keeps the first; the list is by price with unavailable cards last; remove takes it out once', async () => {
    await user(db, { id: id('camila') });
    for (const c of ['cheap', 'dear', 'none']) await catalogEntry(db, id(c));
    const prices = new Map<string, number | null>([[id('cheap'), 9_000], [id('dear'), 42_000], [id('none'), null]]);
    const { col } = binderCol((ids) => ids.map((c) => ({ catalogEntryId: c, lowestPriceCop: prices.get(c) ?? null, availableCount: prices.get(c) ? 1 : 0 })));
    await col.addWishlist({ ownerId: id('camila'), catalogEntryId: id('none'), maxPriceCop: null, note: 'La del evento' });
    await col.addWishlist({ ownerId: id('camila'), catalogEntryId: id('dear'), maxPriceCop: 50_000, note: null });
    const list = await col.addWishlist({ ownerId: id('camila'), catalogEntryId: id('cheap'), maxPriceCop: null, note: null });
    expect(list.rows.map((r) => r.catalogEntryId)).toEqual([id('cheap'), id('dear'), id('none')]);
    const again = await col.addWishlist({ ownerId: id('camila'), catalogEntryId: id('dear'), maxPriceCop: 1_000, note: null });
    expect(again.rows.find((r) => r.catalogEntryId === id('dear'))).toEqual({ catalogEntryId: id('dear'), maxPriceCop: 50_000, lowestPriceCop: 42_000, availableCount: 1 });
    expect(await rows(db, 'WishlistEntry')).toHaveLength(3);
    expect((await col.removeWishlist({ ownerId: id('camila'), catalogEntryId: id('dear') })).rows.map((r) => r.catalogEntryId)).toEqual([id('cheap'), id('none')]);
    await col.removeWishlist({ ownerId: id('camila'), catalogEntryId: id('dear') });
    const audited = await rows<{ action: string }>(db, 'audit_events', `action LIKE 'collections.wishlist.%'`);
    expect(audited.map((a) => a.action).sort()).toEqual(['collections.wishlist.added', 'collections.wishlist.added', 'collections.wishlist.added', 'collections.wishlist.removed']);
    expect(await rows(db, 'CollectionEntry')).toHaveLength(0);
  });

  it('asks listings for at most 500 ids per call, and an empty wishlist asks nothing', async () => {
    await user(db, { id: id('camila') });
    const { col, calls } = binderCol();
    expect((await col.listWishlist({ ownerId: id('camila') })).rows).toEqual([]);
    expect(calls).toEqual([]);
    await db.query(
      `INSERT INTO "WishlistEntry" (id, "ownerId", "catalogEntryId", "createdAt", "updatedAt")
       SELECT rpad('w' || i || 'x', 24, '0'), $1, rpad('ce' || i || 'x', 24, '0'), $2, $2 FROM generate_series(1, 501) AS i`,
      [id('camila'), '2026-10-01T15:00:00.000Z'],
    );
    expect((await col.listWishlist({ ownerId: id('camila') })).rows).toHaveLength(501);
    expect(calls).toEqual([500, 1]);
  });

  it('a max price under $1.000 or a bad note is RequestValidationFailed before the catalog is asked; an unknown card is InvalidCatalogEntry', async () => {
    await user(db, { id: id('camila') });
    const { col } = binderCol();
    const add = (o: { maxPriceCop?: number | null; note?: string | null }) => caught(() => col.addWishlist({ ownerId: id('camila'), catalogEntryId: id('char'), maxPriceCop: o.maxPriceCop ?? null, note: o.note ?? null }));
    expect(codeOf(await add({ maxPriceCop: 999 }))).toBe('RequestValidationFailed');
    expect(codeOf(await add({ note: 'x'.repeat(201) }))).toBe('RequestValidationFailed');
    expect(codeOf(await add({ note: 'a\u0000' }))).toBe('RequestValidationFailed');
    expect(codeOf(await add({}))).toBe('InvalidCatalogEntry');
    expect(await rows(db, 'WishlistEntry')).toHaveLength(0);
  });
});
