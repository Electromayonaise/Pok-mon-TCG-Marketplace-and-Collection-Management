// Core domain — REP. Pure (AD-SYS-6).
import { NotImplementedError } from '../../../shared-kernel/errors.js';

/** ADD-§9.2 reasons that apply to reviews. */
export type ReviewHideReason = 'Harassment' | 'PersonalData' | 'Spam' | 'OffTopic' | 'Other';

/** ADD-§2.9: floor((20 × sum + count) / (2 × count)) tenths; null when count = 0. */
export function averageTenths(_sum: bigint, _count: bigint): bigint | null {
  throw new NotImplementedError('reviews.domain.averageTenths');
}

/** AD-REP-1 rules 1–2: the verdict for a review write, in precedence order. */
export function reviewVerdict(_input: {
  reviewerId: string;
  targetUserId: string;
  target: { kind: 'business'; status: 'Approved' | 'Pending' | 'Rejected' | 'none' } | { kind: 'individual'; profileComplete: boolean } | null;
  closedPurchase: boolean | null;
}): { ok: true; targetKind: 'business' | 'individual'; purchaseVerified: boolean } | { ok: false; code: 'TargetNotFound' | 'NotVerifiedPurchaser' } {
  throw new NotImplementedError('reviews.domain.reviewVerdict');
}
