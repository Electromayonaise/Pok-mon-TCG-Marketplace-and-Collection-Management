import type { CuidId } from '../../../shared-kernel/types.js';
import type { Decision } from '../../../shared-kernel/decision.js';
import type { ReviewHideReason } from '../domain/rep.js';

export type { ReviewHideReason };

// DTOs — REP (contracts.md §12). Primitive fields only.

// assertVerifiedPurchaser
export interface AssertVerifiedPurchaserRequestDTO {
  reviewerId: CuidId;
  targetUserId: CuidId;
}
export interface AssertVerifiedPurchaserResponseDTO {
  targetKind: 'business' | 'individual';
  /** true for a business target with a closed purchase; always false for an individual. */
  purchaseVerified: boolean;
}

// hideReview
export interface HideReviewRequestDTO {
  reviewId: CuidId;
  reasonCode: ReviewHideReason;
  /** Required (10–500 chars) when reasonCode = 'Other'; otherwise null or 0–500 chars. */
  note: string | null;
  adminId: CuidId;
}
/** outcome 'hidden', or 'allowedWithNotice' citing the existing hide. */
export type HideReviewResponseDTO = Decision;

// getAggregates
export interface GetAggregatesRequestDTO {
  /** 1–500 distinct ids; duplicates are refused by the parser (review E-22). */
  sellerIds: CuidId[];
}
export interface AggregateDTO {
  sellerId: CuidId;
  /** Tenths of a star, half away from zero (ADD-§2.9); null when count = 0. */
  averageTenths: number | null;
  count: number;
}
/** Exactly one element per requested id, in request order. */
export type GetAggregatesResponseDTO = AggregateDTO[];
