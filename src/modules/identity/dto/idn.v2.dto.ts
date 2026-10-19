import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';
import type { SellerKind, SellerTrack } from '../domain/idn.js';

// Solu-2 DTOs — IDN (docs/solu-2/planning/detailed-design/contracts.md §1, §15). Primitive fields only.

// IDN-1 claimSellerTrack
export interface ClaimSellerTrackRequest { userId: CuidId; track: SellerTrack }
export interface ClaimSellerTrackResponse { claimed: SellerTrack }

// IDN-2 requireListingEligibility
export interface RequireListingEligibilityRequest { userId: CuidId }
export interface RequireListingEligibilityResponse {
  listingKind: 'business' | 'individual';
  verified: boolean;
  decision: ExplanationDTO;
}

// IDN-3 traceCapabilities
export type CapabilityName =
  | 'canBuy' | 'canListAsIndividual' | 'canListAsBusiness'
  | 'isVerifiedBusiness' | 'canReceiveInAppMessages' | 'canModerate';
export interface TraceCapabilitiesRequest { targetUserId: CuidId; adminId: CuidId }
export interface CapabilityTraceLine {
  name: CapabilityName;
  value: boolean;
  derivedFrom: { fact: string; value: string | boolean | null; at: IsoInstant | null }[];
}
export interface TraceCapabilitiesResponse {
  targetUserId: CuidId;
  sellerKind: SellerKind;
  /** One line per CapabilityName, in the fixed order of the type. */
  capabilities: CapabilityTraceLine[];
  decision: ExplanationDTO;
}

// S-FR-IDN-6 getSellerKinds / getReviewTarget
export interface GetSellerKindsRequest { userIds: CuidId[] }
export interface GetSellerKindsResponse { sellers: { userId: CuidId; sellerKind: SellerKind; verified: boolean }[] }
export interface GetReviewTargetRequest { userId: CuidId }
export interface GetReviewTargetResponse { kind: 'business' | 'individual' | 'none'; verified: boolean }

// S-FR-IDN-7 requireCanBuy / auth throttle
export interface RequireCanBuyRequest { userId: CuidId }
export interface RequireCanBuyResponse { canBuy: true; decision: ExplanationDTO }
export interface CheckAuthThrottleRequest {
  scope: 'signInFail' | 'signUp';
  accountId: CuidId | null;
  /** HMAC-SHA256 of the caller IP (S-7), 64 hex chars. Never a raw IP. */
  ipHmac: string;
}
export interface CheckAuthThrottleResponse { allowed: true }
