// Solu-1 ATDD — TRD contracts (contracts.md §8). RED until implemented.
import { beforeEach, describe, expect, it } from 'vitest';
import { createTrdModule, type ListingsForTrading } from '../../../../src/modules/trading/index.js';
import { DomainError } from '../../../../src/shared-kernel/errors.js';
import { DAY } from '../../../../test-support/clock.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, httpOf } from '../../../../test-support/errors.js';
import { id } from '../../../../test-support/ids.js';
import * as seed from '../../../../test-support/seed.js';
import { wiring, type Wiring } from '../../../../test-support/wiring.js';

const db = useTestDatabase();
let w: Wiring;
let stock: number;
let handoffs: number;
let tradeability: () => Promise<{ sellerId: string; availability: number }>;
let handoff: () => Promise<{ text: string; externalUrl: string; copyText: string }>;
const valentina = id('valentina');
const julian = id('julian');

/** Fake of listings' trade surface: one shared unit of stock, consumed by reserveForTrade. */
const listings: ListingsForTrading = {
  getTradeability: () => tradeability(),
  reserveForTrade: async (_tx, listingId) => {
    if (stock < 1) throw new DomainError('InsufficientQuantity', [{ rule: 'FR-INV-3', inputs: { requested: 1, available: 0 } }]);
    stock -= 1;
    return { reservationRef: { listingId, units: [{ inventoryUnitId: id('unitcard'), qty: 1 }] }, exhaustedListingIds: stock === 0 ? [listingId] : [] };
  },
  generateContactMessage: async () => {
    handoffs += 1;
    return handoff();
  },
};
beforeEach(() => {
  w = wiring(db);
  stock = 1;
  handoffs = 0;
  tradeability = async () => ({ sellerId: valentina, availability: stock });
  handoff = async () => ({ text: 'Hola Valentina…', externalUrl: 'https://wa.me/573001234567?text=Hola', copyText: 'Hola Valentina…' });
});
const trd = () => createTrdModule({ sql: w.sql, transactions: w.transactions, outbox: w.outbox, clock: w.clock, listings });
const offer = (n: string, o: Partial<Parameters<typeof seed.tradeOffer>[1]> = {}) =>
  seed.tradeOffer(db, { id: id(`offer${n}`), listingId: id('lcard'), sellerId: valentina, proposerId: id(`proposer${n}`), ...o });
const statusOf = async (n: string) => (await db.query<{ status: string }>(`SELECT status FROM "TradeOffer" WHERE id = $1`, [id(`offer${n}`)]))[0]?.status;

describe('Solu-1 ATDD: TRD — assertActorTurn (guard, FR-TRD-2/3)', () => {
  it("RED: the seller on the seller's turn gets her role and the offer version", async () => {
    await offer('a', { proposerId: julian, version: 2 });
    expect(await trd().assertActorTurn({ offerId: id('offera'), actorId: valentina })).toEqual({ role: 'seller', version: 2 });
  });

  it("RED: the proposer acting on the seller's turn gets NotYourTurn (409); a stranger gets TradeOfferNotVisibleToCaller (403)", async () => {
    await offer('a', { proposerId: julian });
    const notYourTurn = await caught(() => trd().assertActorTurn({ offerId: id('offera'), actorId: julian }));
    expect(codeOf(notYourTurn)).toBe('NotYourTurn');
    expect(httpOf(notYourTurn)).toBe(409);
    const stranger = await caught(() => trd().assertActorTurn({ offerId: id('offera'), actorId: id('camila') }));
    expect(codeOf(stranger)).toBe('TradeOfferNotVisibleToCaller');
    expect(httpOf(stranger)).toBe(403);
  });

  it('RED: an Open offer past expiresAt (not materialized) gets TradeOfferNotOpen (409) and is not written', async () => {
    await offer('a', { proposerId: julian });
    w.clock.advance(7 * DAY);
    expect(codeOf(await caught(() => trd().assertActorTurn({ offerId: id('offera'), actorId: valentina })))).toBe('TradeOfferNotOpen');
    expect(await statusOf('a')).toBe('Open');
  });
});

describe('Solu-1 ATDD: TRD — acceptOffer (contended mutation, AD-TRD-2, AD-6)', () => {
  it('RED: accepting reserves the unit, marks the competing offer Unfulfillable, enqueues one TradeAccepted, and hands off once', async () => {
    await offer('a', { proposerId: julian });
    await offer('b');
    const result = await trd().acceptOffer({ offerId: id('offera'), sellerId: valentina, version: 0 });
    expect(result).toMatchObject({ offerId: id('offera'), status: 'Accepted', unfulfillableOfferIds: [id('offerb')], handoff: { externalUrl: 'https://wa.me/573001234567?text=Hola' } });
    expect(await statusOf('a')).toBe('Accepted');
    expect(await db.query(`SELECT status, "unfulfillableReason" FROM "TradeOffer" WHERE id = $1`, [id('offerb')])).toEqual([{ status: 'Unfulfillable', unfulfillableReason: 'ListingNoLongerAvailable' }]);
    expect(await db.query(`SELECT type, payload->>'tradeOfferId' AS "tradeOfferId" FROM "OutboxEvent"`)).toEqual([{ type: 'TradeAccepted', tradeOfferId: id('offera') }]);
    expect(handoffs).toBe(1);
  });

  it('RED: a stale version gets TradeOfferNotOpen (409) and leaves the offer Open with no reservation', async () => {
    await offer('a', { proposerId: julian, version: 3 });
    expect(codeOf(await caught(() => trd().acceptOffer({ offerId: id('offera'), sellerId: valentina, version: 2 })))).toBe('TradeOfferNotOpen');
    expect(await db.query(`SELECT status, "reservationRef" FROM "TradeOffer" WHERE id = $1`, [id('offera')])).toEqual([{ status: 'Open', reservationRef: null }]);
    expect(stock).toBe(1);
  });

  it("RED: a listing no longer open to trade propagates listings' ListingNotOpenToTrade unchanged and marks the own offer Unfulfillable", async () => {
    const closed = new DomainError('ListingNotOpenToTrade', [{ rule: 'FR-TRD-4', inputs: { listingId: id('lcard') } }]);
    tradeability = async () => {
      throw closed;
    };
    await offer('a', { proposerId: julian });
    const error = await caught(() => trd().acceptOffer({ offerId: id('offera'), sellerId: valentina, version: 0 }));
    expect(error).toBe(closed);
    expect(await statusOf('a')).toBe('Unfulfillable');
    expect(await db.counts(['OutboxEvent'])).toEqual({ OutboxEvent: 0 });
  });

  it('RED (mandatory edge case NFR-TRD-1): two offers accepted from two tabs for the last unit — one Accepted, one Unfulfillable, one event', async () => {
    await offer('a', { proposerId: julian });
    await offer('b');
    const outcome = await race(2, (n) => trd().acceptOffer({ offerId: id(n === 0 ? 'offera' : 'offerb'), sellerId: valentina, version: 0 }));
    expect(outcome.rejected.map(codeOf)).toEqual(['TradeOfferNotOpen']);
    expect(outcome.fulfilled).toHaveLength(1);
    expect([await statusOf('a'), await statusOf('b')].sort()).toEqual(['Accepted', 'Unfulfillable']);
    expect(stock).toBe(0);
    expect(await db.counts(['OutboxEvent'])).toEqual({ OutboxEvent: 1 });
  });

  it('RED (review F-14): a failing post-commit handoff still returns the committed accept, with handoff null', async () => {
    handoff = async () => {
      throw new DomainError('ListingNotFound', [{ rule: 'FR-INV-10', inputs: { listingId: id('lcard') } }]);
    };
    await offer('a', { proposerId: julian });
    const result = await trd().acceptOffer({ offerId: id('offera'), sellerId: valentina, version: 0 });
    expect(result).toMatchObject({ status: 'Accepted', handoff: null });
    expect(await statusOf('a')).toBe('Accepted');
  });

  it('RED (review E-10): a competing offer already at 10 rounds is marked Unfulfillable without breaching roundCount ≤ 10', async () => {
    await offer('a', { proposerId: julian });
    await offer('b', { roundCount: 10, turn: 'seller' });
    await trd().acceptOffer({ offerId: id('offera'), sellerId: valentina, version: 0 });
    expect(await db.query(`SELECT status, "roundCount" FROM "TradeOffer" WHERE id = $1`, [id('offerb')])).toEqual([{ status: 'Unfulfillable', roundCount: 10 }]);
    expect(await db.query(`SELECT action, actor FROM "TradeOfferRound" WHERE "offerId" = $1 ORDER BY round DESC LIMIT 1`, [id('offerb')])).toEqual([{ action: 'markedUnfulfillable', actor: 'seller' }]);
  });
});

describe('Solu-1 ATDD: TRD — findOpenOffer (resolver, FR-TRD-1)', () => {
  it("RED: returns the proposer's live Open offer on the listing", async () => {
    await offer('a', { proposerId: julian, version: 1 });
    expect(await trd().findOpenOffer({ listingId: id('lcard'), proposerId: julian })).toEqual({
      offerId: id('offera'), version: 1, turn: 'seller', expiresAt: '2026-10-08T15:00:00.000Z',
    });
  });

  it('RED: no offer, or only an expired Open one, resolves silently to null without materializing the expiry', async () => {
    expect(await trd().findOpenOffer({ listingId: id('lcard'), proposerId: julian })).toBeNull();
    await offer('a', { proposerId: julian });
    w.clock.advance(7 * DAY);
    expect(await trd().findOpenOffer({ listingId: id('lcard'), proposerId: julian })).toBeNull();
    expect(await statusOf('a')).toBe('Open');
  });
});
