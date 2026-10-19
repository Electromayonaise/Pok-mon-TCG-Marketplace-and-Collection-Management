// ATDD — COL (contracts.md §10, §15, §15.12). Red phase: every test must fail with NotImplementedError.
import { describe, expect, it } from 'vitest';
import { ColServiceV2 } from '../../../../src/modules/collections/index.js';
import type { CatalogForCol, ListingsForCol } from '../../../../src/modules/collections/index.js';
import type { OrderClosedV1 } from '../../../../src/shared-kernel/events.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { collection, entry, explainAssert, fake, id, ins, prompt, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';

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
const closed = (orderId: string, buyerId = id('camila')): OrderClosedV1 => ({
  orderId, buyerId, businessId: id('andres'), totalCop: 90_000,
  lines: [{ itemRef: id('e1'), title: 'Charizard ex', qty: 1, unitPriceCop: 45_000 }, { itemRef: id('e2'), title: 'Pikachu', qty: 2 }],
  sellerReceivedConfirmedAt: null, buyerItemReceivedConfirmedAt: '2026-10-01T03:30:00.000Z',
});

describe('COL-1 — acceptPrompt (contracts.md §10)', () => {
  it('[COL-1.Q1] accepting a prompt creates one PlatformPurchase entry per line, dated by the close fact in Bogotá', async () => {
    await user(db, { id: id('camila') });
    await collection(db, { id: id('coll1'), ownerId: id('camila') });
    await prompt(db, { id: id('p1'), orderId: id('o1'), buyerId: id('camila'), lines: closed(id('o1')).lines });
    await db.query(`UPDATE "PostPurchasePrompt" SET "buyerItemReceivedConfirmedAt" = '2026-10-01T03:30:00Z'`);
    const result = await setup().col.acceptPrompt({ promptId: id('p1'), collectionId: id('coll1'), actorId: id('camila') });
    expect(result.entryIds).toHaveLength(2);
    const entries = await rows<Record<string, unknown>>(db, 'CollectionEntry', 'TRUE ORDER BY "manualPosition"');
    expect(entries).toMatchObject([
      { source: 'PlatformPurchase', orderId: id('o1'), catalogEntryId: id('e1'), qty: 1, acquiredPriceCop: '45000' },
      { source: 'PlatformPurchase', orderId: id('o1'), catalogEntryId: id('e2'), qty: 2, acquiredPriceCop: null },
    ]);
    expect((entries[0]!.acquiredAt as Date).toISOString().slice(0, 10)).toBe('2026-09-30');
  });

  it('[COL-1.P1] another buyer’s prompt is PromptNotFound (404) with a body identical to an unknown id', async () => {
    await user(db, { id: id('camila') });
    await user(db, { id: id('julian') });
    await collection(db, { id: id('collj'), ownerId: id('julian') });
    await prompt(db, { id: id('p1'), orderId: id('o1'), buyerId: id('camila') });
    const foreign = await caught(() => setup().col.acceptPrompt({ promptId: id('p1'), collectionId: id('collj'), actorId: id('julian') }));
    const unknown = await caught(() => setup().col.acceptPrompt({ promptId: id('ghost'), collectionId: id('collj'), actorId: id('julian') }));
    expect(codeOf(foreign)).toBe('PromptNotFound');
    expect(httpOf(foreign)).toBe(404);
    expect(JSON.stringify(foreign)).toBe(JSON.stringify(unknown));
  });

  it('[COL-1.P2] a resolved prompt is PromptAlreadyResolved (409) citing status and resolvedAt', async () => {
    await user(db, { id: id('camila') });
    await collection(db, { id: id('coll1'), ownerId: id('camila') });
    await prompt(db, { id: id('p1'), orderId: id('o1'), buyerId: id('camila'), status: 'Dismissed' });
    const error = await caught(() => setup().col.acceptPrompt({ promptId: id('p1'), collectionId: id('coll1'), actorId: id('camila') }));
    expect(codeOf(error)).toBe('PromptAlreadyResolved');
    expect(citedInputs(error)).toMatchObject({ status: 'Dismissed' });
  });

  it('[COL-1.P3] accepting into a missing collection is CollectionNotFound and the prompt stays Pending (review G-15)', async () => {
    await user(db, { id: id('camila') });
    await prompt(db, { id: id('p1'), orderId: id('o1'), buyerId: id('camila') });
    expect(codeOf(await caught(() => setup().col.acceptPrompt({ promptId: id('p1'), collectionId: id('gone'), actorId: id('camila') })))).toBe('CollectionNotFound');
    expect(await rows(db, 'PostPurchasePrompt')).toMatchObject([{ status: 'Pending' }]);
    expect(await rows(db, 'CollectionEntry')).toHaveLength(0);
  });

  it('[COL-1.MEC] OrderClosed delivered twice, then the prompt accepted twice at once, 100 repetitions: one prompt, one entry per line (NFR-COL-1)', async () => {
    await user(db, { id: id('camila') });
    await collection(db, { id: id('coll1'), ownerId: id('camila') });
    for (let rep = 0; rep < 100; rep++) {
      const orderId = id(`ord${rep}`);
      const { col } = setup();
      const first = await db.transactions.run((tx) => col.onOrderClosed(tx, closed(orderId)));
      const second = await db.transactions.run((tx) => col.onOrderClosed(tx, closed(orderId)));
      expect(second).toEqual({ created: false, promptId: first.promptId });
      const outcome = await race(2, () => setup().col.acceptPrompt({ promptId: first.promptId, collectionId: id('coll1'), actorId: id('camila') }));
      expect(outcome.rejected.map(codeOf)).toEqual(['PromptAlreadyResolved']);
      expect(await rows(db, 'CollectionEntry', '"orderId" = $1', [orderId])).toHaveLength(2);
    }
    expect(await rows(db, 'PostPurchasePrompt')).toHaveLength(100);
  });

  it('[COL-1.dismiss.h] dismissing a pending prompt resolves it with no entry', async () => {
    await user(db, { id: id('camila') });
    await prompt(db, { id: id('p1'), orderId: id('o1'), buyerId: id('camila') });
    expect((await setup().col.dismissPrompt({ promptId: id('p1'), actorId: id('camila') })).status).toBe('Dismissed');
    expect(await rows(db, 'CollectionEntry')).toHaveLength(0);
  });

  it('[COL-1.dismiss.f] dismissing an accepted prompt is PromptAlreadyResolved', async () => {
    await user(db, { id: id('camila') });
    await prompt(db, { id: id('p1'), orderId: id('o1'), buyerId: id('camila'), status: 'Accepted' });
    expect(codeOf(await caught(() => setup().col.dismissPrompt({ promptId: id('p1'), actorId: id('camila') })))).toBe('PromptAlreadyResolved');
  });

  it('[COL-1.list.h] the buyer’s prompts are listed, filtered by status', async () => {
    await user(db, { id: id('camila') });
    await prompt(db, { id: id('p1'), orderId: id('o1'), buyerId: id('camila') });
    await prompt(db, { id: id('p2'), orderId: id('o2'), buyerId: id('camila'), status: 'Dismissed' });
    expect((await setup().col.listPrompts({ buyerId: id('camila'), status: 'Pending' })).prompts.map((p) => p.promptId)).toEqual([id('p1')]);
  });
});

describe('COL-2 — onOrderClosed (contracts.md §10)', () => {
  it('[COL-2.Q1] an OrderClosed creates one Pending prompt with the payload lines and the close fact, and a system audit row', async () => {
    await user(db, { id: id('camila') });
    const result = await db.transactions.run((tx) => setup().col.onOrderClosed(tx, closed(id('o1'))));
    expect(result.created).toBe(true);
    expect(await rows(db, 'PostPurchasePrompt')).toMatchObject([{ id: result.promptId, orderId: id('o1'), status: 'Pending', buyerItemReceivedConfirmedAt: new Date('2026-10-01T03:30:00.000Z') }]);
    expect(await rows(db, 'audit_events', `action = 'collections.prompt.created'`)).toMatchObject([{ actorKind: 'system' }]);
  });

  it('[COL-2.I1] concurrent deliveries of one OrderClosed create one prompt (AD-COL-2 rule 1)', async () => {
    await user(db, { id: id('camila') });
    const outcome = await race(5, () => db.transactions.run((tx) => setup().col.onOrderClosed(tx, closed(id('o1')))));
    expect(outcome.rejected.map(codeOf)).toEqual([]);
    expect(outcome.fulfilled.filter((r) => r.created)).toHaveLength(1);
    expect(await rows(db, 'PostPurchasePrompt')).toHaveLength(1);
  });

  it('[COL-2.I2] the subscriber reads only its payload: with no Order row anywhere the prompt is still created (AD-9, AD-8)', async () => {
    await user(db, { id: id('camila') });
    await db.transactions.run((tx) => setup().col.onOrderClosed(tx, closed(id('o1'))));
    expect(await rows(db, 'Order')).toHaveLength(0);
    expect(await rows(db, 'PostPurchasePrompt')).toHaveLength(1);
  });
});

describe('COL-3 — addEntry (contracts.md §10)', () => {
  it('[COL-3.Q1] a manual entry is added at the end of the binder, source Manual', async () => {
    await user(db, { id: id('valentina') });
    await collection(db, { id: id('coll1'), ownerId: id('valentina'), name: 'Keep' });
    await entry(db, { id: id('e0'), collectionId: id('coll1'), catalogEntryId: id('e0c'), position: 4 });
    const result = await setup().col.addEntry({ ownerId: id('valentina'), collectionId: id('coll1'), catalogEntryId: id('char'), qty: 2, acquiredAt: '2026-09-15', acquiredPriceCop: 40_000 });
    explainAssert(result.decision, { rule: 'FR-COL-2', inputs: { source: 'Manual', createdGeneral: false } });
    expect(await rows(db, 'CollectionEntry', 'id = $1', [result.entryId])).toMatchObject([{ source: 'Manual', orderId: null, qty: 2, manualPosition: 5 }]);
  });

  it('[COL-3.Q2] the first add with no collection creates "General" (EC-07, EC-08)', async () => {
    await user(db, { id: id('valentina') });
    const result = await setup().col.addEntry({ ownerId: id('valentina'), collectionId: null, catalogEntryId: id('char'), qty: 1, acquiredAt: '2026-09-15', acquiredPriceCop: null });
    expect(result.createdGeneral).toBe(true);
    expect(await rows(db, 'Collection')).toMatchObject([{ id: result.collectionId, name: 'General' }]);
  });

  it('[COL-3.P2] an acquiredAt after today in Bogotá is InvalidAcquiredDate (400); today itself is allowed (C-GAP-2)', async () => {
    await user(db, { id: id('valentina') });
    await collection(db, { id: id('coll1'), ownerId: id('valentina') });
    const svc = setup().col;
    const error = await caught(() => svc.addEntry({ ownerId: id('valentina'), collectionId: id('coll1'), catalogEntryId: id('char'), qty: 1, acquiredAt: '2026-10-02', acquiredPriceCop: null }));
    expect(codeOf(error)).toBe('InvalidAcquiredDate');
    expect(citedInputs(error)).toEqual({ acquiredAt: '2026-10-02', today: '2026-10-01' });
    expect((await svc.addEntry({ ownerId: id('valentina'), collectionId: id('coll1'), catalogEntryId: id('char'), qty: 1, acquiredAt: '2026-10-01', acquiredPriceCop: null })).entryId).toBeTruthy();
  });

  it('[COL-3.P3] another owner’s collection is CollectionNotFound (404) with no "General" created', async () => {
    await user(db, { id: id('valentina') });
    await user(db, { id: id('julian') });
    await collection(db, { id: id('collj'), ownerId: id('julian') });
    expect(codeOf(await caught(() => setup().col.addEntry({ ownerId: id('valentina'), collectionId: id('collj'), catalogEntryId: id('char'), qty: 1, acquiredAt: '2026-09-01', acquiredPriceCop: null })))).toBe('CollectionNotFound');
    expect(await rows(db, 'Collection', '"ownerId" = $1', [id('valentina')])).toHaveLength(0);
  });

  it('[COL-3.P4] an id the catalog reports missing is InvalidCatalogEntry (400)', async () => {
    await user(db, { id: id('valentina') });
    await collection(db, { id: id('coll1'), ownerId: id('valentina') });
    const error = await caught(() => setup().col.addEntry({ ownerId: id('valentina'), collectionId: id('coll1'), catalogEntryId: id('ghost'), qty: 1, acquiredAt: '2026-09-01', acquiredPriceCop: null }));
    expect(codeOf(error)).toBe('InvalidCatalogEntry');
    expect(httpOf(error)).toBe(400);
  });

  it('[COL-3.I2] storage refuses an external entry that names a catalog id, and a manual entry that names an order (AD-7, AD-COL-1)', async () => {
    await user(db, { id: id('valentina') });
    await collection(db, { id: id('coll1'), ownerId: id('valentina') });
    await setup().col.addEntry({ ownerId: id('valentina'), collectionId: id('coll1'), catalogEntryId: id('char'), qty: 1, acquiredAt: '2026-09-01', acquiredPriceCop: null });
    const external = await caught(() => ins(db, 'CollectionEntry', { id: id('x1'), collectionId: id('coll1'), cardKind: 'external', catalogEntryId: id('char'), externalUrl: 'https://x.org', externalTitle: 'X', source: 'Manual', qty: 1, acquiredAt: '2026-09-01', manualPosition: 9 }));
    const manualWithOrder = await caught(() => ins(db, 'CollectionEntry', { id: id('x2'), collectionId: id('coll1'), cardKind: 'catalog', catalogEntryId: id('char'), source: 'Manual', orderId: id('o1'), qty: 1, acquiredAt: '2026-09-01', manualPosition: 10 }));
    expect(String((external as Error).message)).toMatch(/collection_entry_catalog_tag/);
    expect(String((manualWithOrder as Error).message)).toMatch(/collection_entry_source_order/);
  });

  it('[COL-3.R1] two concurrent first-use adds create one "General" with distinct positions', async () => {
    await user(db, { id: id('valentina') });
    const outcome = await race(2, () => setup().col.addEntry({ ownerId: id('valentina'), collectionId: null, catalogEntryId: id('char'), qty: 1, acquiredAt: '2026-09-01', acquiredPriceCop: null }));
    expect(outcome.rejected.map(codeOf)).toEqual([]);
    expect(await rows(db, 'Collection')).toHaveLength(1);
    expect(new Set((await rows<{ manualPosition: number }>(db, 'CollectionEntry')).map((e) => e.manualPosition)).size).toBe(2);
  });
});

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

