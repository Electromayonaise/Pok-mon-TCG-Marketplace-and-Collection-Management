import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Clock, Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type {
  ClaimSellerTrackRequestDTO,
  ClaimSellerTrackResponseDTO,
  GetSellerVerificationRequestDTO,
  ListingEligibilityResponseDTO,
  RequireListingEligibilityRequestDTO,
  SellerVerificationResponseDTO,
} from '../dto/idn.dto.js';
import type { IUserRepository } from '../ports/idn.js';

// Inbound ports (use cases) — IDN, contracts.md §1.

/** Guard. FR-IDN-3. Read-only; throws SellerNotVerified | IndividualSellerProfileIncomplete. */
export interface IRequireListingEligibilityUseCase {
  requireListingEligibility(input: RequireListingEligibilityRequestDTO): Promise<ListingEligibilityResponseDTO>;
}

/** Contended mutation. AD-IDN-2. Exactly one track claim wins per account. */
export interface IClaimSellerTrackUseCase {
  claimSellerTrack(tx: Tx, input: ClaimSellerTrackRequestDTO): Promise<ClaimSellerTrackResponseDTO>;
}

/** Resolver. FR-IDN-6. Returns { status: 'none' } silently for an unknown seller. */
export interface IGetSellerVerificationUseCase {
  getSellerVerification(input: GetSellerVerificationRequestDTO): Promise<SellerVerificationResponseDTO>;
}

/** Offered to neighbours (contracts.md §15, review F-01, F-02): the owner raises its own codes. */
export interface IIdentityGuards {
  requireAdmin(actorId: CuidId): Promise<void>;
  requireMessagingEligibility(userId: CuidId): Promise<{ status: 'Approved' | 'Pending' }>;
}

export type IdnUseCases = IRequireListingEligibilityUseCase &
  IClaimSellerTrackUseCase &
  IGetSellerVerificationUseCase &
  IIdentityGuards;

export interface IdnDeps {
  users: IUserRepository;
  clock: Clock;
}

/** Interface stub (Solutioning stop-point): no production logic until the story is implemented. */
export class IdnService implements IdnUseCases {
  constructor(protected readonly deps: IdnDeps) {}

  async requireListingEligibility(_input: RequireListingEligibilityRequestDTO): Promise<ListingEligibilityResponseDTO> {
    throw new NotImplementedError('identity.requireListingEligibility');
  }

  async claimSellerTrack(_tx: Tx, _input: ClaimSellerTrackRequestDTO): Promise<ClaimSellerTrackResponseDTO> {
    throw new NotImplementedError('identity.claimSellerTrack');
  }

  async getSellerVerification(_input: GetSellerVerificationRequestDTO): Promise<SellerVerificationResponseDTO> {
    throw new NotImplementedError('identity.getSellerVerification');
  }

  async requireAdmin(_actorId: CuidId): Promise<void> {
    throw new NotImplementedError('identity.requireAdmin');
  }

  async requireMessagingEligibility(_userId: CuidId): Promise<{ status: 'Approved' | 'Pending' }> {
    throw new NotImplementedError('identity.requireMessagingEligibility');
  }
}
