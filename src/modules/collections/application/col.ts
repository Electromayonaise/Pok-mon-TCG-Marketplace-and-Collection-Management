import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Clock, IdGenerator, TransactionRunner } from '../../../shared-kernel/ports.js';
import type {
  AcceptPromptRequestDTO,
  AcceptPromptResponseDTO,
  AssertCollectionOwnerRequestDTO,
  GetSetCompletionRequestDTO,
  GetSetCompletionResponseDTO,
} from '../dto/col.dto.js';
import type { CatalogForCollections, ICollectionRepository, IPromptRepository } from '../ports/collections.js';

// Inbound ports (use cases) — COL, contracts.md §10.

/** Guard. FR-COL-1. CollectionNotFound, identical body for unknown and foreign ids. */
export interface IAssertCollectionOwnerUseCase {
  assertCollectionOwner(input: AssertCollectionOwnerRequestDTO): Promise<void>;
}

/** Contended mutation. AD-COL-2. One prompt, one set of entries, whatever the double clicks. */
export interface IAcceptPromptUseCase {
  acceptPrompt(input: AcceptPromptRequestDTO): Promise<AcceptPromptResponseDTO>;
}

/** Resolver. FR-COL-5. null for an unknown set; completionPercent null when the set has no cards. */
export interface IGetSetCompletionUseCase {
  getSetCompletion(input: GetSetCompletionRequestDTO): Promise<GetSetCompletionResponseDTO>;
}

export type ColUseCases = IAssertCollectionOwnerUseCase & IAcceptPromptUseCase & IGetSetCompletionUseCase;

export interface ColDeps {
  collections: ICollectionRepository;
  prompts: IPromptRepository;
  catalog: CatalogForCollections;
  transactions: TransactionRunner;
  clock: Clock;
  ids: IdGenerator;
}

/** Interface stub (Solutioning stop-point). */
export class ColService implements ColUseCases {
  constructor(protected readonly deps: ColDeps) {}

  async assertCollectionOwner(_input: AssertCollectionOwnerRequestDTO): Promise<void> {
    throw new NotImplementedError('collections.assertCollectionOwner');
  }

  async acceptPrompt(_input: AcceptPromptRequestDTO): Promise<AcceptPromptResponseDTO> {
    throw new NotImplementedError('collections.acceptPrompt');
  }

  async getSetCompletion(_input: GetSetCompletionRequestDTO): Promise<GetSetCompletionResponseDTO> {
    throw new NotImplementedError('collections.getSetCompletion');
  }
}
