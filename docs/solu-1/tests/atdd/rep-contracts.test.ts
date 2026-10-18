// Solu-1 ATDD — REP contracts (contracts.md §12). RED until implemented.
import { beforeEach, describe, expect, it } from 'vitest';
import { createRepModule, type IdentityForReviews, type OrdersForReviews } from '../../../../src/modules/reviews/index.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { id } from '../../../../test-support/ids.js';
import * as seed from '../../../../test-support/seed.js';
import { wiring, type Wiring } from '../../../../test-support/wiring.js';

const db = useTestDatabase();
let w: Wiring;
let ordersCalls: number;
let latest: { closed: boolean; latestState: string | null };
const camila = id('camila');
const andres = id('andres');
const valentina = id('valentina');
const targets = new Map<string, Awaited<ReturnType<IdentityForReviews['getReviewTarget']>>>();
const identity: IdentityForReviews = { getReviewTarget: async (userId) => targets.get(userId) ?? null };
const orders: OrdersForReviews = {
  hasClosedPurchase: async () => {
    ordersCalls += 1;
    return latest;
  },
};
beforeEach(() => {
  w = wiring(db);
  ordersCalls = 0;
  latest = { closed: true, latestState: 'Closed' };
  targets.clear();
  targets.set(andres, { kind: 'business', status: 'Approved' });
  targets.set(valentina, { kind: 'individual', profileComplete: true });
});
const rep = () => createRepModule({ sql: w.sql, transactions: w.transactions, clock: w.clock, ids: w.ids, identity, orders });

describe('Solu-1 ATDD: REP — assertVerifiedPurchaser (guard, FR-REP-1/2)', () => {
  it('RED: a closed purchase from an Approved business verifies the review', async () => {
    expect(await rep().assertVerifiedPurchaser({ reviewerId: camila, targetUserId: andres })).toEqual({ targetKind: 'business', purchaseVerified: true });
  });

  it('RED (mandatory edge case): paid but not closed gets NotVerifiedPurchaser (409) citing the Paid state, read-only', async () => {
    latest = { closed: false, latestState: 'Paid' };
    const before = await db.counts(['Review']);
    const error = await caught(() => rep().assertVerifiedPurchaser({ reviewerId: camila, targetUserId: andres }));
    expect(codeOf(error)).toBe('NotVerifiedPurchaser');
    expect(httpOf(error)).toBe(409);
    expect(citedInputs(error)).toMatchObject({ latestState: 'Paid' });
    expect(await db.counts(['Review'])).toEqual(before);
  });

  it('RED: an individual seller is reviewable without any purchase check', async () => {
    expect(await rep().assertVerifiedPurchaser({ reviewerId: camila, targetUserId: valentina })).toEqual({ targetKind: 'individual', purchaseVerified: false });
    expect(ordersCalls).toBe(0);
  });

  it('RED: reviewing oneself or a Pending business gets TargetNotFound (404)', async () => {
    targets.set(id('tiendapaisa'), { kind: 'business', status: 'Pending' });
    for (const [reviewerId, targetUserId] of [[valentina, valentina], [camila, id('tiendapaisa')]] as const) {
      const error = await caught(() => rep().assertVerifiedPurchaser({ reviewerId, targetUserId }));
      expect(codeOf(error)).toBe('TargetNotFound');
      expect(httpOf(error)).toBe(404);
    }
  });
});

describe('Solu-1 ATDD: REP — hideReview (contended mutation, AD-REP-3)', () => {
  const hide = (adminId = id('sebastian')) => rep().hideReview({ reviewId: id('review'), reasonCode: 'Spam', note: null, adminId });

  it('RED: hiding a visible review records the hide and one log row carrying the content snapshot', async () => {
    await seed.review(db, { id: id('review'), reviewerId: camila, targetUserId: valentina, targetKind: 'individual', rating: 2, text: 'Compren aquí: spam.com' });
    const decision = await hide();
    expect(decision).toMatchObject({ outcome: 'hidden', reasonCode: 'Spam' });
    expect(await db.query(`SELECT "hiddenReason", "hiddenBy" FROM "Review"`)).toEqual([{ hiddenReason: 'Spam', hiddenBy: id('sebastian') }]);
    expect(await db.query(`SELECT action, "ratingSnapshot", "textSnapshot" FROM "ReviewModerationLog"`)).toEqual([{ action: 'hide', ratingSnapshot: 2, textSnapshot: 'Compren aquí: spam.com' }]);
  });

  it('RED: hiding an already-hidden review is an explained no-op (allowedWithNotice) that writes no log row', async () => {
    await seed.review(db, { id: id('review'), reviewerId: camila, targetUserId: valentina, targetKind: 'individual', rating: 2, hiddenAt: '2026-10-01T14:00:00.000Z' });
    expect(await hide()).toMatchObject({ outcome: 'allowedWithNotice' });
    expect(await db.counts(['ReviewModerationLog'])).toEqual({ ReviewModerationLog: 0 });
  });

  it('RED: an unknown review gets ReviewNotFound (404)', async () => {
    const error = await caught(() => hide());
    expect(codeOf(error)).toBe('ReviewNotFound');
    expect(httpOf(error)).toBe(404);
  });

  it('RED: two admins hiding at once — one transition, one log row, one notice', async () => {
    await seed.review(db, { id: id('review'), reviewerId: camila, targetUserId: valentina, targetKind: 'individual', rating: 2 });
    const outcome = await race(2, (n) => hide(id(n === 0 ? 'sebastian' : 'laura')));
    expect(outcome.rejected.map(codeOf)).toEqual([]);
    expect(outcome.fulfilled.map((d) => d.outcome).sort()).toEqual(['allowedWithNotice', 'hidden']);
    expect(await db.counts(['ReviewModerationLog'])).toEqual({ ReviewModerationLog: 1 });
  });
});

describe('Solu-1 ATDD: REP — getAggregates (resolver, FR-REP-3)', () => {
  it('RED: sum 51 over 12 visible reviews is 43 tenths (4.3, not banker’s 4.2); a hidden review never counts', async () => {
    const ratings = [5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4]; // sum 51
    for (const [i, rating] of ratings.entries()) {
      await seed.review(db, { id: id(`r${i}`), reviewerId: id(`buyer${i}`), targetUserId: valentina, targetKind: 'individual', rating });
    }
    await seed.review(db, { id: id('rhidden'), reviewerId: id('troll'), targetUserId: valentina, targetKind: 'individual', rating: 1, hiddenAt: '2026-10-01T14:00:00.000Z' });
    expect(await rep().getAggregates({ sellerIds: [valentina] })).toEqual([{ sellerId: valentina, averageTenths: 43, count: 12 }]);
  });

  it('RED: a seller with no visible review returns { averageTenths: null, count: 0 }, in request order', async () => {
    await seed.review(db, { id: id('r1'), reviewerId: camila, targetUserId: valentina, targetKind: 'individual', rating: 5 });
    expect(await rep().getAggregates({ sellerIds: [andres, valentina] })).toEqual([
      { sellerId: andres, averageTenths: null, count: 0 },
      { sellerId: valentina, averageTenths: 50, count: 1 },
    ]);
  });
});
