import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Clock, IdGenerator, TransactionRunner, Tx } from '../../../shared-kernel/ports.js';
import type {
  GetReferencePriceAsOfRequestDTO,
  GetReferencePriceAsOfResponseDTO,
  StartFeedRunRequestDTO,
  StartFeedRunResponseDTO,
  UpsertCatalogEntryRequestDTO,
  UpsertCatalogEntryResponseDTO,
} from '../dto/cat.dto.js';
import type { ICatalogEntryRepository, IFeedRunRepository, IReferencePriceRepository } from '../ports/cat.js';

// Inbound ports (use cases) — CAT, contracts.md §3. The CAT guard `assertCatalogAdmin` is the
// adminProcedure check in src/server/trpc/admin-guard.ts (review E-23): catalog has no module deps.

/** Contended mutation. AD-CAT-1 rule 1: at most one Running run. */
export interface IStartFeedRunUseCase {
  startFeedRun(input: StartFeedRunRequestDTO): Promise<StartFeedRunResponseDTO>;
}

/** Supplementary contended mutation. AD-CAT-1 rule 5: catalogEntryId never reassigned. */
export interface IUpsertCatalogEntryUseCase {
  upsertCatalogEntry(tx: Tx, input: UpsertCatalogEntryRequestDTO): Promise<UpsertCatalogEntryResponseDTO>;
}

/** Resolver. FR-CAT-5, FR-CAT-7. null when no observation ≤ asOf. */
export interface IGetReferencePriceAsOfUseCase {
  getReferencePriceAsOf(input: GetReferencePriceAsOfRequestDTO): Promise<GetReferencePriceAsOfResponseDTO>;
}

export type CatUseCases = IStartFeedRunUseCase & IUpsertCatalogEntryUseCase & IGetReferencePriceAsOfUseCase;

export interface CatDeps {
  runs: IFeedRunRepository;
  entries: ICatalogEntryRepository;
  prices: IReferencePriceRepository;
  transactions: TransactionRunner;
  clock: Clock;
  ids: IdGenerator;
  /** Configuration, default 36 (FR-CAT-7). */
  freshnessThresholdHours: number;
}

/** Interface stub (Solutioning stop-point). */
export class CatService implements CatUseCases {
  constructor(protected readonly deps: CatDeps) {}

  async startFeedRun(_input: StartFeedRunRequestDTO): Promise<StartFeedRunResponseDTO> {
    throw new NotImplementedError('catalog.startFeedRun');
  }

  async upsertCatalogEntry(_tx: Tx, _input: UpsertCatalogEntryRequestDTO): Promise<UpsertCatalogEntryResponseDTO> {
    throw new NotImplementedError('catalog.upsertCatalogEntry');
  }

  async getReferencePriceAsOf(_input: GetReferencePriceAsOfRequestDTO): Promise<GetReferencePriceAsOfResponseDTO> {
    throw new NotImplementedError('catalog.getReferencePriceAsOf');
  }
}
