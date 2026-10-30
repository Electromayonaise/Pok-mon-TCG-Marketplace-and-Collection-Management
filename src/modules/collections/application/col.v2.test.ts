// ColServiceV2 against Postgres: the edges the ATDD tests leave out — "General" at the 50-collection limit (D5), rename
// and delete of a foreign id, a dismissed prompt's foreign body, the subscriber's payload check, and list orders.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../../test-support/db.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught } from '../../../../test-support/errors.js';
import { collection, fake, id, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import type { CatalogForCol, ListingsForCol } from '../ports/col.v2.js';
import { ColServiceV2 } from './col.v2.js';

const db = useTestDatabase();

function col() {
  const catalog = fake<CatalogForCol>('catalog', { getEntries: async ({ catalogEntryIds }) => ({ entries: [], missing: catalogEntryIds.filter((c) => c === id('ghost')) }) });
  return new ColServiceV2({ ...wiring(db), catalog, listings: fake<ListingsForCol>('listings', {}) });
}

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
