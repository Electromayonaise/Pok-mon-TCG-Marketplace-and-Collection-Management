import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';
import type { SellerKind, SellerTrack } from '../domain/idn.js';

// Solu-2 DTOs — IDN (_bmad-output/planning-artifacts/detailed-design/contracts.md §1, §15). Primitive fields only.

// IDN-1 claimSellerTrack
export interface ClaimSellerTrackRequest { userId: CuidId; track: SellerTrack }
export interface ClaimSellerTrackResponse { claimed: SellerTrack }

// IDN-2 requireListingEligibility
export interface RequireListingEligibilityRequest { userId: CuidId }
export interface RequireListingEligibilityResponse {
  listingKind: 'business' | 'individual';
  verified: boolean;
  decision: ExplanationDTO;
  /** The individual seller's meeting point, which INV-2 P5 uses when `location` is null (decision log Impl-1 #31); null for a business. */
  meetingPoint?: { lat: number; lng: number } | null;
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

// IDN-1 ingress: access.completeIndividualProfile (claims 'individual', then inserts the profile)
export interface CompleteIndividualProfileRequest {
  userId: CuidId;
  /** FR-IDN-2: 2–40 grapheme clusters (parser); code-point bounds here. @minLength 2 @maxLength 400 */
  displayName: string;
  /** Regulated (AD-SYS-8): +57 3XXXXXXXXX. */
  /** @pattern ^\+573[0-9]{9}$ */
  contactPhone: string;
  phoneSharingConsent: true;
  phoneSharingConsentVersion: string;
  defaultMeetingPoint: {
    /** ADD-§2.4 @minimum -4.23 @maximum 13.39 */
    lat: number;
    /** @minimum -81.73 @maximum -66.85 */
    lng: number;
    /** @minLength 2 @maxLength 60 */
    city: string;
  };
}
export interface CompleteIndividualProfileResponse { sellerKind: 'individual'; completedAt: IsoInstant; decision: ExplanationDTO }

// Offered ports (contracts.md §15.11)
export interface GetCapabilitiesRequest { userId: CuidId }
export interface GetCapabilitiesResponse {
  capabilities: Record<CapabilityName, boolean>;
  sellerKind: SellerKind;
  derivedFrom: { fact: string; value: string | boolean | null }[];
}
export interface GetSellerVerificationRequest { sellerId: CuidId }
export interface GetSellerVerificationResponse { status: 'Approved' | 'Pending' | 'Rejected' | 'none' }
export interface GetContactCardRequest { sellerId: CuidId }
/** contactPhoneE164 is regulated; only listings' contact service receives it. */
export interface GetContactCardResponse { displayName: string; contactPhoneE164: string }
export interface GetDisplayNamesRequest { userIds: CuidId[] }
export interface GetDisplayNamesResponse { names: { userId: CuidId; displayName: string }[] }
