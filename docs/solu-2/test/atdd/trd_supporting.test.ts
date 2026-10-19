// ATDD — TRD supporting contracts, offered ports and read models (contracts.md §15). Split from trd_contracts.test.ts (test review R-7..R-12).
// The `listings` fake honours its port contract (P-INV.trade): a conditional decrement in the caller's tx.
import { describe, expect, it } from 'vitest';
import { TrdServiceV2 } from '../../../../src/modules/trading/index.js';
import type { ListingsForTrd, TradeTermsDTO } from '../../../../src/modules/trading/index.js';
import { DomainError } from '../../../../src/shared-kernel/errors.js';
import type { Tx } from '../../../../src/shared-kernel/ports.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { at, catalogEntry, DAY, fake, HOUR, id, listing, offerRound, rows, T0, tradeOffer, unit, user, wiring } from '../../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();

interface Calls { handoffs: unknown[]; released: unknown[] }
function setup(o: { calls?: Calls; handoffFails?: boolean; closedToTrade?: boolean } = {}) {
  const calls = o.calls ?? { handoffs: [], released: [] };
  const listings = fake<ListingsForTrd>('listings', {
    getTradeability: async () => {
      if (o.closedToTrade) throw new DomainError('ListingNotOpenToTrade', [{ rule: 'FR-TRD-4', inputs: {} }]);
      return { sellerId: id('valentina'), availability: 1, decision: { outcome: 'allowed', reasonCode: 'ListingNoLongerAvailable', humanMessage: 'Disponible.', citations: [{ rule: 'FR-TRD-4', inputs: {} }], occurredAt: T0 } };
    },
    reserveForTrade: async (tx: Tx, { listingId }) => {
      const r = await tx.query(`UPDATE "InventoryUnit" u SET quantity = quantity - 1 FROM "Listing" l WHERE l.id = $1 AND u.id = l."inventoryUnitId" AND u.quantity >= 1 RETURNING u.id`, [listingId]);
      if (r.rowCount === 0) throw new DomainError('InsufficientQuantity', [{ rule: 'FR-INV-3', inputs: { requested: 1, available: 0 } }]);
      const exhausted = await tx.query<{ id: string }>(`SELECT l.id FROM "Listing" l JOIN "InventoryUnit" u ON u.id = l."inventoryUnitId" WHERE u.quantity = 0`);
      return { reservationRef: { listingId, units: [{ inventoryUnitId: id('uv'), qty: 1 }] }, exhaustedListingIds: exhausted.rows.map((x) => x.id) };
    },
    releaseReservation: async (_tx, { reservationRef }) => { calls.released.push(reservationRef); return { releasedUnits: 1 }; },
    resolveItemRefs: async ({ refs }) => ({ resolved: refs.filter((r) => r !== id('ghost')).map((ref) => ({ ref, kind: 'card' as const })), missing: refs.filter((r) => r === id('ghost')) }),
    generateContactMessage: async (input) => {
      calls.handoffs.push(input);
      if (o.handoffFails) throw new DomainError('ListingNotFound', [{ rule: 'FR-MSG-1', inputs: {} }]);
      return { text: 'Hola Valentina', externalUrl: 'https://wa.me/573001234567?text=Hola', copyText: 'Hola Valentina', requesterDisplayName: 'Julián', decision: { outcome: 'allowed', reasonCode: 'ListingNoLongerAvailable', humanMessage: 'Listo.', citations: [{ rule: 'FR-MSG-1', inputs: {} }], occurredAt: T0 } };
    },
  });
  return { calls, trd: new TrdServiceV2({ ...wiring(db), listings }) };
}
/** Valentina's open-to-trade listing over one unit, and two proposers. */
async function scene(stock = 1): Promise<void> {
  await user(db, { id: id('valentina'), sellerTrack: 'individual' });
  await user(db, { id: id('julian') });
  await user(db, { id: id('camila') });
  await catalogEntry(db, id('char'));
  await unit(db, { id: id('uv'), sellerId: id('valentina'), catalogEntryId: id('char'), quantity: stock });
  await listing(db, { id: id('lv'), sellerId: id('valentina'), unitId: id('uv'), sellerKind: 'individual', openToTrade: true });
}
const offer = (offerId: string, proposer: string, o: Parameters<typeof tradeOffer>[1] extends infer T ? Partial<T> : never = {}) =>
  tradeOffer(db, { id: offerId, listingId: id('lv'), sellerId: id('valentina'), proposerId: id(proposer), ...o });
const terms = (cashCop: number): TradeTermsDTO => ({ offeredItems: [{ itemRef: id('char'), condition: 'NM', qty: 1 }], cashCop, requestedQty: 1 });

describe('Supporting TRD contracts (contracts.md §15, §15.12)', () => {
  it('[S-FR-TRD-1.h] an offer opens with the turn at the seller and round 1', async () => {
    await scene();
    const result = await setup().trd.makeOffer({ listingId: id('lv'), terms: terms(20_000), proposerId: id('julian') });
    expect(result).toMatchObject({ status: 'Open', turn: 'seller', version: 0, expiresAt: new Date(Date.parse(T0) + 7 * DAY).toISOString() });
    expect(await rows(db, 'TradeOfferRound')).toMatchObject([{ round: 1, action: 'offer', actor: 'proposer' }]);
  });

  it('[S-FR-TRD-1.f] a second live offer by the same proposer is DuplicateOpenOffer (409)', async () => {
    await scene();
    await offer(id('of1'), 'julian');
    expect(codeOf(await caught(() => setup().trd.makeOffer({ listingId: id('lv'), terms: terms(25_000), proposerId: id('julian') })))).toBe('DuplicateOpenOffer');
  });

  it('[S-FR-TRD-2w.h] the proposer withdraws an open offer', async () => {
    await scene();
    await offer(id('of1'), 'julian');
    expect((await setup().trd.resolveOffer({ offerId: id('of1'), expectedVersion: 0, actorId: id('julian'), action: 'withdraw' })).status).toBe('Withdrawn');
  });

  it('[S-FR-TRD-2w.f] withdrawing with a stale version is TradeOfferNotOpen', async () => {
    await scene();
    await offer(id('of1'), 'julian', { version: 1 });
    expect(codeOf(await caught(() => setup().trd.resolveOffer({ offerId: id('of1'), expectedVersion: 0, actorId: id('julian'), action: 'withdraw' })))).toBe('TradeOfferNotOpen');
  });

  it('[S-FR-TRD-3.h] both parties see the same rounds', async () => {
    await scene();
    await offer(id('of1'), 'julian', { roundCount: 2, turn: 'proposer' });
    await offerRound(db, id('of1'), 1);
    await offerRound(db, id('of1'), 2, { actor: 'seller', action: 'counter' });
    const { trd } = setup();
    const a = await trd.getOffer({ offerId: id('of1'), actorId: id('julian') });
    const b = await trd.getOffer({ offerId: id('of1'), actorId: id('valentina') });
    expect(a.rounds.map((r) => r.action)).toEqual(['offer', 'counter']);
    expect(b.rounds).toEqual(a.rounds);
  });

  it('[S-FR-TRD-3.f] a third party gets a body identical to an unknown id', async () => {
    await scene();
    await offer(id('of1'), 'julian');
    const foreign = await caught(() => setup().trd.getOffer({ offerId: id('of1'), actorId: id('camila') }));
    const unknown = await caught(() => setup().trd.getOffer({ offerId: id('ghost'), actorId: id('camila') }));
    expect(codeOf(foreign)).toBe('TradeOfferNotVisibleToCaller');
    expect(JSON.stringify(foreign)).toBe(JSON.stringify(unknown));
  });

  it('[S-FR-TRD-3.mine.h] an expired Open offer reads Expired in my trades without the job', async () => {
    await scene();
    await offer(id('of1'), 'julian', { expiresAt: at(-HOUR) });
    expect((await setup().trd.listMyOffers({ actorId: id('julian'), side: 'any', cursor: null })).offers.map((o) => o.status)).toEqual(['Expired']);
  });

  it('[S-FR-TRD-7.h] both parties confirming completes the trade (computed, never stored)', async () => {
    await scene(0);
    await offer(id('of1'), 'julian', { status: 'Accepted', reservationRef: { listingId: id('lv'), units: [] } });
    const { trd } = setup();
    await trd.confirmCompletion({ offerId: id('of1'), actorId: id('julian') });
    expect((await trd.confirmCompletion({ offerId: id('of1'), actorId: id('valentina') })).completed).toBe(true);
  });

  it('[S-FR-TRD-7.f] a repeated confirmation is TradeAlreadyConfirmedByRole citing the original instant', async () => {
    await scene(0);
    await offer(id('of1'), 'julian', { status: 'Accepted', reservationRef: { listingId: id('lv'), units: [] } });
    await db.query(`UPDATE "TradeOffer" SET "proposerConfirmedAt" = $1`, [at(-HOUR)]);
    const error = await caught(() => setup().trd.confirmCompletion({ offerId: id('of1'), actorId: id('julian') }));
    expect(codeOf(error)).toBe('TradeAlreadyConfirmedByRole');
    expect(citedInputs(error)).toMatchObject({ confirmedAt: at(-HOUR) });
  });

  it('[S-FR-TRD-9.h] the expiry job marks an expired Open offer once, with no reservation change', async () => {
    await scene();
    await offer(id('of1'), 'julian', { expiresAt: at(-HOUR) });
    const { calls, trd } = setup();
    expect(await trd.expireDueOffers({ trigger: 'tick' })).toEqual({ expired: 1 });
    expect(await trd.expireDueOffers({ trigger: 'daily-night' })).toEqual({ expired: 0 });
    expect(calls.released).toHaveLength(0);
  });

  it('[S-FR-TRD-9.f] without the job, an accept at now = expiresAt is TradeOfferNotOpen citing Expired', async () => {
    await scene();
    await offer(id('of1'), 'julian', { expiresAt: T0 });
    const error = await caught(() => setup().trd.acceptOffer({ offerId: id('of1'), expectedVersion: 0, sellerId: id('valentina') }));
    expect(codeOf(error)).toBe('TradeOfferNotOpen');
    expect(citedInputs(error)).toMatchObject({ status: 'Expired' });
  });
});
