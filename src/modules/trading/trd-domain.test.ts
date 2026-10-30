// TRD's pure rules: derived expiry, roles, the action refusal order (decision log Impl-1 #35, D4), term checks and the cursor.
import { describe, expect, it } from 'vitest';
import { canonicalTerms, decodeOfferCursor, deriveOfferStatus, encodeOfferCursor, isEmptyTerms, offerActionRefusal, roleOf, termsIssues, type OfferState } from './domain/trd.js';

const now = new Date('2026-10-30T12:00:00.000Z');
const open = (o: Partial<OfferState> = {}): OfferState => ({ status: 'Open', turn: 'seller', expiresAt: new Date(now.getTime() + 1), version: 2, roundCount: 3, ...o });

describe('deriveOfferStatus (AD-TRD-1 rule 5)', () => {
  it('an Open offer reads Expired from expiresAt on; other statuses never expire', () => {
    expect(deriveOfferStatus(open(), now)).toBe('Open');
    expect(deriveOfferStatus(open({ expiresAt: now }), now)).toBe('Expired');
    expect(deriveOfferStatus(open({ status: 'Accepted', expiresAt: new Date(0) }), now)).toBe('Accepted');
  });
});

describe('roleOf (AD-TRD-1 rule 4)', () => {
  it('names the party, or null for a third party', () => {
    const offer = { proposerId: 'p', sellerId: 's' };
    expect([roleOf(offer, 'p'), roleOf(offer, 's'), roleOf(offer, 'x')]).toEqual(['proposer', 'seller', null]);
  });
});

describe('offerActionRefusal (AD-TRD-1 rule 2, D4 order)', () => {
  it('status before version before turn', () => {
    expect(offerActionRefusal(open({ expiresAt: now, version: 0, turn: 'proposer' }), 1, 'seller', now)).toEqual({ code: 'TradeOfferNotOpen', inputs: { status: 'Expired' } });
    expect(offerActionRefusal(open({ turn: 'proposer' }), 1, 'seller', now)).toEqual({ code: 'TradeOfferNotOpen', inputs: { status: 'Open', latestRound: 3, version: 2 } });
    expect(offerActionRefusal(open({ turn: 'proposer' }), 2, 'seller', now)).toEqual({ code: 'NotYourTurn', inputs: { turn: 'proposer' } });
    expect(offerActionRefusal(open({ turn: 'proposer' }), 2, null, now)).toBeNull();
  });
});

describe('term checks (FR-TRD-1, D6)', () => {
  const item = { itemRef: 'r', condition: 'NM', qty: 1 };
  it('reports every shape issue and recognizes an empty offer', () => {
    expect(termsIssues({ offeredItems: [item], cashCop: 0, requestedQty: 1 })).toEqual([]);
    expect(termsIssues({ offeredItems: [{ ...item, qty: 5 }], cashCop: 1.5, requestedQty: 2 }).map((i) => i.field)).toEqual(['terms.cashCop', 'terms.offeredItems', 'terms.requestedQty']);
    expect(termsIssues({ offeredItems: Array(11).fill(item), cashCop: 100_000_001, requestedQty: 1 }).map((i) => i.field)).toEqual(['terms.cashCop', 'terms.offeredItems']);
    expect(termsIssues({ offeredItems: [{ ...item, condition: 'Mint' }], cashCop: 0, requestedQty: 1 }).map((i) => i.field)).toEqual(['terms.offeredItems']);
    expect(isEmptyTerms({ offeredItems: [], cashCop: 0, requestedQty: 1 })).toBe(true);
    expect(isEmptyTerms({ offeredItems: [], cashCop: 1, requestedQty: 1 })).toBe(false);
  });

  it('canonical terms ignore the order of the items (G-1)', () => {
    const a = { offeredItems: [item, { itemRef: 'a', condition: 'LP', qty: 2 }], cashCop: 5, requestedQty: 1 };
    const b = { ...a, offeredItems: [...a.offeredItems].reverse() };
    expect(canonicalTerms(a)).toBe(canonicalTerms(b));
    expect(canonicalTerms(a)).not.toBe(canonicalTerms({ ...a, cashCop: 6 }));
  });
});

describe('the offers cursor', () => {
  it('round-trips, and refuses one this service never issued', () => {
    const id = 'a'.repeat(24);
    expect(decodeOfferCursor(encodeOfferCursor('2026-10-30T12:00:00.000Z', id))).toEqual({ updatedAt: '2026-10-30T12:00:00.000Z', id });
    expect(decodeOfferCursor('bm9wZQ')).toBeNull();
  });
});
