// TrdServiceV2 against Postgres with the real listings neighbour: the edges the ATDD tests leave out — the S-FR-TRD-1
// refusals with zero writes, the proposer's own expired offer materialized before a new one, reject and withdraw by
// the wrong party, and the paged "my trades" list.
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { PgTransactionRunner, useTestDatabase } from '../../../../test-support/db.js';
import { PG } from '../../../../test-support/env.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { at, catalogEntry, HOUR, id, individualSeller, listing, rows, tradeOffer, unit, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { realTradeListings } from '../../../../test-support/solu2/services.js';
import type { TransactionRunner } from '../../../shared-kernel/ports.js';
import type { TradeTermsDTO } from '../dto/trd.v2.dto.js';
import { TrdServiceV2 } from './trd.v2.js';

const db = useTestDatabase();

function trading(transactions: TransactionRunner = db.transactions) {
  const w = { ...wiring(db), transactions };
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

describe('TrdServiceV2.counterOffer (TRD-2) with the real listings', () => {
  it('the parties alternate rounds; an unknown item is InvalidItemRef before the lock, and nothing changes', async () => {
    await scene();
    const { offerId } = await make();
    const trd = trading();
    await trd.counterOffer({ offerId, terms: terms({ cashCop: 10_000 }), expectedVersion: 0, actorId: id('valentina') });
    const ghost = await caught(() => trd.counterOffer({ offerId, terms: terms({ offeredItems: [{ itemRef: id('ghost'), condition: 'NM', qty: 1 }] }), expectedVersion: 1, actorId: id('julian') }));
    expect(codeOf(ghost)).toBe('InvalidItemRef');
    expect(await trd.counterOffer({ offerId, terms: terms({ cashCop: 5_000 }), expectedVersion: 1, actorId: id('julian') })).toMatchObject({ version: 2, turn: 'seller', roundCount: 3 });
    const view = await trd.getOffer({ offerId, actorId: id('valentina') });
    expect(view.rounds.map((r) => [r.round, r.actor, r.action, r.terms?.cashCop])).toEqual([[1, 'proposer', 'offer', 0], [2, 'seller', 'counter', 10_000], [3, 'proposer', 'counter', 5_000]]);
    expect(await rows(db, 'audit_events', `action = 'trading.offer.countered'`)).toHaveLength(2);
  });
});

describe('TrdServiceV2.acceptOffer and getHandoff (TRD-1, S-FR-TRD-3.handoff) with the real listings', () => {
  it('runs on a pool of 1, names the offered card in the handoff, and the handoff page regenerates the same text', async () => {
    await scene();
    await catalogEntry(db, id('pika'), { name: 'Pikachu ex' });
    const { offerId } = await make({ terms: terms({ offeredItems: [{ itemRef: id('pika'), condition: 'LP', qty: 1 }], cashCop: 20_000 }) });
    expect(codeOf(await caught(() => trading().getHandoff({ offerId, actorId: id('julian') })))).toBe('TradeNotAccepted');
    expect(codeOf(await caught(() => trading().acceptOffer({ offerId, expectedVersion: 0, sellerId: id('julian') })))).toBe('NotYourTurn');
    const pool = new pg.Pool({ ...PG, database: (db.pool.options as { database: string }).database, max: 1 });
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadlock = new Promise<never>((_, reject) => { watchdog = setTimeout(() => reject(new Error('deadlock: a second connection was requested')), 3_000); });
      const result = await Promise.race([trading(new PgTransactionRunner(pool)).acceptOffer({ offerId, expectedVersion: 0, sellerId: id('valentina') }), deadlock]);
      expect(result).toMatchObject({ status: 'Accepted', reservationRef: { listingId: id('lv'), units: [{ inventoryUnitId: id('uv'), qty: 1 }] }, decision: { reasonCode: 'TradeOfferAccepted' } });
      expect(result.handoff?.text).toContain('1× Pikachu ex (LP)');
      expect((await trading().getHandoff({ offerId, actorId: id('valentina') })).text).toBe(result.handoff?.text);
    } finally {
      clearTimeout(watchdog);
      await pool.end();
    }
    expect((await rows(db, 'TradeOffer', 'id = $1', [offerId]))[0]).toMatchObject({ status: 'Accepted', version: 1 });
    expect((await rows<{ quantity: number }>(db, 'InventoryUnit'))[0]?.quantity).toBe(0);
  });

  it('a listing closed to trade after the offer leaves the offer Unfulfillable, with no reservation, event or accept round (AD-TRD-2 rule 3)', async () => {
    await scene();
    const { offerId } = await make();
    await db.query(`UPDATE "Listing" SET "openToTrade" = false`);
    expect(codeOf(await caught(() => trading().acceptOffer({ offerId, expectedVersion: 0, sellerId: id('valentina') })))).toBe('ListingNotOpenToTrade');
    expect((await rows(db, 'TradeOffer'))[0]).toMatchObject({ status: 'Unfulfillable', reservationRef: null });
    expect((await rows(db, 'TradeOfferRound', `"offerId" = $1`, [offerId])).map((r) => r.action)).toEqual(['offer', 'markedUnfulfillable']);
    expect(await rows(db, 'OutboxEvent')).toHaveLength(0);
    expect((await rows<{ quantity: number }>(db, 'InventoryUnit'))[0]?.quantity).toBe(1);
  });
});
