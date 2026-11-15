// deriveCapabilities (AD-IDN-1 rule 6): every combination of {emailVerified, consent, sellerTrack,
// latest application status} against the FR-IDN-1 table, plus the FR-IDN-3 listing outcome.
import { describe, expect, it } from 'vitest';
import { deriveCapabilities, type ApplicationStatus, type CapabilityFacts, type SellerTrack } from './domain/idn.js';

const CONSENT = '2026-09-01T15:00:00.000Z';
const DECIDED = '2026-09-30T15:00:00.000Z';
const REAPPLY = '2026-10-08T15:00:00.000Z';

/** The account states IDN-1 can leave: an application exists only on the business track. */
const accounts: { label: string; sellerTrack: SellerTrack | null; status: ApplicationStatus | null }[] = [
  { label: 'no track', sellerTrack: null, status: null },
  { label: 'individual', sellerTrack: 'individual', status: null },
  { label: 'business Pending', sellerTrack: 'business', status: 'Pending' },
  { label: 'business Approved', sellerTrack: 'business', status: 'Approved' },
  { label: 'business Rejected', sellerTrack: 'business', status: 'Rejected' },
];

function facts(emailVerified: boolean, consent: boolean, sellerTrack: SellerTrack | null, status: ApplicationStatus | null, o: Partial<CapabilityFacts> = {}): CapabilityFacts {
  return {
    emailVerified,
    signupConsentAt: consent ? CONSENT : null,
    isAdmin: false,
    sellerTrack,
    hasIndividualProfile: sellerTrack === 'individual',
    latestApplication: status === null ? null : {
      id: 'app1', status, decidedAt: status === 'Pending' ? null : DECIDED,
      reapplyNotBefore: status === 'Rejected' ? REAPPLY : null, barred: false,
    },
    ...o,
  };
}

const combinations = [true, false].flatMap((emailVerified) => [true, false].flatMap((consent) =>
  accounts.map((a) => ({ emailVerified, consent, ...a }))));

describe('deriveCapabilities (AD-IDN-1, FR-IDN-1)', () => {
  it.each(combinations)('email $emailVerified, consent $consent, $label: the FR-IDN-1 table', ({ emailVerified, consent, sellerTrack, status }) => {
    const d = deriveCapabilities(facts(emailVerified, consent, sellerTrack, status));
    const live = status === 'Pending' || status === 'Approved';
    expect(Object.fromEntries(d.capabilities.map((c) => [c.name, c.value]))).toEqual({
      canBuy: emailVerified && consent,
      canListAsIndividual: sellerTrack === 'individual',
      canListAsBusiness: live,
      isVerifiedBusiness: status === 'Approved',
      canReceiveInAppMessages: live,
      canModerate: false,
    });
    expect(d.sellerKind).toBe(sellerTrack ?? 'none');
    expect(d.verification).toBe(status ?? 'none');
  });

  it('lists the six capabilities in fixed order, each with at least one source fact', () => {
    const d = deriveCapabilities(facts(true, true, 'business', 'Rejected'));
    expect(d.capabilities.map((c) => c.name)).toEqual(['canBuy', 'canListAsIndividual', 'canListAsBusiness', 'isVerifiedBusiness', 'canReceiveInAppMessages', 'canModerate']);
    for (const c of d.capabilities) expect(c.derivedFrom.length).toBeGreaterThanOrEqual(1);
  });

  it('flattens each source fact once into derivedFrom, citing emailVerified=false for an unverified email', () => {
    const { derivedFrom } = deriveCapabilities(facts(false, true, null, null));
    expect(derivedFrom).toContainEqual({ fact: 'emailVerified', value: false });
    expect(new Set(derivedFrom.map((f) => f.fact)).size).toBe(derivedFrom.length);
  });

  it('canModerate follows isAdmin alone; it never changes the seller kind (AD-16)', () => {
    const d = deriveCapabilities(facts(true, true, 'individual', null, { isAdmin: true }));
    expect(d.capabilities.find((c) => c.name === 'canModerate')?.value).toBe(true);
    expect(d.sellerKind).toBe('individual');
    expect(d.listing).toEqual({ allowed: true, listingKind: 'individual', verified: false, notice: null });
  });
});

describe('deriveCapabilities › listing (FR-IDN-3, IDN-2)', () => {
  it.each([
    ['individual', 'individual', null, { allowed: true, listingKind: 'individual', verified: false, notice: null }],
    ['business Pending', 'business', 'Pending', { allowed: true, listingKind: 'business', verified: false, notice: 'ListingUnverified' }],
    ['business Approved', 'business', 'Approved', { allowed: true, listingKind: 'business', verified: true, notice: null }],
    ['business Rejected', 'business', 'Rejected', { allowed: false, refusal: 'SellerNotVerified' }],
    ['no track', null, null, { allowed: false, refusal: 'IndividualSellerProfileIncomplete' }],
    ['business with no application (P2 breach)', 'business', null, { allowed: false, refusal: null }],
  ] as const)('%s', (_label, sellerTrack, status, listing) => {
    expect(deriveCapabilities(facts(true, true, sellerTrack, status)).listing).toEqual(listing);
  });

  it('exactly one outcome per fact set, whatever the email and consent (IDN-2 I2)', () => {
    for (const c of combinations) {
      const { listing } = deriveCapabilities(facts(c.emailVerified, c.consent, c.sellerTrack, c.status));
      expect(listing).toEqual(deriveCapabilities(facts(true, true, c.sellerTrack, c.status)).listing);
    }
  });
});
