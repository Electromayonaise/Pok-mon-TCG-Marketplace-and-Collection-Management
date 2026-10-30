// RepServiceV2 against Postgres with the real identity and orders: the edges the ATDD tests leave out — a Pending business,
// a paid order that is later closed, the text checks of decision log Impl-1 #38, a foreign edit, and the eligibility of an
// individual seller and of a pair whose review is hidden.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../../test-support/db.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { at, business, explainAssert, fake, HOUR, id, order, purchasableListing, review, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { IdnServiceV2 } from '../../identity/index.js';
import { OrdServiceV2, type IdentityForOrd, type ListingsForOrd } from '../../orders/index.js';
import type { WriteReviewRequest } from '../dto/rep.v2.dto.js';
import { RepServiceV2 } from './rep.v2.js';

const db = useTestDatabase();

/** REP composed as the composition root binds it: the real identity and orders. */
function rep() {
  const w = wiring(db);
  const idn = new IdnServiceV2(w);
  const ord = new OrdServiceV2({ ...w, identity: fake<IdentityForOrd>('identity', {}), listings: fake<ListingsForOrd>('listings', {}) });
  return {
    w,
    rep: new RepServiceV2({
      ...w,
      identity: { getReviewTarget: (i) => idn.getReviewTarget(i), getDisplayNames: (i) => idn.getDisplayNames(i) },
      orders: { hasClosedPurchase: (i) => ord.hasClosedPurchase(i) },
    }),
  };
}
const write = (o: Partial<WriteReviewRequest> = {}): WriteReviewRequest => ({ reviewerId: id('camila'), targetUserId: id('andres'), rating: 5, text: 'Muy bien.', ...o });
const orderOf = (o: { paidAt?: string; sellerAt?: string; itemAt?: string } = {}) =>
  order(db, { id: id('o1'), buyerId: id('camila'), businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), ...o });

describe('writeReview with the real neighbours (REP-1 P3–P4, AD-REP-1)', () => {
  it('a Pending business is TargetNotFound with the same body as an unknown id, and nothing is written', async () => {
    await user(db, { id: id('camila') });
    await business(db, id('andres'), 'Pending');
    const pending = await caught(() => rep().rep.writeReview(write()));
    const unknown = await caught(() => rep().rep.writeReview(write({ targetUserId: id('ghost') })));
    expect([codeOf(pending), citedInputs(pending)]).toEqual(['TargetNotFound', { reviewable: false }]);
    expect([codeOf(unknown), citedInputs(unknown)]).toEqual(['TargetNotFound', { reviewable: false }]);
    expect(await rows(db, 'Review')).toEqual([]);
  });

  it('a paid and confirmed order is NotVerifiedPurchaser citing PaymentConfirmed; once the buyer closes it the review is verified', async () => {
    await purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity: 2 });
    await user(db, { id: id('camila') });
    await orderOf({ paidAt: at(-2 * HOUR), sellerAt: at(-HOUR) });
    const refused = await caught(() => rep().rep.writeReview(write()));
    expect([codeOf(refused), citedInputs(refused)]).toEqual(['NotVerifiedPurchaser', { latestState: 'PaymentConfirmed' }]);
    await db.query(`UPDATE "Order" SET "buyerItemReceivedConfirmedAt" = $2 WHERE id = $1`, [id('o1'), at(-HOUR / 2)]);
    expect(await rep().rep.writeReview(write())).toMatchObject({ targetKind: 'business', purchaseVerified: true });
  });

  it('a buyer with no order at all is NotVerifiedPurchaser citing latestState null', async () => {
    await business(db, id('andres'), 'Approved');
    await user(db, { id: id('camila') });
    expect(citedInputs(await caught(() => rep().rep.writeReview(write())))).toEqual({ latestState: null });
  });
});

describe('review text (contracts.md §0.3, decision log Impl-1 #38)', () => {
  it('an empty text and a text of spaces are stored as written; a NUL and 1,001 characters are RequestValidationFailed before any read', async () => {
    for (const u of ['camila', 'valentina', 'julian']) await user(db, { id: id(u) });
    await user(db, { id: id('maria'), sellerTrack: 'individual' });
    const { rep: r } = rep();
    await r.writeReview(write({ reviewerId: id('camila'), targetUserId: id('maria'), text: '' }));
    await r.writeReview(write({ reviewerId: id('valentina'), targetUserId: id('maria'), text: '   ' }));
    expect((await rows<{ text: string }>(db, 'Review', 'TRUE ORDER BY text DESC')).map((x) => x.text)).toEqual(['   ', '']);
    for (const text of ['Hola\u0000', 'a'.repeat(1001)]) {
      expect(codeOf(await caught(() => r.writeReview(write({ reviewerId: id('julian'), targetUserId: id('ghost'), text }))))).toBe('RequestValidationFailed');
    }
    const [mine] = await rows<{ id: string }>(db, 'Review', `"reviewerId" = $1`, [id('camila')]);
    expect(codeOf(await caught(() => r.editReview({ reviewerId: id('camila'), reviewId: mine!.id, rating: 3, text: 'x\u0000' })))).toBe('RequestValidationFailed');
  });
});

describe('editReview and getReviewEligibility (REP-1.edit, REP-1.check)', () => {
  it('another user editing a review is ReviewNotFound, and the review is unchanged', async () => {
    await user(db, { id: id('camila') });
    await user(db, { id: id('julian'), sellerTrack: 'individual' });
    await review(db, { id: id('r1'), reviewerId: id('camila'), targetUserId: id('julian'), targetKind: 'individual', rating: 3, text: 'Regular.' });
    const error = await caught(() => rep().rep.editReview({ reviewerId: id('julian'), reviewId: id('r1'), rating: 5, text: 'Me la pongo yo.' }));
    expect(codeOf(error)).toBe('ReviewNotFound');
    expect(await rows(db, 'Review')).toMatchObject([{ rating: 3, text: 'Regular.', editedAt: null, version: 0 }]);
    expect(await rows(db, 'audit_events')).toEqual([]);
  });

  it('an individual seller is eligible under FR-REP-2; a pair whose review is hidden reports it, with DuplicateReview', async () => {
    await user(db, { id: id('camila') });
    await user(db, { id: id('julian'), sellerTrack: 'individual' });
    const { w, rep: r } = rep();
    const open = await r.getReviewEligibility({ reviewerId: id('camila'), targetUserId: id('julian') });
    expect(open).toMatchObject({ eligible: true, existingReview: null });
    explainAssert(open.decision, { outcome: 'allowed', rule: 'FR-REP-2', inputs: { targetKind: 'individual', purchaseVerified: false }, occurredAt: w.clock.iso() });
    await review(db, { id: id('r1'), reviewerId: id('camila'), targetUserId: id('julian'), targetKind: 'individual', text: 'Oculta.', hiddenAt: at(-HOUR) });
    const hidden = await r.getReviewEligibility({ reviewerId: id('camila'), targetUserId: id('julian') });
    expect(hidden).toMatchObject({ eligible: false, existingReview: { reviewId: id('r1'), text: 'Oculta.', hidden: true } });
    explainAssert(hidden.decision, { code: 'DuplicateReview', outcome: 'rejected', inputs: { reviewId: id('r1') } });
    expect(codeOf(await caught(() => r.getReviewEligibility({ reviewerId: id('camila'), targetUserId: id('camila') })))).toBe('TargetNotFound');
  });
});

describe('hideReview and unhideReview (REP-2, AD-REP-3)', () => {
  const hide = (o: Partial<{ reasonCode: 'Spam' | 'Other' | 'PersonalData'; note: string | null; reviewId: string }> = {}) =>
    ({ reviewId: o.reviewId ?? id('r1'), reasonCode: o.reasonCode ?? 'Spam', note: o.note === undefined ? null : o.note, adminId: id('admin') });

  async function aReview(): Promise<void> {
    await user(db, { id: id('camila') });
    await user(db, { id: id('julian'), sellerTrack: 'individual' });
    await user(db, { id: id('admin'), isAdmin: true });
    await review(db, { id: id('r1'), reviewerId: id('camila'), targetUserId: id('julian'), targetKind: 'individual', rating: 2, text: 'Texto original.' });
  }

  it('P2: Other with a null note or a note of spaces, a 501-character note and a NUL note are RequestValidationFailed, with zero writes', async () => {
    await aReview();
    const { rep: r } = rep();
    for (const o of [{ reasonCode: 'Other' as const, note: null }, { reasonCode: 'Other' as const, note: ' '.repeat(12) }, { note: 'x'.repeat(501) }, { reasonCode: 'PersonalData' as const, note: 'dato\u0000' }]) {
      expect(codeOf(await caught(() => r.hideReview(hide(o))))).toBe('RequestValidationFailed');
      expect(codeOf(await caught(() => r.unhideReview(hide(o))))).toBe('RequestValidationFailed');
    }
    expect(await rows(db, 'Review')).toMatchObject([{ hiddenAt: null, version: 0 }]);
    expect(await rows(db, 'ReviewModerationLog')).toEqual([]);
  });

  it('hide, then an edit is refused, then unhide restores the identical text; two log rows and two admin audit rows (S-14, EC-35)', async () => {
    await aReview();
    const { w, rep: r } = rep();
    await r.hideReview(hide({ reasonCode: 'Other', note: 'Contiene un teléfono.' }));
    expect(codeOf(await caught(() => r.editReview({ reviewerId: id('camila'), reviewId: id('r1'), rating: 5, text: 'Otra cosa.' })))).toBe('ReviewNotFound');
    w.clock.advance(HOUR);
    const unhid = await r.unhideReview(hide({ reasonCode: 'Spam' }));
    explainAssert(unhid.decision, { outcome: 'allowed', rule: 'FR-REP-4', inputs: { reviewId: id('r1'), reasonCode: 'Spam' } });
    expect(await rows(db, 'Review')).toMatchObject([{ text: 'Texto original.', rating: 2, hiddenAt: null, version: 2 }]);
    const log = await rows(db, 'ReviewModerationLog', 'TRUE ORDER BY "createdAt"');
    expect(log).toMatchObject([
      { action: 'hide', reasonCode: 'Other', note: 'Contiene un teléfono.', ratingSnapshot: 2, textSnapshot: 'Texto original.' },
      { action: 'unhide', reasonCode: 'Spam', note: null, ratingSnapshot: 2, textSnapshot: 'Texto original.' },
    ]);
    expect((await rows<{ action: string; actorKind: string }>(db, 'audit_events', `module = 'reviews' ORDER BY "createdAt"`)).map((a) => [a.action, a.actorKind]))
      .toEqual([['reviews.review.hidden', 'admin'], ['reviews.review.unhidden', 'admin']]);
  });

  it('an already-hidden review cites its hide, and unhiding an unknown id is ReviewNotFound', async () => {
    await aReview();
    const { w, rep: r } = rep();
    await r.hideReview(hide());
    const first = w.clock.iso();
    w.clock.advance(HOUR);
    explainAssert((await r.hideReview(hide({ reasonCode: 'PersonalData' }))).decision, { code: 'ReviewAlreadyHidden', outcome: 'allowedWithNotice', inputs: { hiddenAt: first, hiddenBy: id('admin') } });
    expect(await rows(db, 'Review')).toMatchObject([{ hiddenReason: 'Spam', version: 1 }]);
    expect(codeOf(await caught(() => r.unhideReview(hide({ reviewId: id('ghost') }))))).toBe('ReviewNotFound');
  });
});

describe('getAggregates (REP-3 P1, Q2, Q4)', () => {
  it('500 ids are read in one call and in input order; 0 and 501 ids are RequestValidationFailed', async () => {
    await user(db, { id: id('camila') });
    await user(db, { id: id('julian'), sellerTrack: 'individual' });
    await review(db, { id: id('r1'), reviewerId: id('camila'), targetUserId: id('julian'), targetKind: 'individual', rating: 4 });
    const { w, rep: r } = rep();
    const ids = [...Array.from({ length: 499 }, (_, k) => id(`nadie${k}`)), id('julian')];
    const { aggregates } = await r.getAggregates({ sellerIds: ids });
    expect(aggregates.map((a) => a.sellerId)).toEqual(ids);
    expect(aggregates.at(-1)).toMatchObject({ averageTenths: 40, count: 1 });
    explainAssert(aggregates.at(-1)!.decision, { code: 'SellerRated', rule: 'FR-REP-3', inputs: { count: 1, averageTenths: 40 }, occurredAt: w.clock.iso() });
    explainAssert(aggregates[0]!.decision, { code: 'SellerNotYetReviewed', inputs: { count: 0 } });
    expect(codeOf(await caught(() => r.getAggregates({ sellerIds: [] })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => r.getAggregates({ sellerIds: [...ids, id('otro')] })))).toBe('RequestValidationFailed');
  });
});
