import type { Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { ApplicationStatus, CapabilityFacts, SellerTrack } from '../domain/idn.js';

// Outbound ports — IDN.

export interface IUserRepository {
  /** AD-IDN-1 rule 1: one statement loads the facts for up to 500 users. */
  loadFacts(userIds: readonly CuidId[]): Promise<Map<CuidId, CapabilityFacts>>;
  /**
   * AD-IDN-2 rules 1–2: the conditional UPDATE on "User"."sellerTrack".
   * Returns the affected-row count (0 or 1); it never reads before writing.
   */
  claimTrackConditionally(tx: Tx, userId: CuidId, track: SellerTrack): Promise<0 | 1>;
  /** Re-read inside the same tx for the loser mapping (AD-IDN-2 rule 3). */
  readTrackAndLatestStatus(tx: Tx, userId: CuidId): Promise<{ sellerTrack: SellerTrack | null; latestStatus: ApplicationStatus | null }>;
}
