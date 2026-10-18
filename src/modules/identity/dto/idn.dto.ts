import type { CuidId } from '../../../shared-kernel/types.js';
import type { ApplicationStatus, SellerTrack } from '../domain/idn.js';

export type { ApplicationStatus, SellerTrack };

// DTOs — IDN (contracts.md §1). Primitive fields only.

// requireListingEligibility
export interface RequireListingEligibilityRequestDTO {
  userId: CuidId;
}
export interface ListingEligibilityResponseDTO {
  listingKind: 'business' | 'individual';
  /** true only when the latest business application is Approved; always false for individuals. */
  verified: boolean;
}

// claimSellerTrack
export interface ClaimSellerTrackRequestDTO {
  userId: CuidId;
  track: SellerTrack;
}
export interface ClaimSellerTrackResponseDTO {
  claimed: SellerTrack;
}

// getSellerVerification
export interface GetSellerVerificationRequestDTO {
  sellerId: CuidId;
}
export interface SellerVerificationResponseDTO {
  /** 'none' when the seller has no application or no User row exists (silent). */
  status: ApplicationStatus | 'none';
}
