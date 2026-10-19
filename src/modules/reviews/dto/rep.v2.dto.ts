import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';
import type { ReviewHideReason } from '../domain/rep.js';

// Solu-2 DTOs — REP (contracts.md §12, §15). Listing moderation lives in listings.

// REP-1 writeReview
export interface WriteReviewRequest {
  reviewerId: CuidId;
  targetUserId: CuidId;
  rating: 1 | 2 | 3 | 4 | 5;
  /** @maxLength 1000 */
  text: string;
}
export interface WriteReviewResponse { reviewId: CuidId; targetKind: 'business' | 'individual'; purchaseVerified: boolean; decision: ExplanationDTO }

// REP-2 hideReview, and its FR-REP-4 mirror unhideReview (supporting)
export interface HideReviewRequest {
  adminId: CuidId;
  reviewId: CuidId;
  reasonCode: ReviewHideReason;
  /** Required, 10–500 characters, when the reason is Other (ADD-§9.2). @maxLength 500 */
  note: string | null;
}
export interface HideReviewResponse { decision: ExplanationDTO }
export type UnhideReviewRequest = HideReviewRequest;
export type UnhideReviewResponse = HideReviewResponse;

// REP-3 getAggregates
export interface GetAggregatesRequest {
  /** @minItems 1 @maxItems 500 */
  sellerIds: CuidId[];
}
export interface SellerAggregateDTO { sellerId: CuidId; averageTenths: number | null; count: number; decision: ExplanationDTO }
export interface GetAggregatesResponse { aggregates: SellerAggregateDTO[] }

// S-FR-REP-6 admin search and log
export interface SearchReviewsRequest { adminId: CuidId; query: string; cursor: string | null }
export interface ReviewAdminRowDTO { reviewId: CuidId; targetUserId: CuidId; rating: number; text: string; hidden: boolean; createdAt: IsoInstant }
export interface SearchReviewsResponse { rows: ReviewAdminRowDTO[]; nextCursor: string | null }
export interface ListReviewModerationLogRequest { adminId: CuidId; cursor: string | null; reasonCode?: ReviewHideReason }
export interface ReviewModerationLogRow {
  logId: CuidId;
  reviewId: CuidId;
  action: 'hide' | 'unhide';
  reasonCode: ReviewHideReason;
  adminId: CuidId;
  ratingSnapshot: number;
  textSnapshot: string;
  at: IsoInstant;
}
export interface ListReviewModerationLogResponse { rows: ReviewModerationLogRow[]; nextCursor: string | null }

// S-FR-REP-7 profile
export interface ProfileReviewDTO { reviewId: CuidId; rating: number; text: string; purchaseVerified: boolean; createdAt: IsoInstant; editedAt: IsoInstant | null }
export interface GetProfileRequest {
  userId: CuidId;
  /** @minimum 1 */
  page: number;
}
export interface GetProfileResponse { aggregate: SellerAggregateDTO; reviews: ProfileReviewDTO[]; hasMore: boolean }

// Edit (FR-REP-1) and the 11.1 eligibility read found by the UI-state check (contracts.md §15.12)
export interface EditReviewRequest {
  reviewerId: CuidId;
  reviewId: CuidId;
  rating: 1 | 2 | 3 | 4 | 5;
  /** @maxLength 1000 */
  text: string;
}
export interface EditReviewResponse { reviewId: CuidId; editedAt: IsoInstant; decision: ExplanationDTO }
export interface GetReviewEligibilityRequest { reviewerId: CuidId; targetUserId: CuidId }
export interface GetReviewEligibilityResponse {
  eligible: boolean;
  existingReview: { reviewId: CuidId; rating: number; text: string; hidden: boolean } | null;
  decision: ExplanationDTO;
}
