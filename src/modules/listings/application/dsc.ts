import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Clock } from '../../../shared-kernel/ports.js';
import type {
  AssertSearchAreaRequestDTO,
  CardDetailResponseDTO,
  GetCardDetailRequestDTO,
  SearchRequestDTO,
  SearchResponseDTO,
} from '../dto/dsc.dto.js';
import type { CatalogForListings, IdentityForListings, IDiscoveryQuery } from '../ports/listings.js';

// Inbound ports (use cases) — DSC, contracts.md §4.

/** Guard. FR-DSC-1. Pure; throws InvalidSearchArea. */
export interface IAssertSearchAreaUseCase {
  assertSearchArea(input: AssertSearchAreaRequestDTO): void;
}

/** Concurrency-safe read (decision log #4). One statement; ≤ 3 neighbour calls; zero writes. */
export interface ISearchUseCase {
  search(input: SearchRequestDTO): Promise<SearchResponseDTO>;
}

/** Resolver. FR-DSC-7. Entry present with listings = [] when none survive the filters. */
export interface IGetCardDetailUseCase {
  getCardDetail(input: GetCardDetailRequestDTO): Promise<CardDetailResponseDTO>;
}

export type DscUseCases = IAssertSearchAreaUseCase & ISearchUseCase & IGetCardDetailUseCase;

export interface DscDeps {
  discovery: IDiscoveryQuery;
  catalog: CatalogForListings;
  identity: IdentityForListings;
  clock: Clock;
}

/** Interface stub (Solutioning stop-point). */
export class DscService implements DscUseCases {
  constructor(protected readonly deps: DscDeps) {}

  assertSearchArea(_input: AssertSearchAreaRequestDTO): void {
    throw new NotImplementedError('listings.assertSearchArea');
  }

  async search(_input: SearchRequestDTO): Promise<SearchResponseDTO> {
    throw new NotImplementedError('listings.search');
  }

  async getCardDetail(_input: GetCardDetailRequestDTO): Promise<CardDetailResponseDTO> {
    throw new NotImplementedError('listings.getCardDetail');
  }
}
