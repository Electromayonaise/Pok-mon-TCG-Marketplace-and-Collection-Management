// INV against Postgres: listing moderation and its log (S-FR-REP-5, S-FR-REP-6.listing; Story 13.5).
// Split from inv.v2.test.ts by the Impl-2 test review (HIGH-3); the shared Given steps are in test-support/suites/inv.ts.
import { describe, expect, it } from 'vitest';
import { PgTransactionRunner } from '../../../../test-support/db.js';
import { caught } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { id, listing, rows, T0, user } from '../../../../test-support/solu2/fixtures.js';
import { InvServiceV2 } from './inv.v2.js';
import { singleConnectionPool } from '../../../../test-support/single-connection.js';
import { useInvSuite } from '../../../../test-support/suites/inv.js';

const { db, inventory, andres } = useInvSuite();

describe('listing moderation (S-FR-REP-5, S-FR-REP-6.listing; Story 13.5, decision log Impl-2 #18)', () => {
  const moderate = (inv: InvServiceV2, o: { hidden: boolean; listingId?: string; reasonCode?: 'Counterfeit' | 'Spam' | 'Other'; note?: string | null; adminId?: string }) =>
    inv.setListingHidden({ adminId: o.adminId ?? id('admin'), listingId: o.listingId ?? id('lchar'), hidden: o.hidden, reasonCode: o.reasonCode ?? 'Spam', note: o.note ?? null });

  it('a hide leaves the public read at once and an unhide brings it back; each logs the catalog title, and the stock is untouched', async () => {
    await user(db, { id: id('admin'), isAdmin: true });
    await andres(2);
    // AD-SYS-4 rule 9: the title snapshot reads catalog on the moderation's own connection, on a pool of 1.
    const pool = singleConnectionPool(db);
    try {
      const inv = inventory(new PgTransactionRunner(pool));
      await moderate(inv, { hidden: true, reasonCode: 'Counterfeit' });
      expect(codeOf(await caught(() => inv.getListing({ listingId: id('lchar'), actorId: null })))).toBe('ListingNotFound');
      const back = await moderate(inv, { hidden: false, reasonCode: 'Counterfeit' });
      expect(back.decision).toMatchObject({ outcome: 'allowed', reasonCode: 'ListingUnhiddenByAdmin' });
      expect((await inv.getListing({ listingId: id('lchar'), actorId: null })).state).toBe('Active');
    } finally {
      await pool.end();
    }
    expect((await rows(db, 'ListingModerationLog')).map((r) => [r.action, r.titleSnapshot, r.sellerId]).sort()).toEqual([
      ['hide', `Carta ${id('char').slice(0, 6)}`, id('andres')], ['unhide', `Carta ${id('char').slice(0, 6)}`, id('andres')],
    ]);
    expect((await rows<{ quantity: number }>(db, 'InventoryUnit'))[0]!.quantity).toBe(2);
    expect(await rows(db, 'audit_events', `action IN ('listings.listing.hidden', 'listings.listing.unhidden')`)).toHaveLength(2);
  });

  it('a bundle logs its own title; unhiding a visible listing is ListingNotHidden with zero writes; an unknown id is ListingNotFound', async () => {
    await user(db, { id: id('admin'), isAdmin: true });
    await andres(1);
    await listing(db, { id: id('lb'), sellerId: id('andres'), kind: 'bundle', title: 'Lote Kanto', priceCop: 90_000 });
    const inv = inventory();
    await moderate(inv, { hidden: true, listingId: id('lb') });
    expect((await rows(db, 'ListingModerationLog'))[0]).toMatchObject({ listingId: id('lb'), titleSnapshot: 'Lote Kanto' });
    const visible = await moderate(inv, { hidden: false });
    expect(visible.decision).toMatchObject({ outcome: 'allowedWithNotice', reasonCode: 'ListingNotHidden', citations: [{ rule: 'FR-REP-5', inputs: { listingId: id('lchar') } }] });
    expect(codeOf(await caught(() => moderate(inv, { hidden: true, listingId: id('ghost') })))).toBe('ListingNotFound');
    expect(await rows(db, 'ListingModerationLog')).toHaveLength(1);
  });

  it('Other needs a 10–500 character note, and a non-admin is AdminOnly, both with zero writes', async () => {
    await user(db, { id: id('admin'), isAdmin: true });
    await andres(1);
    const inv = inventory();
    for (const note of [null, 'corta', 'x'.repeat(501)]) {
      expect(codeOf(await caught(() => moderate(inv, { hidden: true, reasonCode: 'Other', note })))).toBe('RequestValidationFailed');
    }
    expect(codeOf(await caught(() => moderate(inv, { hidden: true, adminId: id('andres') })))).toBe('AdminOnly');
    expect(await rows(db, 'ListingModerationLog')).toEqual([]);
    expect(await rows(db, 'Listing', '"hiddenAt" IS NOT NULL')).toEqual([]);
    const ok = await moderate(inv, { hidden: true, reasonCode: 'Other', note: 'Fotos copiadas de otra tienda.' });
    expect(ok.decision.outcome).toBe('hidden');
  });

  it('the log reads 50 per page newest first by (at desc, id), filters by reason, and refuses a cursor it did not issue', async () => {
    await user(db, { id: id('admin'), isAdmin: true });
    await andres(1);
    for (let i = 0; i < 52; i++) {
      await db.query(
        `INSERT INTO "ListingModerationLog" (id, "listingId", action, "reasonCode", note, "adminId", "titleSnapshot", "sellerId", "createdAt")
         VALUES ($1, $2, $3, $4, NULL, $5, 'Charizard ex', $6, $7)`,
        [id(`lg${String(i).padStart(2, '0')}`), id('lchar'), i % 2 === 0 ? 'hide' : 'unhide', i % 4 === 0 ? 'Counterfeit' : 'Spam', id('admin'), id('andres'), new Date(Date.parse(T0) + Math.floor(i / 2) * 60_000).toISOString()],
      );
    }
    const inv = inventory();
    const first = await inv.listListingModerationLog({ adminId: id('admin'), cursor: null });
    const second = await inv.listListingModerationLog({ adminId: id('admin'), cursor: first.nextCursor });
    expect(first.rows).toHaveLength(50);
    expect(second).toMatchObject({ nextCursor: null });
    const all = [...first.rows, ...second.rows];
    expect(all.map((r) => r.logId)).toEqual([...all].sort((a, b) => (a.at === b.at ? b.logId.localeCompare(a.logId) : b.at.localeCompare(a.at))).map((r) => r.logId));
    expect(new Set(all.map((r) => r.logId)).size).toBe(52);
    expect((await inv.listListingModerationLog({ adminId: id('admin'), cursor: null, reasonCode: 'Counterfeit' })).rows).toHaveLength(13);
    expect(codeOf(await caught(() => inv.listListingModerationLog({ adminId: id('admin'), cursor: 'bm90LWEtY3Vyc29y' })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => inv.listListingModerationLog({ adminId: id('andres'), cursor: null })))).toBe('AdminOnly');
  });
});
