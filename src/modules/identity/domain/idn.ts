// Core domain — IDN. Pure: imports only shared-kernel value types (AD-SYS-6, Solu-2 §5 rule 1).
import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';

export type SellerTrack = 'individual' | 'business';
export type ApplicationStatus = 'Approved' | 'Pending' | 'Rejected';

/** The latest `"BusinessApplication"` by `("submittedAt" DESC, id DESC)`, as AD-IDN-1 rule 1 reads it. */
export interface LatestApplicationFacts {
  id: CuidId;
  status: ApplicationStatus;
  decidedAt: IsoInstant | null;
  reapplyNotBefore: IsoInstant | null;
  barred: boolean;
}

/** AD-IDN-1 rule 1: the facts of one user, loaded by one statement. */
export interface CapabilityFacts {
  emailVerified: boolean;
  signupConsentAt: IsoInstant | null;
  isAdmin: boolean;
  sellerTrack: SellerTrack | null;
  hasIndividualProfile: boolean;
  latestApplication: LatestApplicationFacts | null;
}

export type SellerKind = 'business' | 'individual' | 'none';

/** The six FR-IDN-1 capabilities in their fixed order (the DTO's `CapabilityName`). */
export const CAPABILITY_NAMES = ['canBuy', 'canListAsIndividual', 'canListAsBusiness', 'isVerifiedBusiness', 'canReceiveInAppMessages', 'canModerate'] as const;

/** One fact a capability was derived from; `at` is the instant the fact took effect, when it has one. */
export interface SourceFact {
  fact: string;
  value: string | boolean | null;
  at: IsoInstant | null;
}

export interface CapabilityValue {
  name: (typeof CAPABILITY_NAMES)[number];
  value: boolean;
  derivedFrom: SourceFact[];
}

/**
 * FR-IDN-3 in IDN-2's order. `refusal: null` is a business track with no application, a P2
 * breach the caller reports as 'Unexpected' (IDN-1 I1 makes it unreachable; Solu-1 review F-19).
 */
export type ListingEligibility =
  | { allowed: true; listingKind: SellerTrack; verified: boolean; notice: 'ListingUnverified' | null }
  | { allowed: false; refusal: 'SellerNotVerified' | 'IndividualSellerProfileIncomplete' | null };

export interface DerivedCapabilities {
  sellerKind: SellerKind;
  /** One element per `CapabilityName`, in that fixed order. */
  capabilities: CapabilityValue[];
  /** Every source fact once, in first-cited order (the FR-IDN-1 output). */
  derivedFrom: { fact: string; value: string | boolean | null }[];
  /** The latest application's status, or `'none'` (P-IDN.verification). */
  verification: ApplicationStatus | 'none';
  listing: ListingEligibility;
}

export type ClaimRefusalCode = 'AlreadyVerifiedBusiness' | 'BusinessApplicationOnFile' | 'IndividualSellerProfileAlreadyComplete';

/**
 * IDN-1 Q-fail: the code a claim of `track` raises when its conditional write changed 0 rows,
 * from the facts re-read in the same `tx`. `null` when no track is set: the claim could only
 * have failed on a missing `"User"` row, a P2 breach the caller reports as 'Unexpected'.
 */
export function claimRefusal(
  track: SellerTrack,
  current: { sellerTrack: SellerTrack | null; latestApplicationStatus: ApplicationStatus | null },
): ClaimRefusalCode | null {
  if (current.sellerTrack === null) return null;
  if (track === 'business' || current.sellerTrack === 'individual') return 'IndividualSellerProfileAlreadyComplete';
  return current.latestApplicationStatus === 'Approved' ? 'AlreadyVerifiedBusiness' : 'BusinessApplicationOnFile';
}

/** AD-IDN-1 rule 2: the one pure function every IDN query projects. No query recomputes a rule. */
export function deriveCapabilities(facts: CapabilityFacts): DerivedCapabilities {
  const app = facts.latestApplication;
  const status = app?.status ?? null;
  const live = status === 'Pending' || status === 'Approved';
  const email: SourceFact = { fact: 'emailVerified', value: facts.emailVerified, at: null };
  const consent: SourceFact = { fact: 'signupConsentAt', value: facts.signupConsentAt !== null, at: facts.signupConsentAt };
  const track: SourceFact = { fact: 'sellerTrack', value: facts.sellerTrack, at: null };
  const profile: SourceFact = { fact: 'individualProfile', value: facts.hasIndividualProfile, at: null };
  const latest: SourceFact = { fact: 'latestApplication.status', value: status, at: app?.decidedAt ?? null };
  const admin: SourceFact = { fact: 'isAdmin', value: facts.isAdmin, at: null };

  const capabilities: CapabilityValue[] = [
    { name: 'canBuy', value: facts.emailVerified && facts.signupConsentAt !== null, derivedFrom: [email, consent] },
    { name: 'canListAsIndividual', value: facts.hasIndividualProfile, derivedFrom: [track, profile] },
    { name: 'canListAsBusiness', value: live, derivedFrom: [track, latest] },
    { name: 'isVerifiedBusiness', value: status === 'Approved', derivedFrom: [latest] },
    { name: 'canReceiveInAppMessages', value: live, derivedFrom: [latest] },
    { name: 'canModerate', value: facts.isAdmin, derivedFrom: [admin] },
  ];
  const derivedFrom = new Map<string, string | boolean | null>();
  for (const c of capabilities) for (const f of c.derivedFrom) if (!derivedFrom.has(f.fact)) derivedFrom.set(f.fact, f.value);

  return {
    sellerKind: facts.sellerTrack ?? 'none',
    capabilities,
    derivedFrom: [...derivedFrom].map(([fact, value]) => ({ fact, value })),
    verification: status ?? 'none',
    listing: listingEligibility(facts.sellerTrack, status),
  };
}

function listingEligibility(sellerTrack: SellerTrack | null, status: ApplicationStatus | null): ListingEligibility {
  if (sellerTrack === 'individual') return { allowed: true, listingKind: 'individual', verified: false, notice: null };
  if (sellerTrack === null) return { allowed: false, refusal: 'IndividualSellerProfileIncomplete' };
  if (status === null) return { allowed: false, refusal: null };
  if (status === 'Rejected') return { allowed: false, refusal: 'SellerNotVerified' };
  return { allowed: true, listingKind: 'business', verified: status === 'Approved', notice: status === 'Pending' ? 'ListingUnverified' : null };
}
