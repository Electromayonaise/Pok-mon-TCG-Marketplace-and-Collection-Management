import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Clock, Tx } from '../../../shared-kernel/ports.js';
import type {
  AssertListingOwnerRequestDTO,
  AssertListingOwnerResponseDTO,
  GetAvailabilitySummaryRequestDTO,
  GetAvailabilitySummaryResponseDTO,
  ReserveForPurchaseRequestDTO,
  ReserveForPurchaseResponseDTO,
} from '../dto/inv.dto.js';
import type { IdentityForListings, IDiscoveryQuery, IInventoryUnitRepository, IListingRepository } from '../ports/listings.js';

// Inbound ports (use cases) — INV, contracts.md §5.

/** Guard. FR-INV-9/10. ListingNotFound for non-owners of non-visible listings; ListingNotOwnedByCaller otherwise. */
export interface IAssertListingOwnerUseCase {
  assertListingOwner(input: AssertListingOwnerRequestDTO): Promise<AssertListingOwnerResponseDTO>;
}

/** Contended mutation. AD-INV-2. Runs only inside the caller's tx; never opens one. */
export interface IReserveForPurchaseUseCase {
  reserveForPurchase(tx: Tx, input: ReserveForPurchaseRequestDTO): Promise<ReserveForPurchaseResponseDTO>;
}

/** Resolver. FR-COL-6. One row per id; zero rows → { lowestPriceCop: null, availableCount: 0 }. */
export interface IGetAvailabilitySummaryUseCase {
  getAvailabilitySummary(input: GetAvailabilitySummaryRequestDTO): Promise<GetAvailabilitySummaryResponseDTO>;
}

export type InvUseCases = IAssertListingOwnerUseCase & IReserveForPurchaseUseCase & IGetAvailabilitySummaryUseCase;

export interface InvDeps {
  listings: IListingRepository;
  units: IInventoryUnitRepository;
  discovery: IDiscoveryQuery;
  identity: IdentityForListings;
  clock: Clock;
}

/** Interface stub (Solutioning stop-point). */
export class InvService implements InvUseCases {
  constructor(protected readonly deps: InvDeps) {}

  async assertListingOwner(_input: AssertListingOwnerRequestDTO): Promise<AssertListingOwnerResponseDTO> {
    throw new NotImplementedError('listings.assertListingOwner');
  }

  async reserveForPurchase(_tx: Tx, _input: ReserveForPurchaseRequestDTO): Promise<ReserveForPurchaseResponseDTO> {
    throw new NotImplementedError('listings.reserveForPurchase');
  }

  async getAvailabilitySummary(_input: GetAvailabilitySummaryRequestDTO): Promise<GetAvailabilitySummaryResponseDTO> {
    throw new NotImplementedError('listings.getAvailabilitySummary');
  }
}
