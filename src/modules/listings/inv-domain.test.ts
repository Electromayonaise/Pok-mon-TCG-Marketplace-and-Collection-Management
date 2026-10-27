// INV domain (AD-INV-1, AD-INV-3, INV-2 P3–P5): pure rules, no database.
import { describe, expect, it } from 'vitest';
import { availability, conditionFitsKind, createdState, isValidLocation, isValidPrice, pausedAtInsert, purchasable, type PurchasabilityFacts } from './domain/inv.js';

const facts = (o: Partial<PurchasabilityFacts> = {}): PurchasabilityFacts => ({
  sellerKindAtCreation: 'business', verification: 'Approved', pausedAt: null, hiddenAt: null, withdrawnAt: null, deactivatedAt: null, availability: 1, projection: 'funded', ...o,
});

describe('INV-2 input rules', () => {
  it('a condition fits its kind: Sealed only for sealed products', () => {
    expect([conditionFitsKind('Sealed', 'sealedProduct'), conditionFitsKind('NM', 'card'), conditionFitsKind('NM', 'sealedProduct'), conditionFitsKind('Sealed', 'card')]).toEqual([true, true, false, false]);
  });

  it('a price is an integer of 1,000–100,000,000 COP', () => {
    expect([999, 1_000, 100_000_000, 100_000_001, 1_000.5].map(isValidPrice)).toEqual([false, true, true, false, false]);
  });

  it('a location lies inside the Colombia box, edges included, and is never (0, 0) or non-finite', () => {
    expect(isValidLocation({ lat: 4.711, lng: -74.0721 })).toBe(true);
    expect(isValidLocation({ lat: 13.39, lng: -66.85 })).toBe(true);
    expect(isValidLocation({ lat: 0, lng: 0 })).toBe(false);
    expect(isValidLocation({ lat: 40.4168, lng: -3.7038 })).toBe(false);
    expect(isValidLocation({ lat: Number.NaN, lng: -74 })).toBe(false);
  });
});

describe('fail-closed creation (AD-INV-3 rule 3)', () => {
  it('a business listing is paused unless its projection is funded; an individual one never is', () => {
    expect([pausedAtInsert('business', 'absent'), pausedAtInsert('business', 'paused'), pausedAtInsert('business', 'funded'), pausedAtInsert('individual', null)]).toEqual([true, true, false, false]);
  });

  it('the new state: Paused first, then Unverified for an unverified business, else Active', () => {
    expect(createdState({ paused: true, listingKind: 'business', verified: false })).toBe('Paused');
    expect(createdState({ paused: false, listingKind: 'business', verified: false })).toBe('Unverified');
    expect(createdState({ paused: false, listingKind: 'individual', verified: false })).toBe('Active');
  });
});

describe('availability and purchasability (AD-INV-1 rule 2, AD-INV-3 rule 1)', () => {
  it('a single listing shows its unit; a bundle its scarcest component; no units shows 0', () => {
    expect(availability('single', [{ quantity: 3, perBundleQty: 1 }])).toBe(3);
    expect(availability('bundle', [{ quantity: 3, perBundleQty: 1 }, { quantity: 2, perBundleQty: 2 }])).toBe(1);
    expect(availability('bundle', [{ quantity: 1, perBundleQty: 2 }])).toBe(0);
    expect(availability('bundle', [])).toBe(0);
  });

  it('purchasable checks visibility, kind, verification, the pause and the projection (absent when omitted), then stock', () => {
    expect(purchasable(facts())).toBe('purchasable');
    expect(purchasable(facts({ hiddenAt: new Date(0) }))).toBe('NotVisible');
    expect(purchasable(facts({ sellerKindAtCreation: 'individual' }))).toBe('IndividualListing');
    expect(purchasable(facts({ verification: 'Pending' }))).toBe('ListingUnverified');
    expect(purchasable(facts({ pausedAt: new Date(0) }))).toBe('ListingPausedBalanceExhausted');
    expect(purchasable(facts({ projection: 'absent' }))).toBe('ListingPausedBalanceExhausted');
    expect(purchasable(facts({ availability: 0 }))).toBe('SoldOut');
    const { projection: _omitted, ...solu1 } = facts();
    expect(purchasable(solu1)).toBe('ListingPausedBalanceExhausted');
  });
});
