// Solu-1 ATDD — COL contracts (contracts.md §10). RED until implemented.
import { beforeEach, describe, expect, it } from 'vitest';
import { createColModule, type CatalogForCollections } from '../../../../src/modules/collections/index.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { id } from '../../../../test-support/ids.js';
import * as seed from '../../../../test-support/seed.js';
import { wiring, type Wiring } from '../../../../test-support/wiring.js';

const db = useTestDatabase();
let w: Wiring;
const camila = id('camila');
const valentina = id('valentina');
const SV1 = id('setsv1');
/** catalog fake: SV1 has three cards (A, B, C) and one sealed box; EMPTY has none. */
const entries: Record<string, { setId: string; kind: 'card' | 'sealedProduct' }> = {
  [id('carda')]: { setId: SV1, kind: 'card' },
  [id('cardb')]: { setId: SV1, kind: 'card' },
  [id('cardc')]: { setId: SV1, kind: 'card' },
  [id('box')]: { setId: SV1, kind: 'sealedProduct' },
};
const catalog: CatalogForCollections = {
  getEntries: async (ids) => ({ entries: ids.filter((e) => entries[e]).map((e) => ({ id: e, ...entries[e]! })), missing: ids.filter((e) => !entries[e]) }),
  getSetSummaries: async (setIds) =>
    setIds.flatMap((s) => (s === SV1 ? [{ setId: s, name: 'Scarlet & Violet', cardEntryCount: 3 }] : s === id('setempty') ? [{ setId: s, name: 'Empty', cardEntryCount: 0 }] : [])),
  getReferencePricesAsOf: async () => new Map(),
};
beforeEach(() => {
  w = wiring(db);
});
const col = () => createColModule({ sql: w.sql, transactions: w.transactions, clock: w.clock, ids: w.ids, catalog });

/** A prompt for Camila's closed order: one card line with a price and one bundle-component line without. */
async function promptScene(closedAt = '2026-10-02T03:00:00.000Z') {
  await seed.collection(db, { id: id('colcamila'), ownerId: camila });
  await seed.collectionEntry(db, { id: id('existing'), collectionId: id('colcamila'), catalogEntryId: id('cardc'), position: 4 });
  return seed.postPurchasePrompt(db, {
    id: id('prompt'), orderId: id('order'), buyerId: camila, closedAt,
    lines: [{ itemRef: id('carda'), title: 'Pikachu ex', qty: 1, unitPriceCop: 45_000 }, { itemRef: id('cardb'), title: 'Charmander', qty: 2 }],
  });
}

describe('Solu-1 ATDD: COL — assertCollectionOwner (guard, FR-COL-1)', () => {
  it('RED: the owner passes', async () => {
    await seed.collection(db, { id: id('colcamila'), ownerId: camila });
    await expect(col().assertCollectionOwner({ collectionId: id('colcamila'), actorId: camila })).resolves.toBeUndefined();
  });

  it("RED: someone else's collection and an unknown id both get CollectionNotFound (404)", async () => {
    await seed.collection(db, { id: id('colcamila'), ownerId: camila });
    for (const collectionId of [id('colcamila'), id('ghost')]) {
      const error = await caught(() => col().assertCollectionOwner({ collectionId, actorId: valentina }));
      expect(codeOf(error)).toBe('CollectionNotFound');
      expect(httpOf(error)).toBe(404);
    }
  });
});

describe('Solu-1 ATDD: COL — acceptPrompt (contended mutation, AD-COL-2)', () => {
  it('RED: accepting creates one PlatformPurchase entry per line, dated on the Bogotá date of the close, after the existing positions', async () => {
    await promptScene('2026-10-02T03:00:00.000Z'); // 2026-10-01 22:00 in Bogotá
    const result = await col().acceptPrompt({ promptId: id('prompt'), collectionId: id('colcamila'), actorId: camila });
    expect(result).toMatchObject({ promptId: id('prompt'), status: 'Accepted' });
    expect(result.entryIds).toHaveLength(2);
    expect(
      await db.query(`SELECT "catalogEntryId", source, "orderId", qty, to_char("acquiredAt", 'YYYY-MM-DD') AS "acquiredAt", "acquiredPriceCop"::int AS price, "manualPosition" FROM "CollectionEntry" WHERE source = 'PlatformPurchase' ORDER BY "manualPosition"`),
    ).toEqual([
      { catalogEntryId: id('carda'), source: 'PlatformPurchase', orderId: id('order'), qty: 1, acquiredAt: '2026-10-01', price: 45_000, manualPosition: 5 },
      { catalogEntryId: id('cardb'), source: 'PlatformPurchase', orderId: id('order'), qty: 2, acquiredAt: '2026-10-01', price: null, manualPosition: 6 },
    ]);
  });

  it('RED (mandatory edge case NFR-COL-1): the prompt accepted twice at once — exactly one set of entries; the loser gets PromptAlreadyResolved', async () => {
    await promptScene();
    const outcome = await race(2, () => col().acceptPrompt({ promptId: id('prompt'), collectionId: id('colcamila'), actorId: camila }));
    expect(outcome.rejected.map(codeOf)).toEqual(['PromptAlreadyResolved']);
    expect(citedInputs(outcome.rejected[0])).toMatchObject({ status: 'Accepted' });
    expect(await db.query(`SELECT count(*)::int AS n FROM "CollectionEntry" WHERE source = 'PlatformPurchase'`)).toEqual([{ n: 2 }]);
  });

  it("RED (GAP-1): another buyer's prompt and an unknown id both get PromptNotFound (404), with no entry created", async () => {
    await promptScene();
    await seed.collection(db, { id: id('colvalentina'), ownerId: valentina });
    for (const promptId of [id('prompt'), id('ghost')]) {
      const error = await caught(() => col().acceptPrompt({ promptId, collectionId: id('colvalentina'), actorId: valentina }));
      expect(codeOf(error)).toBe('PromptNotFound');
      expect(httpOf(error)).toBe(404);
    }
    expect(await db.query(`SELECT status FROM "PostPurchasePrompt"`)).toEqual([{ status: 'Pending' }]);
  });

  it("RED: accepting into a collection the buyer does not own gets CollectionNotFound and the prompt stays Pending", async () => {
    await promptScene();
    await seed.collection(db, { id: id('colvalentina'), ownerId: valentina });
    expect(codeOf(await caught(() => col().acceptPrompt({ promptId: id('prompt'), collectionId: id('colvalentina'), actorId: camila })))).toBe('CollectionNotFound');
    expect(await db.query(`SELECT status FROM "PostPurchasePrompt"`)).toEqual([{ status: 'Pending' }]);
    expect(await db.query(`SELECT count(*)::int AS n FROM "CollectionEntry" WHERE source = 'PlatformPurchase'`)).toEqual([{ n: 0 }]);
  });
});

describe('Solu-1 ATDD: COL — getSetCompletion (resolver, FR-COL-5)', () => {
  it('RED: owning 2 of 3 SV1 cards is 66 %; sealed products and link-added entries never count', async () => {
    await seed.collection(db, { id: id('colvalentina'), ownerId: valentina });
    await seed.collectionEntry(db, { id: id('ea'), collectionId: id('colvalentina'), catalogEntryId: id('carda') });
    await seed.collectionEntry(db, { id: id('ea2'), collectionId: id('colvalentina'), catalogEntryId: id('carda'), position: 1 });
    await seed.collectionEntry(db, { id: id('eb'), collectionId: id('colvalentina'), catalogEntryId: id('cardb'), position: 2 });
    await seed.collectionEntry(db, { id: id('ebox'), collectionId: id('colvalentina'), catalogEntryId: id('box'), position: 3 });
    await seed.collectionEntry(db, { id: id('elink'), collectionId: id('colvalentina'), external: { url: 'https://example.com/promo', title: 'Promo' }, position: 4 });
    expect(await col().getSetCompletion({ collectionId: id('colvalentina'), setId: SV1 })).toEqual({ setId: SV1, ownedDistinct: 2, cardEntryCount: 3, completionPercent: 66 });
  });

  it('RED: a set with no cards has completionPercent null; an unknown set resolves to null', async () => {
    await seed.collection(db, { id: id('colvalentina'), ownerId: valentina });
    expect(await col().getSetCompletion({ collectionId: id('colvalentina'), setId: id('setempty') })).toEqual({ setId: id('setempty'), ownedDistinct: 0, cardEntryCount: 0, completionPercent: null });
    expect(await col().getSetCompletion({ collectionId: id('colvalentina'), setId: id('setghost') })).toBeNull();
  });
});
