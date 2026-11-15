// ATDD — Story 11.6 (Flow A, decision log Impl-2 #17): a link that is not a plain https URL never enters a collection
// (S-FR-COL-3, AD-COL-1 rule 4, R-28). [S-FR-COL-3.f] proves the http:// case; this file proves the spoofs around it,
// each refused with InvalidExternalLink citing the failing field and nothing written.
import { describe, expect, it } from 'vitest';
import { ColServiceV2 } from '../../../src/modules/collections/index.js';
import type { CatalogForCol, ListingsForCol } from '../../../src/modules/collections/index.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../test-support/errors.js';
import { codeOf } from '../../../test-support/concurrency.js';
import { collection, fake, id, rows, user, wiring } from '../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();

/** The link-add needs neither neighbour: an external entry is validated by the pure rule alone (no server fetch). */
function col() {
  return new ColServiceV2({ ...wiring(db), catalog: fake<CatalogForCol>('catalog', {}), listings: fake<ListingsForCol>('listings', {}) });
}

const add = (o: { url?: string; imageUrl?: string | null }) => col().addExternalEntry({
  ownerId: id('julian'), collectionId: id('coll1'), url: o.url ?? 'https://promos.example/pikachu', title: 'Pikachu promo', imageUrl: o.imageUrl ?? null, qty: 1, acquiredAt: '2026-09-01',
});

/** 'https://promos.example/' padded with path characters to exactly `length` characters. */
const urlOfLength = (length: number) => {
  const base = 'https://promos.example/';
  return base + 'a'.repeat(length - base.length);
};

describe('Story 11.6 — link spoofs are refused on their field (S-FR-COL-3, R-28)', () => {
  it('[S-FR-COL-3.f2] javascript:, data:, an HTTP:// spoof, userinfo, a scheme-relative //host, a 2,049-character URL and a non-https imageUrl are each InvalidExternalLink citing the field, with zero writes', async () => {
    await user(db, { id: id('julian') });
    await collection(db, { id: id('coll1'), ownerId: id('julian') });
    const refused: { label: string; url?: string; imageUrl?: string; field: 'url' | 'imageUrl' }[] = [
      { label: 'javascript:', url: 'javascript:alert(1)', field: 'url' },
      { label: 'data:', url: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', field: 'url' },
      { label: 'HTTP:// spoof', url: 'HTTP://promos.example/pikachu', field: 'url' },
      { label: 'userinfo', url: 'https://user:pass@promos.example/pikachu', field: 'url' },
      { label: 'scheme-relative', url: '//promos.example/pikachu', field: 'url' },
      { label: '2,049 characters', url: urlOfLength(2_049), field: 'url' },
      { label: 'http imageUrl', imageUrl: 'http://promos.example/pikachu.png', field: 'imageUrl' },
      { label: 'javascript imageUrl', imageUrl: 'javascript:alert(1)', field: 'imageUrl' },
    ];
    for (const r of refused) {
      const error = await caught(() => add(r));
      expect(codeOf(error), r.label).toBe('InvalidExternalLink');
      expect([httpOf(error), citedInputs(error)?.field], r.label).toEqual([400, r.field]);
    }
    expect(await rows(db, 'CollectionEntry')).toHaveLength(0);
    expect(await rows(db, 'audit_events')).toHaveLength(0);
  });
});
