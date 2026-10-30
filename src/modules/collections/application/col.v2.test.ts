// ColServiceV2 against Postgres: the edges the ATDD tests leave out — "General" at the 50-collection limit (D5), rename
// and delete of a foreign id, a dismissed prompt's foreign body, the subscriber's payload check, and list orders.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../../test-support/db.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught } from '../../../../test-support/errors.js';
import { collection, fake, id, prompt, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import type { OrderClosedV1 } from '../../../shared-kernel/events.js';
import type { CatalogForCol, ListingsForCol } from '../ports/col.v2.js';
import { ColServiceV2 } from './col.v2.js';

const db = useTestDatabase();

function col() {
  const catalog = fake<CatalogForCol>('catalog', { getEntries: async ({ catalogEntryIds }) => ({ entries: [], missing: catalogEntryIds.filter((c) => c === id('ghost')) }) });
  return new ColServiceV2({ ...wiring(db), catalog, listings: fake<ListingsForCol>('listings', {}) });
}
const add = { ownerId: id('valentina'), collectionId: null, catalogEntryId: id('char'), qty: 1, acquiredAt: '2026-09-01', acquiredPriceCop: null };

describe('addEntry with no target (COL-3 Q1, AD-COL-1 rules 1–2)', () => {
  it('reuses an existing "General", and at 50 collections with none refuses with CollectionLimitReached and writes nothing (D5)', async () => {
    await user(db, { id: id('valentina') });
    for (let i = 0; i < 50; i++) await collection(db, { id: id(`c${i}`), ownerId: id('valentina'), name: `Col ${i}` });
    const error = await caught(() => col().addEntry(add));
    expect(codeOf(error)).toBe('CollectionLimitReached');
    expect(await rows(db, 'CollectionEntry')).toHaveLength(0);
    await db.query(`UPDATE "Collection" SET name = 'general' WHERE id = $1`, [id('c7')]);
    const result = await col().addEntry(add);
    expect(result).toMatchObject({ collectionId: id('c7'), createdGeneral: false });
  });

  it('refuses a non-integer qty and a date that is not a day as RequestValidationFailed, before any write', async () => {
    await user(db, { id: id('valentina') });
    expect(codeOf(await caught(() => col().addEntry({ ...add, qty: 1.5 })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => col().addEntry({ ...add, acquiredAt: '2026-02-30' })))).toBe('RequestValidationFailed');
    expect(await rows(db, 'Collection')).toHaveLength(0);
  });
});

describe('rename and delete (S-FR-COL-1)', () => {
  it('a foreign id is CollectionNotFound and stays unchanged; a taken name on rename is CollectionNameTaken', async () => {
    await user(db, { id: id('valentina') });
    await user(db, { id: id('julian') });
    await collection(db, { id: id('cv'), ownerId: id('valentina'), name: 'Keep' });
    await collection(db, { id: id('cv2'), ownerId: id('valentina'), name: 'Trade' });
    expect(codeOf(await caught(() => col().renameCollection({ ownerId: id('julian'), collectionId: id('cv'), name: 'Mía' })))).toBe('CollectionNotFound');
    expect(codeOf(await caught(() => col().deleteCollection({ ownerId: id('julian'), collectionId: id('cv'), confirm: true })))).toBe('CollectionNotFound');
    expect(codeOf(await caught(() => col().renameCollection({ ownerId: id('valentina'), collectionId: id('cv2'), name: 'KEEP' })))).toBe('CollectionNameTaken');
    expect((await rows<{ name: string }>(db, 'Collection', 'TRUE ORDER BY name')).map((c) => c.name)).toEqual(['Keep', 'Trade']);
  });
});

describe('prompts (COL-1.dismiss, COL-1.list, COL-2 P2)', () => {
  it('dismissing a foreign prompt has the unknown id\'s body; the list is newest first', async () => {
    await user(db, { id: id('camila') });
    await user(db, { id: id('julian') });
    await prompt(db, { id: id('p1'), orderId: id('o1'), buyerId: id('camila') });
    await prompt(db, { id: id('p2'), orderId: id('o2'), buyerId: id('camila') });
    await db.query(`UPDATE "PostPurchasePrompt" SET "createdAt" = "createdAt" + interval '1 hour' WHERE id = $1`, [id('p2')]);
    const foreign = await caught(() => col().dismissPrompt({ promptId: id('p1'), actorId: id('julian') }));
    const unknown = await caught(() => col().dismissPrompt({ promptId: id('ghost'), actorId: id('julian') }));
    expect(codeOf(foreign)).toBe('PromptNotFound');
    expect(JSON.stringify(foreign)).toBe(JSON.stringify(unknown));
    expect((await col().listPrompts({ buyerId: id('camila') })).prompts.map((p) => p.promptId)).toEqual([id('p2'), id('p1')]);
  });

  it('an OrderClosed with no lines or no close fact is Unexpected, and no prompt is written', async () => {
    const payload: OrderClosedV1 = { orderId: id('o1'), buyerId: id('camila'), businessId: id('andres'), totalCop: 0, lines: [], sellerReceivedConfirmedAt: null, buyerItemReceivedConfirmedAt: '2026-10-01T03:30:00.000Z' };
    expect(codeOf(await caught(() => db.transactions.run((tx) => col().onOrderClosed(tx, payload))))).toBe('Unexpected');
    const noClose = { ...payload, lines: [{ itemRef: id('e1'), title: 'Charizard ex', qty: 1 }], buyerItemReceivedConfirmedAt: null } as unknown as OrderClosedV1;
    expect(codeOf(await caught(() => db.transactions.run((tx) => col().onOrderClosed(tx, noClose))))).toBe('Unexpected');
    expect(await rows(db, 'PostPurchasePrompt')).toHaveLength(0);
  });
});
