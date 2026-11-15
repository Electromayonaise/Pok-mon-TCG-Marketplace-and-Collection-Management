// ATDD — REP's reads (contracts.md §12, §15): REP-3 (aggregates), S-FR-REP-6 (admin review search and moderation log)
// and S-FR-REP-7 (profile). Red phase: every test must fail with NotImplementedError.
// Split from rep_contracts.test.ts by the Impl-2 test review (HIGH-6); the shared Given steps are in test-support/suites/rep.ts.
import { describe, expect, it } from 'vitest';
import { caught, httpOf } from '../../../test-support/errors.js';
import { codeOf, race } from '../../../test-support/concurrency.js';
import { at, explainAssert, HOUR, id, ins, review, user } from '../../../test-support/solu2/fixtures.js';
import { type Kind, useRepSuite } from '../../../test-support/suites/rep.js';

const { db, setup, people, targets, write, hide } = useRepSuite();

describe('REP-3 — getAggregates (contracts.md §12)', () => {
  it('[REP-3.Q1] ratings 5, 4, 4 give 4.3 (43 tenths, BigInt half-up); output follows input order; zero writes', async () => {
    await people();
    for (const [n, r] of [['a', 5], ['b', 4], ['c', 4]] as const) {
      await user(db, { id: id(n) });
      await review(db, { id: id(`r${n}`), reviewerId: id(n), targetUserId: id('tienda'), rating: r });
    }
    const { aggregates } = await setup().rep.getAggregates({ sellerIds: [id('julian'), id('tienda')] });
    expect(aggregates.map((a) => [a.sellerId, a.averageTenths, a.count])).toEqual([[id('julian'), null, 0], [id('tienda'), 43, 3]]);
    explainAssert(aggregates[0]!.decision, { rule: 'FR-REP-3', inputs: { count: 0 } });
  });

  it('[REP-3.P1] duplicate ids are RequestValidationFailed (Solu-1 review E-22)', async () => {
    await people();
    expect(codeOf(await caught(() => setup().rep.getAggregates({ sellerIds: [id('tienda'), id('tienda')] })))).toBe('RequestValidationFailed');
  });

  it('[REP-3.I1] a hidden review contributes to neither count nor sum (AD-12, AD-REP-2 rule 1)', async () => {
    await people();
    await review(db, { id: id('r1'), reviewerId: id('valentina'), targetUserId: id('tienda'), rating: 5 });
    await user(db, { id: id('troll') });
    await review(db, { id: id('r2'), reviewerId: id('troll'), targetUserId: id('tienda'), rating: 1, hiddenAt: at(-HOUR) });
    const { aggregates } = await setup().rep.getAggregates({ sellerIds: [id('tienda')] });
    expect(aggregates[0]).toMatchObject({ averageTenths: 50, count: 1 });
  });

  it('[REP-3.MEC] a hide racing a new post, 100 repetitions: every later read counts exactly the visible committed set (NFR-REP-1)', async () => {
    await people();
    const local: Record<string, Kind> = { ...targets };
    const { rep } = setup({ targets: local });
    for (let i = 0; i < 100; i++) {
      const target = id(`t${i}`);
      await user(db, { id: target, sellerTrack: 'individual' });
      local[target] = 'individual';
      await review(db, { id: id(`old${i}`), reviewerId: id('julian'), targetUserId: target, targetKind: 'individual', rating: 1 });
      const [hid, wrote] = await Promise.allSettled([
        rep.hideReview(hide(id(`old${i}`))),
        rep.writeReview(write({ targetUserId: target, text: `Nueva ${i}` })),
      ]);
      expect([hid, wrote].filter((s) => s.status === 'rejected').map((s) => codeOf((s as PromiseRejectedResult).reason))).toEqual([]);
      const { aggregates } = await rep.getAggregates({ sellerIds: [target] });
      expect(aggregates[0]).toMatchObject({ count: 1, averageTenths: 50 });
    }
  });
});

describe('S-FR-REP-6 — admin review search and moderation log (contracts.md §15)', () => {
  it('[S-FR-REP-6.h] the review log reads newest first by (at desc, id), the order the 11.4 RSC merges with the listing log', async () => {
    await people();
    await review(db, { id: id('r1'), reviewerId: id('valentina'), targetUserId: id('tienda') });
    const log = (logId: string, action: 'hide' | 'unhide', createdAt: string) =>
      ins(db, 'ReviewModerationLog', { id: logId, reviewId: id('r1'), action, reasonCode: 'Spam', note: null, adminId: id('admin'), ratingSnapshot: 5, textSnapshot: 'Excelente vendedor.', createdAt }, 'none');
    await log(id('l1'), 'hide', at(-3 * HOUR));
    await log(id('l2'), 'unhide', at(-2 * HOUR));
    await log(id('l3'), 'hide', at(-HOUR));
    const { rows: page } = await setup().rep.listReviewModerationLog({ adminId: id('admin'), cursor: null });
    expect(page.map((r) => [r.logId, r.action])).toEqual([[id('l3'), 'hide'], [id('l2'), 'unhide'], [id('l1'), 'hide']]);
  });

  it('[S-FR-REP-6.f] the query "100%" matches only the literal text: % and _ are escaped', async () => {
    await people();
    await user(db, { id: id('otro') });
    await review(db, { id: id('r1'), reviewerId: id('valentina'), targetUserId: id('tienda'), text: 'Precio 100% justo' });
    await review(db, { id: id('r2'), reviewerId: id('otro'), targetUserId: id('tienda'), text: 'Precio 1000 justo' });
    const { rows: found } = await setup().rep.searchReviews({ adminId: id('admin'), query: '100%', cursor: null });
    expect(found.map((r) => r.reviewId)).toEqual([id('r1')]);
  });
});

describe('S-FR-REP-7 — profile (contracts.md §15)', () => {
  it('[S-FR-REP-7.h] a hidden review is neither listed nor counted; aggregate and page agree', async () => {
    await people();
    await review(db, { id: id('r1'), reviewerId: id('valentina'), targetUserId: id('tienda'), rating: 4 });
    await user(db, { id: id('troll') });
    await review(db, { id: id('r2'), reviewerId: id('troll'), targetUserId: id('tienda'), rating: 1, hiddenAt: at(-HOUR) });
    const profile = await setup({ targets }).rep.getProfile({ userId: id('tienda'), page: 1 });
    expect(profile.reviews.map((r) => r.reviewId)).toEqual([id('r1')]);
    expect(profile.aggregate).toMatchObject({ count: 1, averageTenths: 40 });
    expect(profile.hasMore).toBe(false);
  });

  // Story 13.5 (Flow A, decision log Impl-2 #18, R-29): AD-REP-2 rule 2 under hides and unhides committing mid-read.
  it('[S-FR-REP-7.C1] 100 rounds of profile reads racing hides and unhides of the seller’s reviews: every read’s aggregate counts and averages exactly the reviews it lists', async () => {
    await people();
    // Given: 12 visible reviews of the business (≤ 20, so the first page lists every visible one).
    for (let i = 0; i < 12; i++) {
      await user(db, { id: id(`rv${i}`) });
      await review(db, { id: id(`rr${i}`), reviewerId: id(`rv${i}`), targetUserId: id('tienda'), rating: 1 + (i % 5) });
    }
    const { rep } = setup({ targets });
    type Profile = Awaited<ReturnType<typeof rep.getProfile>>;
    for (let round = 0; round < 100; round++) {
      // Each round: four admins each hide, then unhide, one review while four readers each read the profile three times.
      const moderated = [0, 3, 6, 9].map((k) => id(`rr${(round + k) % 12}`));
      const { fulfilled, rejected } = await race(8, async (i): Promise<Profile[]> => {
        if (i >= 4) {
          await rep.hideReview(hide(moderated[i - 4]!));
          await rep.unhideReview(hide(moderated[i - 4]!));
          return [];
        }
        const reads: Profile[] = [];
        for (let k = 0; k < 3; k++) reads.push(await rep.getProfile({ userId: id('tienda'), page: 1 }));
        return reads;
      });
      if (rejected.length > 0) throw rejected[0];
      const profiles = fulfilled.flat();
      expect(profiles).toHaveLength(12);
      for (const p of profiles) {
        const sum = p.reviews.reduce((n, r) => n + r.rating, 0);
        expect(p.hasMore).toBe(false);
        expect(p.aggregate.count).toBe(p.reviews.length);
        expect(p.aggregate.averageTenths).toBe(p.reviews.length === 0 ? null : Math.floor((20 * sum + p.reviews.length) / (2 * p.reviews.length)));
      }
    }
  });

  it('[S-FR-REP-7.f] an unknown user is TargetNotFound (404)', async () => {
    await people();
    const error = await caught(() => setup({ targets }).rep.getProfile({ userId: id('ghost'), page: 1 }));
    expect(codeOf(error)).toBe('TargetNotFound');
    expect(httpOf(error)).toBe(404);
  });
});
