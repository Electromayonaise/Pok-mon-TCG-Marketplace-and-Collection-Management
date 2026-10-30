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
