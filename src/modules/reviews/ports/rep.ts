import type { Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { ReviewHideReason } from '../domain/rep.js';

// Outbound ports — REP.

/** Neighbour ports (AD-1 edges reviews → identity, reviews → orders). */
export interface IdentityForReviews {
  getReviewTarget(userId: CuidId): Promise<{ kind: 'business'; status: 'Approved' | 'Pending' | 'Rejected' | 'none' } | { kind: 'individual'; profileComplete: boolean } | null>;
}
export interface OrdersForReviews {
  hasClosedPurchase(buyerId: CuidId, businessId: CuidId): Promise<{ closed: boolean; latestState: string | null }>;
}

export interface IReviewRepository {
  /** AD-REP-3 rule 1: UPDATE … WHERE id AND "hiddenAt" IS NULL RETURNING rating, text. */
  hideConditionally(tx: Tx, reviewId: CuidId, reason: ReviewHideReason, adminId: CuidId, now: Date): Promise<{ rating: number; text: string } | null>;
  readHide(tx: Tx, reviewId: CuidId): Promise<{ hiddenAt: Date | null; hiddenBy: CuidId | null; hiddenReason: string | null } | null>;
  insertModerationLog(tx: Tx, row: { id: CuidId; reviewId: CuidId; action: 'hide' | 'unhide'; reasonCode: ReviewHideReason; note: string | null; adminId: CuidId; ratingSnapshot: number; textSnapshot: string; at: Date }): Promise<void>;
  /** AD-REP-2 rule 1: one statement, visible reviews only. */
  sumsAndCounts(sellerIds: readonly CuidId[]): Promise<Map<CuidId, { sum: bigint; count: bigint }>>;
}
