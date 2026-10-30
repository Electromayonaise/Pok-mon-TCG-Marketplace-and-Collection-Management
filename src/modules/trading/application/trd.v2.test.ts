// TrdServiceV2 against Postgres with the real listings neighbour: the edges the ATDD tests leave out — the S-FR-TRD-1
// refusals with zero writes, the proposer's own expired offer materialized before a new one, reject and withdraw by
// the wrong party, and the paged "my trades" list.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../../test-support/db.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { at, catalogEntry, HOUR, id, individualSeller, listing, rows, tradeOffer, unit, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { realTradeListings } from '../../../../test-support/solu2/services.js';
import type { TradeTermsDTO } from '../dto/trd.v2.dto.js';
import { TrdServiceV2 } from './trd.v2.js';

const db = useTestDatabase();

function trading() {
  const w = wiring(db);
  return new TrdServiceV2({ ...w, listings: realTradeListings(w) });
}
async function scene(openToTrade = true): Promise<void> {
  await individualSeller(db, id('valentina'));
  await user(db, { id: id('julian') });
  await user(db, { id: id('camila') });
  await catalogEntry(db, id('char'));
  await catalogEntry(db, id('etb'), { kind: 'sealedProduct' });
  await unit(db, { id: id('uv'), sellerId: id('valentina'), catalogEntryId: id('char'), quantity: 1 });
  await listing(db, { id: id('lv'), sellerId: id('valentina'), unitId: id('uv'), sellerKind: 'individual', openToTrade });
}
const terms = (o: Partial<TradeTermsDTO> = {}): TradeTermsDTO => ({ offeredItems: [{ itemRef: id('char'), condition: 'NM', qty: 1 }], cashCop: 0, requestedQty: 1, ...o });
const make = (o: { proposerId?: string; terms?: TradeTermsDTO } = {}) => trading().makeOffer({ listingId: id('lv'), terms: o.terms ?? terms(), proposerId: o.proposerId ?? id('julian') });

describe('TrdServiceV2.makeOffer (S-FR-TRD-1) with the real listings', () => {
  it('refuses a self-trade, a listing closed to trade, empty or malformed terms and an unknown or ill-fitting item, writing nothing', async () => {
    await scene();
    expect(codeOf(await caught(() => make({ proposerId: id('valentina') })))).toBe('SelfTradeNotAllowed');
    expect(codeOf(await caught(() => make({ terms: terms({ offeredItems: [], cashCop: 0 }) })))).toBe('EmptyTradeOffer');
    expect(codeOf(await caught(() => make({ terms: terms({ cashCop: -1 }) })))).toBe('RequestValidationFailed');
    expect(codeOf(await caught(() => make({ terms: terms({ offeredItems: [{ itemRef: id('ghost'), condition: 'NM', qty: 1 }] }) })))).toBe('InvalidItemRef');
    const sealed = await caught(() => make({ terms: terms({ offeredItems: [{ itemRef: id('etb'), condition: 'NM', qty: 1 }] }) }));
    expect([codeOf(sealed), citedInputs(sealed)]).toEqual(['InvalidItemRef', { itemRef: id('etb'), kind: 'sealedProduct', condition: 'NM' }]);
    await db.query(`UPDATE "Listing" SET "openToTrade" = false`);
    expect(codeOf(await caught(() => make()))).toBe('ListingNotOpenToTrade');
    expect(await rows(db, 'TradeOffer')).toHaveLength(0);
    expect(await rows(db, 'audit_events', `module = 'trading'`)).toHaveLength(0);
  });

  it('a cash-only offer opens; the proposer\'s own expired offer is materialized first, with a system audit row', async () => {
    await scene();
    await tradeOffer(db, { id: id('old'), listingId: id('lv'), sellerId: id('valentina'), proposerId: id('julian'), expiresAt: at(-HOUR) });
    const result = await make({ terms: terms({ offeredItems: [], cashCop: 20_000 }) });
    expect(result).toMatchObject({ status: 'Open', turn: 'seller', decision: { reasonCode: 'TradeOfferMade' } });
    expect((await rows(db, 'TradeOffer', 'id = $1', [id('old')]))[0]).toMatchObject({ status: 'Expired' });
    expect((await rows(db, 'audit_events', `module = 'trading'`)).map((r) => [r.action, r.actorKind])).toEqual(
      expect.arrayContaining([['trading.offer.expired', 'system'], ['trading.offer.made', 'user']]),
    );
  });
});

describe('TrdServiceV2.resolveOffer (S-FR-TRD-2w)', () => {
  it('the seller rejects on her turn; she cannot withdraw, the proposer cannot reject out of turn, and a third party sees nothing', async () => {
    await scene();
    const { offerId } = await make();
    const trd = trading();
    expect(codeOf(await caught(() => trd.resolveOffer({ offerId, expectedVersion: 0, actorId: id('valentina'), action: 'withdraw' })))).toBe('NotYourTurn');
    expect(codeOf(await caught(() => trd.resolveOffer({ offerId, expectedVersion: 0, actorId: id('julian'), action: 'reject' })))).toBe('NotYourTurn');
    expect(codeOf(await caught(() => trd.resolveOffer({ offerId, expectedVersion: 0, actorId: id('camila'), action: 'reject' })))).toBe('TradeOfferNotVisibleToCaller');
    expect(await trd.resolveOffer({ offerId, expectedVersion: 0, actorId: id('valentina'), action: 'reject' })).toMatchObject({ status: 'Rejected', decision: { reasonCode: 'TradeOfferRejected' } });
    expect((await trd.getOffer({ offerId, actorId: id('julian') })).rounds.map((r) => [r.round, r.actor, r.action])).toEqual([[1, 'proposer', 'offer'], [2, 'seller', 'reject']]);
  });
});

describe('TrdServiceV2.listMyOffers (S-FR-TRD-3.mine)', () => {
  it('pages 20 at a time by side, and filters on the derived status', async () => {
    await scene();
    for (let k = 0; k < 21; k++) await tradeOffer(db, { id: id(`w${k}`), listingId: id('lv'), sellerId: id('valentina'), proposerId: id('julian'), status: 'Withdrawn' });
    await tradeOffer(db, { id: id('live'), listingId: id('lv'), sellerId: id('valentina'), proposerId: id('camila'), expiresAt: at(-HOUR) });
    const trd = trading();
    const first = await trd.listMyOffers({ actorId: id('julian'), side: 'sent', cursor: null });
    expect(first.offers).toHaveLength(20);
    const second = await trd.listMyOffers({ actorId: id('julian'), side: 'sent', cursor: first.nextCursor });
    expect([second.offers.length, second.nextCursor]).toEqual([1, null]);
    expect(new Set([...first.offers, ...second.offers].map((o) => o.offerId)).size).toBe(21);
    expect((await trd.listMyOffers({ actorId: id('julian'), side: 'received', cursor: null })).offers).toEqual([]);
    expect((await trd.listMyOffers({ actorId: id('valentina'), side: 'received', status: 'Expired', cursor: null })).offers.map((o) => o.offerId)).toEqual([id('live')]);
    expect(codeOf(await caught(() => trd.listMyOffers({ actorId: id('julian'), side: 'any', cursor: 'nope' })))).toBe('RequestValidationFailed');
  });
});
