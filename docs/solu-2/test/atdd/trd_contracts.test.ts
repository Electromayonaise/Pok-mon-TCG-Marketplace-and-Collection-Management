// ATDD — TRD (contracts.md §8, §15, §15.12). Red phase: every test must fail with NotImplementedError.
// The `listings` fake honours its port contract (P-INV.trade): a conditional decrement in the caller's tx.
import { describe, expect, it } from 'vitest';
import { TrdServiceV2 } from '../../../../src/modules/trading/index.js';
import type { ListingsForTrd, TradeTermsDTO } from '../../../../src/modules/trading/index.js';
import { DomainError } from '../../../../src/shared-kernel/errors.js';
import type { Tx } from '../../../../src/shared-kernel/ports.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { at, catalogEntry, DAY, explainAssert, fake, HOUR, id, listing, offerRound, rows, T0, tradeOffer, unit, user, wiring } from '../../../../test-support/solu2/fixtures.js';

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
const offerRow = async (offerId: string) => (await rows<Record<string, unknown>>(db, 'TradeOffer', 'id = $1', [offerId]))[0];
const terms = (cashCop: number): TradeTermsDTO => ({ offeredItems: [{ itemRef: id('char'), condition: 'NM', qty: 1 }], cashCop, requestedQty: 1 });

describe('TRD-1 — acceptOffer (contracts.md §8)', () => {
  it('[TRD-1.Q1] the seller accepts: Accepted with a reservation, one accept round, one TradeAccepted with no delivery, and one handoff for the proposer', async () => {
    await scene();
    await offer(id('of1'), 'julian');
    const { calls, trd } = setup();
    const result = await trd.acceptOffer({ offerId: id('of1'), expectedVersion: 0, sellerId: id('valentina') });
    expect(result).toMatchObject({ offerId: id('of1'), status: 'Accepted', reservationRef: { listingId: id('lv') }, handoff: { externalUrl: 'https://wa.me/573001234567?text=Hola' } });
    expect(calls.handoffs).toEqual([expect.objectContaining({ kind: 'trade', listingId: id('lv'), requesterId: id('julian') })]);
    expect(await rows(db, 'OutboxEvent', `type = 'TradeAccepted'`)).toHaveLength(1);
    expect(await rows(db, 'EventDelivery')).toHaveLength(0);
  });

  it('[TRD-1.P2] an offer past expiresAt is TradeOfferNotOpen (409) citing the derived Expired status', async () => {
    await scene();
    await offer(id('of1'), 'julian', { expiresAt: at(-HOUR) });
    const error = await caught(() => setup().trd.acceptOffer({ offerId: id('of1'), expectedVersion: 0, sellerId: id('valentina') }));
    expect(codeOf(error)).toBe('TradeOfferNotOpen');
    expect(citedInputs(error)).toMatchObject({ status: 'Expired' });
  });

  it('[TRD-1.P3] accepting out of turn is NotYourTurn (409) citing whose turn it is', async () => {
    await scene();
    await offer(id('of1'), 'julian', { turn: 'proposer' });
    const error = await caught(() => setup().trd.acceptOffer({ offerId: id('of1'), expectedVersion: 0, sellerId: id('valentina') }));
    expect(codeOf(error)).toBe('NotYourTurn');
    expect(citedInputs(error)).toMatchObject({ turn: 'proposer' });
  });

  it('[TRD-1.P4] a stale expectedVersion is TradeOfferNotOpen and nothing changes (R-6)', async () => {
    await scene();
    await offer(id('of1'), 'julian', { version: 3 });
    expect(codeOf(await caught(() => setup().trd.acceptOffer({ offerId: id('of1'), expectedVersion: 2, sellerId: id('valentina') })))).toBe('TradeOfferNotOpen');
    expect(await offerRow(id('of1'))).toMatchObject({ status: 'Open', version: 3 });
  });

  it('[TRD-1.P6] with no unit left, InsufficientQuantity propagates and the own offer becomes Unfulfillable', async () => {
    await scene(0);
    await offer(id('of1'), 'julian');
    expect(codeOf(await caught(() => setup().trd.acceptOffer({ offerId: id('of1'), expectedVersion: 0, sellerId: id('valentina') })))).toBe('InsufficientQuantity');
    expect(await offerRow(id('of1'))).toMatchObject({ status: 'Unfulfillable', unfulfillableReason: 'ListingNoLongerAvailable', reservationRef: null });
  });

  it('[TRD-1.Q3] siblings on the exhausted listing become Unfulfillable, even one already at 10 rounds (roundCount unchanged)', async () => {
    await scene();
    await offer(id('of1'), 'julian');
    await offer(id('of2'), 'camila', { roundCount: 10 });
    const result = await setup().trd.acceptOffer({ offerId: id('of1'), expectedVersion: 0, sellerId: id('valentina') });
    expect(result.unfulfillableOfferIds).toEqual([id('of2')]);
    expect(await offerRow(id('of2'))).toMatchObject({ status: 'Unfulfillable', roundCount: 10 });
  });

  it('[TRD-1.F1] a handoff failure after commit keeps the accept and returns handoff null (Solu-1 review F-14)', async () => {
    await scene();
    await offer(id('of1'), 'julian');
    const result = await setup({ handoffFails: true }).trd.acceptOffer({ offerId: id('of1'), expectedVersion: 0, sellerId: id('valentina') });
    expect(result).toMatchObject({ status: 'Accepted', handoff: null });
    expect(await offerRow(id('of1'))).toMatchObject({ status: 'Accepted' });
  });

  it('[TRD-1.I1] [TRD-1.MEC] two offers for the last unit accepted from two sessions, 100 repetitions: one Accepted, one Unfulfillable, stock 0, one event, one handoff (NFR-TRD-1)', async () => {
    for (let rep = 0; rep < 100; rep++) {
      await db.query(`TRUNCATE "TradeOfferRound", "TradeOffer", "Listing", "InventoryUnit", "CatalogEntry", "CatalogSet", "IndividualSellerProfile", "EventDelivery", "OutboxEvent", audit_events, "User" CASCADE`);
      await scene();
      await offer(id('of1'), 'julian');
      await offer(id('of2'), 'camila');
      const calls: Calls = { handoffs: [], released: [] };
      const outcome = await race(2, (i) => setup({ calls }).trd.acceptOffer({ offerId: id(i === 0 ? 'of1' : 'of2'), expectedVersion: 0, sellerId: id('valentina') }));
      expect(outcome.rejected.map(codeOf).filter((c) => !['InsufficientQuantity', 'TradeOfferNotOpen'].includes(c))).toEqual([]);
      expect(outcome.fulfilled).toHaveLength(1);
      expect((await rows(db, 'TradeOffer')).map((o) => o.status).sort()).toEqual(['Accepted', 'Unfulfillable']);
      expect((await rows<{ quantity: number }>(db, 'InventoryUnit'))[0]?.quantity).toBe(0);
      expect(await rows(db, 'OutboxEvent', `type = 'TradeAccepted'`)).toHaveLength(1);
      expect(calls.handoffs).toHaveLength(1);
    }
  });
});

describe('TRD-2 — counterOffer (contracts.md §8)', () => {
  it('[TRD-2.Q1] the seller counters: the turn flips, round 2 is recorded and the version advances', async () => {
    await scene();
    await offer(id('of1'), 'julian');
    await offerRound(db, id('of1'), 1);
    const result = await setup().trd.counterOffer({ offerId: id('of1'), terms: terms(30_000), expectedVersion: 0, actorId: id('valentina') });
    expect(result).toMatchObject({ offerId: id('of1'), version: 1, turn: 'proposer', roundCount: 2 });
    explainAssert(result.decision, { rule: 'FR-TRD-2', inputs: { offerId: id('of1'), round: 2, turn: 'proposer' } });
    expect(await rows(db, 'TradeOfferRound', '"offerId" = $1 AND round = 2', [id('of1')])).toMatchObject([{ actor: 'seller', action: 'counter' }]);
  });

  it('[TRD-2.P2] a counter with no item and no cash is EmptyTradeOffer (400)', async () => {
    await scene();
    await offer(id('of1'), 'julian');
    const error = await caught(() => setup().trd.counterOffer({ offerId: id('of1'), terms: { offeredItems: [], cashCop: 0, requestedQty: 1 }, expectedVersion: 0, actorId: id('valentina') }));
    expect(codeOf(error)).toBe('EmptyTradeOffer');
    expect(httpOf(error)).toBe(400);
  });

  it('[TRD-2.P5] the party whose turn it is not gets NotYourTurn', async () => {
    await scene();
    await offer(id('of1'), 'julian');
    expect(codeOf(await caught(() => setup().trd.counterOffer({ offerId: id('of1'), terms: terms(25_000), expectedVersion: 0, actorId: id('julian') })))).toBe('NotYourTurn');
  });

  it('[TRD-2.P6] a stale tab (old version) is TradeOfferNotOpen citing the latest round', async () => {
    await scene();
    await offer(id('of1'), 'julian', { version: 2, roundCount: 3 });
    const error = await caught(() => setup().trd.counterOffer({ offerId: id('of1'), terms: terms(25_000), expectedVersion: 1, actorId: id('valentina') }));
    expect(codeOf(error)).toBe('TradeOfferNotOpen');
    expect(citedInputs(error)).toMatchObject({ latestRound: 3 });
  });

  it('[TRD-2.P7] a counter that would create round 11 is TradeRoundLimitReached (409)', async () => {
    await scene();
    await offer(id('of1'), 'julian', { roundCount: 10, version: 9 });
    expect(codeOf(await caught(() => setup().trd.counterOffer({ offerId: id('of1'), terms: terms(25_000), expectedVersion: 9, actorId: id('valentina') })))).toBe('TradeRoundLimitReached');
  });

  it('[TRD-2.P8] terms equal to the latest round are TradeCounterUnchanged citing the round (G-1)', async () => {
    await scene();
    await offer(id('of1'), 'julian', { terms: terms(20_000) });
    await offerRound(db, id('of1'), 1, { terms: terms(20_000) });
    const error = await caught(() => setup().trd.counterOffer({ offerId: id('of1'), terms: terms(20_000), expectedVersion: 0, actorId: id('valentina') }));
    expect(codeOf(error)).toBe('TradeCounterUnchanged');
    expect(citedInputs(error)).toMatchObject({ round: 1 });
  });

  it('[TRD-2.I3] two tabs of the same party countering with one version: one round, one TradeOfferNotOpen (AD-TRD-1, AD-SYS-5)', async () => {
    await scene();
    await offer(id('of1'), 'julian');
    const outcome = await race(2, (i) => setup().trd.counterOffer({ offerId: id('of1'), terms: terms(30_000 + i), expectedVersion: 0, actorId: id('valentina') }));
    expect(outcome.rejected.map(codeOf)).toEqual(['TradeOfferNotOpen']);
    expect(await rows(db, 'TradeOfferRound', '"offerId" = $1 AND action = $2', [id('of1'), 'counter'])).toHaveLength(1);
  });
});

describe('TRD-3 — cancelTrade (contracts.md §8)', () => {
  const accepted = { status: 'Accepted', reservationRef: { listingId: id('lv'), units: [{ inventoryUnitId: id('uv'), qty: 1 }] } };

  it('[TRD-3.Q1] either party cancels an accepted trade: Cancelled, who cancelled, and the reservation released', async () => {
    await scene(0);
    await offer(id('of1'), 'julian', accepted);
    const { calls, trd } = setup();
    const result = await trd.cancelTrade({ offerId: id('of1'), actorId: id('julian') });
    expect(result).toMatchObject({ status: 'Cancelled', cancelledBy: id('julian') });
    expect(calls.released).toHaveLength(1);
  });

  it('[TRD-3.P2] after a completion confirmation the trade is TradeNotCancellable and the reservation stays', async () => {
    await scene(0);
    await offer(id('of1'), 'julian', accepted);
    await db.query(`UPDATE "TradeOffer" SET "proposerConfirmedAt" = $1`, [T0]);
    const { calls, trd } = setup();
    expect(codeOf(await caught(() => trd.cancelTrade({ offerId: id('of1'), actorId: id('valentina') })))).toBe('TradeNotCancellable');
    expect(calls.released).toHaveLength(0);
  });

  it('[TRD-3.P1] a third party is TradeOfferNotVisibleToCaller (403)', async () => {
    await scene(0);
    await offer(id('of1'), 'julian', accepted);
    expect(codeOf(await caught(() => setup().trd.cancelTrade({ offerId: id('of1'), actorId: id('camila') })))).toBe('TradeOfferNotVisibleToCaller');
  });

  it('[TRD-3.I1] both parties cancelling at once release the reservation exactly once (AD-TRD-3 rule 3)', async () => {
    await scene(0);
    await offer(id('of1'), 'julian', accepted);
    const calls: Calls = { handoffs: [], released: [] };
    const outcome = await race(2, (i) => setup({ calls }).trd.cancelTrade({ offerId: id('of1'), actorId: id(i === 0 ? 'julian' : 'valentina') }));
    expect(outcome.rejected.map(codeOf)).toEqual(['TradeNotCancellable']);
    expect(calls.released).toHaveLength(1);
  });
});

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
    expect((await setup().trd.listMyOffers({ actorId: id('julian'), role: 'any', cursor: null })).offers.map((o) => o.status)).toEqual(['Expired']);
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
