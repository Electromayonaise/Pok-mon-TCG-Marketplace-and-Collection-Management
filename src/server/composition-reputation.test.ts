// The production composition over HTTP (decision log Impl-1 #24): reputation.
// Covers REP-1, REP-1.edit, REP-1.check, REP-2, REP-2.unhide and S-FR-REP-5, -6, -7 with the merged moderation log, all through serveTrpc as app/api/trpc/[trpc]/route.ts calls it.
// One of the composition-*.test.ts files split from composition.test.ts (test review HIGH-1); the harness,
// test-support/http-app.ts, composes a fresh app per test at T0 (HIGH-8).
import { describe, expect, it } from 'vitest';
import { useComposedApp } from '../../test-support/http-app.js';
import { admin, at, HOUR, id, individualSeller, order, purchasableListing, review, rows, user } from '../../test-support/solu2/fixtures.js';
import type { ListingModerationLogRow } from '../modules/listings/index.js';
import type { ReviewModerationLogRow } from '../modules/reviews/index.js';
import { mergeModerationLogs } from './moderation-log.js';

const { db, clock, signIn, post, get } = useComposedApp();

describe('reputation over HTTP (REP-1, REP-1.edit, REP-1.check; Story 13.1)', () => {
  it('a buyer whose order closed reads eligible, reviews the business through the real identity and orders, then edits; a second write is DuplicateReview 409', async () => {
    await purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity: 2 });
    await user(db, { id: id('camila') });
    await order(db, { id: id('o1'), buyerId: id('camila'), businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), paidAt: at(-3 * HOUR), sellerAt: at(-2 * HOUR), itemAt: at(-HOUR) });
    const camila = await signIn(id('camila'));
    const eligible = await get('reputation.eligibility', { targetUserId: id('andres') }, camila);
    expect(eligible.json.result?.data).toMatchObject({ eligible: true, existingReview: null, decision: { reasonCode: 'ReviewEligible' } });
    const written = await post('reputation.write', { targetUserId: id('andres'), rating: 5, text: 'Todo llegó bien.' }, camila);
    expect(written.json.result?.data).toMatchObject({ targetKind: 'business', purchaseVerified: true, decision: { reasonCode: 'ReviewWritten' } });
    const reviewId = written.json.result?.data.reviewId as string;
    const again = await post('reputation.write', { targetUserId: id('andres'), rating: 1, text: '' }, camila);
    expect([again.status, again.json.error?.code]).toEqual([409, 'DuplicateReview']);
    expect((await post('reputation.edit', { reviewId, rating: 4, text: 'Bien, algo lento.' }, camila)).json.result?.data).toMatchObject({ reviewId, decision: { reasonCode: 'ReviewEdited' } });
    const after = await get('reputation.eligibility', { targetUserId: id('andres') }, camila);
    expect(after.json.result?.data).toMatchObject({ eligible: false, existingReview: { reviewId, rating: 4, hidden: false }, decision: { reasonCode: 'DuplicateReview' } });
    const self = await post('reputation.write', { targetUserId: id('camila'), rating: 5, text: '' }, camila);
    expect([self.status, self.json.error?.code]).toEqual([404, 'TargetNotFound']);
  });
});

describe('review moderation over HTTP (REP-2, REP-2.unhide; Story 13.2)', () => {
  it('an admin hides and unhides a review; a non-admin is AdminOnly 403 and a short Other note is RequestValidationFailed 400', async () => {
    await user(db, { id: id('camila') });
    await user(db, { id: id('julian'), sellerTrack: 'individual' });
    await admin(db);
    await review(db, { id: id('r1'), reviewerId: id('camila'), targetUserId: id('julian'), targetKind: 'individual', rating: 1, text: 'Insulto.' });
    const adminCookie = await signIn(id('admin'));
    const denied = await post('reputation.admin.hide', { reviewId: id('r1'), reasonCode: 'Harassment', note: null }, await signIn(id('camila')));
    expect([denied.status, denied.json.error?.code]).toEqual([403, 'AdminOnly']);
    const short = await post('reputation.admin.hide', { reviewId: id('r1'), reasonCode: 'Other', note: 'corto' }, adminCookie);
    expect([short.status, short.json.error?.code]).toEqual([400, 'RequestValidationFailed']);
    expect((await post('reputation.admin.hide', { reviewId: id('r1'), reasonCode: 'Harassment', note: null }, adminCookie)).json.result?.data).toMatchObject({ decision: { outcome: 'hidden', reasonCode: 'ReviewHidden' } });
    expect((await post('reputation.admin.unhide', { reviewId: id('r1'), reasonCode: 'Other', note: 'Revisado: no infringe.' }, adminCookie)).json.result?.data).toMatchObject({ decision: { reasonCode: 'ReviewUnhidden' } });
    expect(await rows(db, 'ReviewModerationLog')).toHaveLength(2);
  });
});

describe('profiles, listing moderation and the merged audit over HTTP (S-FR-REP-5, -6, -7; Story 13.5)', () => {
  it('a visitor with no session reads a profile without the hidden review; an admin hides a listing and the merged audit interleaves both logs by time', async () => {
    await user(db, { id: id('camila') });
    await user(db, { id: id('troll') });
    await individualSeller(db, id('julian'));
    await admin(db);
    await review(db, { id: id('r1'), reviewerId: id('camila'), targetUserId: id('julian'), targetKind: 'individual', rating: 4, text: 'Puntual.' });
    await review(db, { id: id('r2'), reviewerId: id('troll'), targetUserId: id('julian'), targetKind: 'individual', rating: 1, text: 'Insulto.' });
    await purchasableListing(db, { businessId: id('andres'), listingId: id('lchar'), unitId: id('uchar'), entryId: id('char'), quantity: 1 });
    const adminCookie = await signIn(id('admin'));
    // The review hide, then a minute later the listing hide, then the review unhide: three instants, two logs.
    expect((await post('reputation.admin.hide', { reviewId: id('r2'), reasonCode: 'Harassment', note: null }, adminCookie)).status).toBe(200);
    clock.advance(60_000);
    const denied = await post('inventory.admin.hide', { listingId: id('lchar'), reasonCode: 'Counterfeit', note: null }, await signIn(id('camila')));
    expect([denied.status, denied.json.error?.code]).toEqual([403, 'AdminOnly']);
    const hid = await post('inventory.admin.hide', { listingId: id('lchar'), reasonCode: 'Counterfeit', note: null }, adminCookie);
    expect(hid.json.result?.data).toMatchObject({ decision: { outcome: 'hidden', reasonCode: 'ListingHiddenByAdmin' } });
    expect((await get('inventory.get', { listingId: id('lchar') }, '')).json.error?.code).toBe('ListingNotFound');
    const unknown = await post('inventory.admin.unhide', { listingId: id('ghost'), reasonCode: 'Counterfeit', note: null }, adminCookie);
    expect([unknown.status, unknown.json.error?.code]).toEqual([404, 'ListingNotFound']);

    const profile = await get('reputation.profile', { userId: id('julian'), page: 1 }, '');
    expect(profile.status).toBe(200);
    expect(profile.json.result?.data).toMatchObject({ seller: { userId: id('julian'), kind: 'individual' }, aggregate: { count: 1, averageTenths: 40 }, reviews: [{ reviewId: id('r1') }], hasMore: false });
    const missing = await get('reputation.profile', { userId: id('camila'), page: 1 }, '');
    expect([missing.status, missing.json.error?.code]).toEqual([404, 'TargetNotFound']);
    const found = await get('reputation.admin.search', { query: 'insulto', cursor: null }, adminCookie);
    expect(found.json.result?.data).toMatchObject({ rows: [{ reviewId: id('r2'), hidden: true }], nextCursor: null });

    clock.advance(60_000);
    expect((await post('reputation.admin.unhide', { reviewId: id('r2'), reasonCode: 'Other', note: 'Revisado: no infringe.' }, adminCookie)).status).toBe(200);
    const reviewLog = (await get('reputation.admin.log', { cursor: null }, adminCookie)).json.result?.data as unknown as { rows: ReviewModerationLogRow[] };
    const listingLog = (await get('inventory.admin.log', { cursor: null }, adminCookie)).json.result?.data as unknown as { rows: ListingModerationLogRow[] };
    expect(mergeModerationLogs(reviewLog.rows, listingLog.rows).map((e) => [e.kind, e.row.action])).toEqual([['review', 'unhide'], ['listing', 'hide'], ['review', 'hide']]);
  });
});
