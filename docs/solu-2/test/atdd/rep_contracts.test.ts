// ATDD — REP (contracts.md §12, §15). Red phase: every test must fail with NotImplementedError.
// `canBuy` and `admin` (REP-1 P1, REP-2 P1) are procedure-builder checks, proven in sys › [SYS-8.R2].
import { describe, expect, it } from 'vitest';
import { RepServiceV2 } from '../../../../src/modules/reviews/index.js';
import type { IdentityForRep, OrdersForRep, WriteReviewRequest } from '../../../../src/modules/reviews/index.js';
import type { OrderStatus } from '../../../../src/modules/orders/index.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { admin, at, explainAssert, fake, HOUR, id, ins, review, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();

type Kind = 'business' | 'individual' | 'none';
/** Targets by user id; closed purchases keyed `${buyer}>${business}` with the latest order state. */
function setup(o: { targets?: Readonly<Record<string, Kind>>; purchases?: Record<string, OrderStatus>; targetCalls?: string[] } = {}) {
  const identity = fake<IdentityForRep>('identity', {
    getReviewTarget: async ({ userId }) => { o.targetCalls?.push(userId); const kind = o.targets?.[userId] ?? 'none'; return { kind, verified: kind !== 'none' }; },
    getDisplayNames: async ({ userIds }) => ({ names: userIds.map((u) => ({ userId: u, displayName: `Usuario ${u.slice(0, 4)}` })) }),
  });
  const orders = fake<OrdersForRep>('orders', {
    hasClosedPurchase: async ({ buyerId, businessId }) => { const s = o.purchases?.[`${buyerId}>${businessId}`] ?? null; return { closed: s === 'Closed', latestState: s }; },
  });
  const w = wiring(db);
  return { w, rep: new RepServiceV2({ ...w, identity, orders }) };
}
async function people(): Promise<void> {
  await user(db, { id: id('valentina') });
  await user(db, { id: id('tienda'), sellerTrack: 'business' });
  await user(db, { id: id('julian'), sellerTrack: 'individual' });
  await admin(db);
}
/** Frozen: a test that needs more targets copies it (review R-6). */
const targets: Readonly<Record<string, Kind>> = Object.freeze({ [id('tienda')]: 'business', [id('julian')]: 'individual' });
/** A writeReview request: valentina rates the business 5 unless the test says otherwise. */
const write = (o: Partial<WriteReviewRequest> = {}): WriteReviewRequest => ({ reviewerId: id('valentina'), targetUserId: id('tienda'), rating: 5, text: 'Excelente vendedor.', ...o });
const hide =(reviewId: string, o: { reasonCode?: 'Spam' | 'Other' | 'Harassment'; note?: string | null; adminId?: string } = {}) =>
  ({ reviewId, reasonCode: o.reasonCode ?? 'Spam', note: o.note ?? null, adminId: o.adminId ?? id('admin') });

describe('REP-1 — writeReview (contracts.md §12)', () => {
  it('[REP-1.Q1] a closed purchase lets the buyer review the business: one verified row, an audit row, no event', async () => {
    await people();
    const { w, rep } = setup({ targets, purchases: { [`${id('valentina')}>${id('tienda')}`]: 'Closed' } });
    const result = await rep.writeReview(write({ text: 'Envío rápido y bien empacado.' }));
    expect(result).toMatchObject({ targetKind: 'business', purchaseVerified: true });
    expect(await rows(db, 'Review', `id = $1`, [result.reviewId])).toMatchObject([{ reviewerId: id('valentina'), rating: 5, purchaseVerified: true, createdAt: new Date(w.clock.iso()) }]);
    expect(await rows(db, 'audit_events', `action = 'reviews.review.written'`)).toHaveLength(1);
    expect(await rows(db, 'OutboxEvent')).toEqual([]);
    explainAssert(result.decision, { rule: 'FR-REP-1', inputs: { targetKind: 'business', purchaseVerified: true } });
  });

  it('[REP-1.Q1i] an individual seller is reviewed without a purchase, and the row is not marked verified (FR-REP-2)', async () => {
    await people();
    const result = await setup({ targets }).rep.writeReview(write({ targetUserId: id('julian'), rating: 4, text: 'Puntual en el encuentro.' }));
    expect(result).toMatchObject({ targetKind: 'individual', purchaseVerified: false });
    explainAssert(result.decision, { rule: 'FR-REP-2' });
  });

  it('[REP-1.P2] a self-review is TargetNotFound (404) before any neighbour read, with zero writes', async () => {
    await people();
    const targetCalls: string[] = [];
    const error = await caught(() => setup({ targets, targetCalls }).rep.writeReview(write({ reviewerId: id('tienda'), text: '' })));
    expect(codeOf(error)).toBe('TargetNotFound');
    expect(httpOf(error)).toBe(404);
    expect(targetCalls).toEqual([]);
    expect(await rows(db, 'Review')).toEqual([]);
  });

  it('[REP-1.P3] a user who is neither an approved business nor a complete individual seller is TargetNotFound', async () => {
    await people();
    await user(db, { id: id('nadie') });
    expect(codeOf(await caught(() => setup({ targets }).rep.writeReview(write({ targetUserId: id('nadie'), rating: 3, text: '' }))))).toBe('TargetNotFound');
  });

  it('[REP-1.MEC] paying is not enough: with the order Paid but not closed the review is NotVerifiedPurchaser citing latestState, 100/100 (NFR-REP-1)', async () => {
    await people();
    const { rep } = setup({ targets, purchases: { [`${id('valentina')}>${id('tienda')}`]: 'Paid' } });
    const first = await caught(() => rep.writeReview(write({ text: 'Intento 0' })));
    expect(codeOf(first)).toBe('NotVerifiedPurchaser');
    expect(citedInputs(first)).toMatchObject({ latestState: 'Paid' });
    const codes = new Set<string>();
    for (let i = 1; i < 100; i++) codes.add(codeOf(await caught(() => rep.writeReview(write({ text: `Intento ${i}` })))));
    expect([...codes]).toEqual(['NotVerifiedPurchaser']);
    expect(await rows(db, 'Review')).toEqual([]);
  });

  it('[REP-1.I2] a double submit leaves one row and one DuplicateReview (409)', async () => {
    await people();
    const { rep } = setup({ targets });
    const outcome = await race(2, () => rep.writeReview(write({ targetUserId: id('julian'), text: 'Muy amable.' })));
    expect(outcome.rejected.map(codeOf).filter((c) => c !== 'DuplicateReview')).toEqual([]);
    expect(outcome.fulfilled).toHaveLength(1);
    expect(httpOf(outcome.rejected[0])).toBe(409);
    expect(await rows(db, 'Review')).toHaveLength(1);
  });

  it('[REP-1.I1] a business review is stored verified, and the CHECK refuses un-verifying it (AD-REP-1, AD-2)', async () => {
    await people();
    const { reviewId } = await setup({ targets, purchases: { [`${id('valentina')}>${id('tienda')}`]: 'Closed' } }).rep.writeReview(write({ text: '' }));
    await expect(db.query(`UPDATE "Review" SET "purchaseVerified" = false WHERE id = $1`, [reviewId])).rejects.toThrow(/review_business_iff_verified/);
  });
});

describe('REP-1 mirrors — edit and eligibility (contracts.md §15.12)', () => {
  it('[REP-1.edit.h] the reviewer edits a visible review: rating, text and editedAt change, one audit row', async () => {
    await people();
    await review(db, { id: id('r1'), reviewerId: id('valentina'), targetUserId: id('julian'), targetKind: 'individual', rating: 3, text: 'Regular.' });
    const { w, rep } = setup({ targets });
    w.clock.advance(HOUR);
    const result = await rep.editReview({ reviewerId: id('valentina'), reviewId: id('r1'), rating: 5, text: 'Resolvió todo, cambio mi nota.' });
    expect(result.editedAt).toBe(w.clock.iso());
    expect(await rows(db, 'Review', `id = $1`, [id('r1')])).toMatchObject([{ rating: 5, text: 'Resolvió todo, cambio mi nota.' }]);
  });

  it('[REP-1.edit.f] editing a hidden review is ReviewNotFound (404) and the text is unchanged (EC-32, AD-REP-1 rule 4)', async () => {
    await people();
    await review(db, { id: id('r1'), reviewerId: id('valentina'), targetUserId: id('julian'), targetKind: 'individual', text: 'Texto oculto.', hiddenAt: at(-HOUR) });
    const error = await caught(() => setup({ targets }).rep.editReview({ reviewerId: id('valentina'), reviewId: id('r1'), rating: 5, text: 'Intento de volver a mostrarla.' }));
    expect(codeOf(error)).toBe('ReviewNotFound');
    expect(httpOf(error)).toBe(404);
    expect(await rows(db, 'Review', `id = $1`, [id('r1')])).toMatchObject([{ text: 'Texto oculto.', editedAt: null }]);
  });

  it('[REP-1.check.h] a paid-but-not-closed buyer reads eligible=false citing latestState, with no insert', async () => {
    await people();
    const result = await setup({ targets, purchases: { [`${id('valentina')}>${id('tienda')}`]: 'PaymentConfirmed' } }).rep.getReviewEligibility({ reviewerId: id('valentina'), targetUserId: id('tienda') });
    expect(result).toMatchObject({ eligible: false, existingReview: null });
    explainAssert(result.decision, { code: 'NotVerifiedPurchaser', inputs: { latestState: 'PaymentConfirmed' } });
    expect(await rows(db, 'Review')).toEqual([]);
  });

  it('[REP-1.check.f] an unknown target is TargetNotFound', async () => {
    await people();
    expect(codeOf(await caught(() => setup({ targets }).rep.getReviewEligibility({ reviewerId: id('valentina'), targetUserId: id('ghost') })))).toBe('TargetNotFound');
  });
});

describe('REP-2 — hideReview (contracts.md §12)', () => {
  it('[REP-2.Q1] hiding writes hiddenAt/reason/by, one log row with rating and text snapshots, and an admin audit row', async () => {
    await people();
    await review(db, { id: id('r1'), reviewerId: id('valentina'), targetUserId: id('tienda'), rating: 1, text: 'Insulto con datos personales.' });
    const { w, rep } = setup({ targets });
    const result = await rep.hideReview(hide(id('r1'), { reasonCode: 'Harassment' }));
    explainAssert(result.decision, { outcome: 'hidden', rule: 'FR-REP-4', inputs: { reviewId: id('r1'), reasonCode: 'Harassment' } });
    expect(await rows(db, 'Review', `id = $1`, [id('r1')])).toMatchObject([{ hiddenAt: new Date(w.clock.iso()), hiddenReason: 'Harassment', hiddenBy: id('admin'), version: 1 }]);
    expect(await rows(db, 'ReviewModerationLog')).toMatchObject([{ reviewId: id('r1'), action: 'hide', ratingSnapshot: 1, textSnapshot: 'Insulto con datos personales.' }]);
    expect(await rows(db, 'audit_events', `action = 'reviews.review.hidden'`)).toMatchObject([{ actorKind: 'admin' }]);
  });

  it('[REP-2.P2] reason Other with a note under 10 characters is RequestValidationFailed (400), zero writes', async () => {
    await people();
    await review(db, { id: id('r1'), reviewerId: id('valentina'), targetUserId: id('tienda') });
    const error = await caught(() => setup({ targets }).rep.hideReview(hide(id('r1'), { reasonCode: 'Other', note: 'corto' })));
    expect(codeOf(error)).toBe('RequestValidationFailed');
    expect(httpOf(error)).toBe(400);
    expect(await rows(db, 'ReviewModerationLog')).toEqual([]);
  });

  it('[REP-2.P3] an unknown review is ReviewNotFound (404)', async () => {
    await people();
    expect(codeOf(await caught(() => setup().rep.hideReview(hide(id('ghost')))))).toBe('ReviewNotFound');
  });

  it('[REP-2.I2] two admins hiding at once: one hide, one log row, one explained no-op citing hiddenAt and hiddenBy (50 × 100)', async () => {
    await people();
    await admin(db, id('admin2'));
    await review(db, { id: id('r1'), reviewerId: id('valentina'), targetUserId: id('tienda') });
    const { rep } = setup({ targets });
    const outcome = await race(2, (i) => rep.hideReview(hide(id('r1'), { adminId: i === 0 ? id('admin') : id('admin2') })));
    expect(outcome.rejected.map(codeOf)).toEqual([]);
    expect(outcome.fulfilled.map((r) => (r.decision as { outcome: string }).outcome).sort()).toEqual(['allowedWithNotice', 'hidden']);
    expect(await rows(db, 'ReviewModerationLog')).toHaveLength(1);
  });

  it('[REP-2.I1] a hidden review is never deleted: the row remains and DELETE is refused (AD-12)', async () => {
    await people();
    await review(db, { id: id('r1'), reviewerId: id('valentina'), targetUserId: id('tienda') });
    await setup({ targets }).rep.hideReview(hide(id('r1')));
    expect(await rows(db, 'Review', `id = $1`, [id('r1')])).toHaveLength(1);
    const [grant] = await db.query<{ can: boolean }>(`SELECT has_table_privilege('tezg_app', '"Review"', 'DELETE') AS can`);
    expect(grant!.can).toBe(false);
  });

  it('[REP-2.unhide.h] unhiding clears the hide columns and logs action unhide with snapshots', async () => {
    await people();
    await review(db, { id: id('r1'), reviewerId: id('valentina'), targetUserId: id('tienda'), text: 'Se ocultó por error.', hiddenAt: at(-HOUR) });
    const result = await setup({ targets }).rep.unhideReview(hide(id('r1'), { reasonCode: 'Other', note: 'Revisado: no infringe la política.' }));
    explainAssert(result.decision, { rule: 'FR-REP-4' });
    expect(await rows(db, 'Review', `id = $1`, [id('r1')])).toMatchObject([{ hiddenAt: null, hiddenReason: null, hiddenBy: null }]);
    expect(await rows(db, 'ReviewModerationLog')).toMatchObject([{ action: 'unhide', textSnapshot: 'Se ocultó por error.' }]);
  });

  it('[REP-2.unhide.f] unhiding a visible review is an explained no-op with zero log rows', async () => {
    await people();
    await review(db, { id: id('r1'), reviewerId: id('valentina'), targetUserId: id('tienda') });
    const result = await setup({ targets }).rep.unhideReview(hide(id('r1')));
    explainAssert(result.decision, { outcome: 'allowedWithNotice', rule: 'FR-REP-4' });
    expect(await rows(db, 'ReviewModerationLog')).toEqual([]);
  });
});

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

  it('[S-FR-REP-7.f] an unknown user is TargetNotFound (404)', async () => {
    await people();
    const error = await caught(() => setup({ targets }).rep.getProfile({ userId: id('ghost'), page: 1 }));
    expect(codeOf(error)).toBe('TargetNotFound');
    expect(httpOf(error)).toBe(404);
  });
});
