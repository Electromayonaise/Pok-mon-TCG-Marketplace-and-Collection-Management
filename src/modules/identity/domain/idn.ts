// Core domain — IDN. Pure: imports only shared-kernel value types (AD-SYS-6, Solu-2 §5 rule 1).
import { NotImplementedError } from '../../../shared-kernel/errors.js';

export type SellerTrack = 'individual' | 'business';
export type ApplicationStatus = 'Approved' | 'Pending' | 'Rejected';

export interface CapabilityFacts {
  emailVerified: boolean;
  isAdmin: boolean;
  sellerTrack: SellerTrack | null;
  latestApplicationStatus: ApplicationStatus | null;
  hasIndividualProfile: boolean;
}

export type SellerKind = 'business' | 'individual' | 'none';

export interface DerivedCapabilities {
  sellerKind: SellerKind;
  canBuy: boolean;
  isAdmin: boolean;
  /** Listing eligibility outcome per FR-IDN-3, as a code or 'allowed'. */
  listing: 'allowed' | 'SellerNotVerified' | 'IndividualSellerProfileIncomplete';
  verified: boolean;
  derivedFrom: string[];
}

/** AD-IDN-1 rule 2: the one pure function every IDN query projects. */
export function deriveCapabilities(_facts: CapabilityFacts): DerivedCapabilities {
  throw new NotImplementedError('identity.domain.deriveCapabilities');
}
