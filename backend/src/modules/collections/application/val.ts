import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Clock, TransactionRunner } from '../../../shared-kernel/ports.js';
import type {
  AssertValuationPeriodRequestDTO,
  ChangePercentRequestDTO,
  ChangePercentResponseDTO,
  ValuationDTO,
  ValueCollectionRequestDTO,
} from '../dto/val.dto.js';
import type { CatalogForCollections, ICollectionRepository } from '../ports/collections.js';

// Inbound ports (use cases) — VAL, contracts.md §11.

/** Guard. FR-VAL-2. Pure; throws InvalidValuationPeriod. */
export interface IAssertValuationPeriodUseCase {
  assertValuationPeriod(input: AssertValuationPeriodRequestDTO): void;
}

/** Concurrency-safe read (decision log #4, GAP-2): one REPEATABLE READ snapshot; zero writes. */
export interface IValueCollectionUseCase {
  valueCollection(input: ValueCollectionRequestDTO): Promise<ValuationDTO>;
}

/** Resolver. FR-VAL-2, ADD-§2.2. Pure; null on a zero baseline. */
export interface IChangePercentUseCase {
  changePercent(input: ChangePercentRequestDTO): ChangePercentResponseDTO;
}

export type ValUseCases = IAssertValuationPeriodUseCase & IValueCollectionUseCase & IChangePercentUseCase;

export interface ValDeps {
  collections: ICollectionRepository;
  catalog: CatalogForCollections;
  transactions: TransactionRunner;
  clock: Clock;
}

/** Interface stub (Solutioning stop-point). */
export class ValService implements ValUseCases {
  constructor(protected readonly deps: ValDeps) {}

  assertValuationPeriod(_input: AssertValuationPeriodRequestDTO): void {
    throw new NotImplementedError('collections.assertValuationPeriod');
  }

  async valueCollection(_input: ValueCollectionRequestDTO): Promise<ValuationDTO> {
    throw new NotImplementedError('collections.valueCollection');
  }

  changePercent(_input: ChangePercentRequestDTO): ChangePercentResponseDTO {
    throw new NotImplementedError('collections.changePercent');
  }
}
