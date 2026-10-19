// ATDD — COL supporting contracts, offered ports and read models (contracts.md §15). Split from col_contracts.test.ts (test review R-7..R-12).
import { describe, expect, it } from 'vitest';
import { ColServiceV2 } from '../../../../src/modules/collections/index.js';
import type { CatalogForCol, ListingsForCol } from '../../../../src/modules/collections/index.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { collection, entry, fake, id, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();

function setup() {
  const catalog = fake<CatalogForCol>('catalog', {
    getEntries: async ({ catalogEntryIds }) => ({
      entries: catalogEntryIds.filter((c) => c !== id('ghost')).map((c) => ({ catalogEntryId: c, setId: id('set1'), kind: 'card' as const, name: 'Charizard ex', number: '006', pokemon: null, colour: null, style: null, artist: null, imageUrl: null })),
      missing: catalogEntryIds.filter((c) => c === id('ghost')),
    }),
    getSetSummaries: async ({ setIds }) => ({ sets: setIds.map((s) => ({ setId: s, name: 'Set', cardEntryCount: s === id('emptyset') ? 0 : 10 })) }),
  });
  const listings = fake<ListingsForCol>('listings', {
    getAvailabilitySummary: async ({ catalogEntryIds }) => ({ items: catalogEntryIds.map((c) => ({ catalogEntryId: c, lowestPriceCop: 42_000, availableCount: 2 })) }),
  });
  const w = wiring(db);
  return { w, col: new ColServiceV2({ ...w, catalog, listings }) };
}

describe('Supporting COL contracts (contracts.md §15, §15.12)', () => {
  it('[S-FR-COL-1.h] "Keep" and "For trade" are created and listed', async () => {
    await user(db, { id: id('valentina') });
    const { col } = setup();
    await col.createCollection({ ownerId: id('valentina'), name: 'Keep' });
    await col.createCollection({ ownerId: id('valentina'), name: 'For trade' });
    expect((await col.listCollections({ ownerId: id('valentina') })).collections.map((c) => c.name)).toEqual(['For trade', 'Keep']);
  });

  it('[S-FR-COL-1.f] "keep" is CollectionNameTaken, and two concurrent creates at 49 leave exactly 50 (CollectionLimitReached)', async () => {
    await user(db, { id: id('valentina') });
    const { col } = setup();
    await col.createCollection({ ownerId: id('valentina'), name: 'Keep' });
    expect(codeOf(await caught(() => col.createCollection({ ownerId: id('valentina'), name: 'keep' })))).toBe('CollectionNameTaken');
    for (let i = 0; i < 48; i++) await collection(db, { id: id(`c${i}`), ownerId: id('valentina'), name: `Col ${i}` });
    const outcome = await race(2, (i) => setup().col.createCollection({ ownerId: id('valentina'), name: `Nueva ${i}` }));
    expect(outcome.rejected.map(codeOf)).toEqual(['CollectionLimitReached']);
    expect(await rows(db, 'Collection')).toHaveLength(50);
  });

  it('[S-FR-COL-1.list.h] collections are listed with their entry counts', async () => {
    await user(db, { id: id('valentina') });
    await collection(db, { id: id('coll1'), ownerId: id('valentina'), name: 'Keep' });
    await entry(db, { id: id('e1'), collectionId: id('coll1'), catalogEntryId: id('char') });
    expect((await setup().col.listCollections({ ownerId: id('valentina') })).collections).toEqual([{ collectionId: id('coll1'), name: 'Keep', entryCount: 1 }]);
  });

  it('[S-FR-COL-1.delete.h] deleting a collection cites how many purchase entries it removes (review G-15)', async () => {
    await user(db, { id: id('valentina') });
    await collection(db, { id: id('coll1'), ownerId: id('valentina') });
    await entry(db, { id: id('e1'), collectionId: id('coll1'), catalogEntryId: id('char'), orderId: id('o1') });
    await entry(db, { id: id('e2'), collectionId: id('coll1'), catalogEntryId: id('char') });
    const result = await setup().col.deleteCollection({ ownerId: id('valentina'), collectionId: id('coll1'), confirm: true });
    expect(result).toMatchObject({ entriesRemoved: 2, platformPurchaseEntriesRemoved: 1 });
  });

  it('[S-FR-COL-3.h] two promos added by link leave the catalog untouched (no CatalogEntry write)', async () => {
    await user(db, { id: id('valentina') });
    await collection(db, { id: id('coll1'), ownerId: id('valentina') });
    const { col } = setup();
    for (const t of ['Promo A', 'Promo B']) await col.addExternalEntry({ ownerId: id('valentina'), collectionId: id('coll1'), url: 'https://promos.example/a', title: t, imageUrl: null, qty: 1, acquiredAt: '2026-09-01' });
    expect(await rows(db, 'CatalogEntry')).toHaveLength(0);
    expect(await rows(db, 'CollectionEntry', `"cardKind" = 'external'`)).toHaveLength(2);
  });

  it('[S-FR-COL-3.f] an http:// URL is InvalidExternalLink citing the url field', async () => {
    await user(db, { id: id('valentina') });
    await collection(db, { id: id('coll1'), ownerId: id('valentina') });
    const error = await caught(() => setup().col.addExternalEntry({ ownerId: id('valentina'), collectionId: id('coll1'), url: 'http://promos.example/a', title: 'Promo', imageUrl: null, qty: 1, acquiredAt: '2026-09-01' }));
    expect(codeOf(error)).toBe('InvalidExternalLink');
    expect(citedInputs(error)).toMatchObject({ field: 'url' });
  });

  it('[S-FR-COL-4.h] copying a purchase entry keeps its source and order id', async () => {
    await user(db, { id: id('camila') });
    await collection(db, { id: id('c1'), ownerId: id('camila') });
    await collection(db, { id: id('c2'), ownerId: id('camila'), name: 'Otra' });
    await entry(db, { id: id('e1'), collectionId: id('c1'), catalogEntryId: id('char'), orderId: id('o1') });
    const result = await setup().col.moveOrCopyEntry({ ownerId: id('camila'), entryId: id('e1'), targetCollectionId: id('c2'), mode: 'copy' });
    expect(await rows(db, 'CollectionEntry', 'id = $1', [result.entryId])).toMatchObject([{ collectionId: id('c2'), source: 'PlatformPurchase', orderId: id('o1') }]);
  });

  it('[S-FR-COL-4.f] another owner’s entry is CollectionEntryNotFound', async () => {
    await user(db, { id: id('camila') });
    await user(db, { id: id('julian') });
    await collection(db, { id: id('c1'), ownerId: id('camila') });
    await collection(db, { id: id('cj'), ownerId: id('julian') });
    await entry(db, { id: id('e1'), collectionId: id('c1'), catalogEntryId: id('char') });
    expect(codeOf(await caught(() => setup().col.moveOrCopyEntry({ ownerId: id('julian'), entryId: id('e1'), targetCollectionId: id('cj'), mode: 'move' })))).toBe('CollectionEntryNotFound');
  });

  it('[S-FR-COL-5.h] the same binder sort twice gives the same order, with entryId as the last tie-break', async () => {
    await user(db, { id: id('camila') });
    await collection(db, { id: id('c1'), ownerId: id('camila') });
    for (const e of ['eb', 'ea', 'ec']) await entry(db, { id: id(e), collectionId: id('c1'), catalogEntryId: id('char'), acquiredAt: '2026-09-01' });
    const { col } = setup();
    const a = await col.getBinder({ ownerId: id('camila'), collectionId: id('c1'), sort: ['acquiredAt'], setId: null });
    const b = await col.getBinder({ ownerId: id('camila'), collectionId: id('c1'), sort: ['acquiredAt'], setId: null });
    expect(a.entries.map((e) => e.entryId)).toEqual([id('ea'), id('eb'), id('ec')]);
    expect(b).toEqual(a);
  });

  it('[S-FR-COL-5.f] a set with 0 card entries has completion null, never a division', async () => {
    await user(db, { id: id('camila') });
    await collection(db, { id: id('c1'), ownerId: id('camila') });
    expect((await setup().col.getBinder({ ownerId: id('camila'), collectionId: id('c1'), sort: [], setId: id('emptyset') })).completion).toMatchObject({ completionPercent: null });
  });

  it('[S-FR-COL-6.h] a wishlisted card shows its lowest purchasable price', async () => {
    await user(db, { id: id('camila') });
    const { col } = setup();
    await col.addWishlist({ ownerId: id('camila'), catalogEntryId: id('char'), maxPriceCop: 50_000, note: null });
    expect((await col.listWishlist({ ownerId: id('camila') })).rows).toEqual([{ catalogEntryId: id('char'), maxPriceCop: 50_000, lowestPriceCop: 42_000, availableCount: 2 }]);
  });

  it('[S-FR-COL-6.f] wishlisting an unknown catalog id is InvalidCatalogEntry', async () => {
    await user(db, { id: id('camila') });
    expect(codeOf(await caught(() => setup().col.addWishlist({ ownerId: id('camila'), catalogEntryId: id('ghost'), maxPriceCop: null, note: null })))).toBe('InvalidCatalogEntry');
    expect(await rows(db, 'WishlistEntry')).toHaveLength(0);
  });
});
