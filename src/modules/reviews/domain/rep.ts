// Core domain — REP. Pure (AD-SYS-6).

/** ADD-§9.2 reasons that apply to reviews. */
export type ReviewHideReason = 'Harassment' | 'PersonalData' | 'Spam' | 'OffTopic' | 'Other';

/** What identity says of a review target (S-FR-IDN-6.target). */
export interface ReviewTarget { kind: 'business' | 'individual' | 'none'; verified: boolean }

/**
 * AD-REP-1 rule 1 (REP-1 P3): an individual seller (its track exists only with a complete profile), or an
 * `Approved` business. Anyone else is no review target.
 */
export function reviewableKind(target: ReviewTarget): 'business' | 'individual' | null {
  if (target.kind === 'individual') return 'individual';
  if (target.kind === 'business' && target.verified) return 'business';
  return null;
}

/** AD-REP-1 rule 2 (REP-1 Q1, I1): a business review is snapshotted verified, an individual one never is. */
export const purchaseVerifiedFor = (kind: 'business' | 'individual'): boolean => kind === 'business';

/** ADD-§2.9 (REP-3 Q1): floor((20 × sum + count) / (2 × count)) tenths, half-up in BigInt; null when count = 0. */
export function averageTenths(sum: bigint, count: bigint): bigint | null {
  if (count < 0n || sum < 0n) throw new RangeError('averageTenths: a negative sum or count');
  if (count === 0n) return null;
  return (20n * sum + count) / (2n * count);
}
