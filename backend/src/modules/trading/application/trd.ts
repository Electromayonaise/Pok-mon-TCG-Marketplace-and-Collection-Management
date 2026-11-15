import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Clock, Outbox, TransactionRunner } from '../../../shared-kernel/ports.js';
import type {
  AcceptOfferRequestDTO,
  AcceptOfferResponseDTO,
  AssertActorTurnRequestDTO,
  AssertActorTurnResponseDTO,
  FindOpenOfferRequestDTO,
  FindOpenOfferResponseDTO,
} from '../dto/trd.dto.js';
import type { ITradeOfferRepository, ListingsForTrading } from '../ports/trd.js';

// Inbound ports (use cases) — TRD, contracts.md §8.

/** Guard. FR-TRD-2/3. Read-only; the mutation re-asserts turn and version in its UPDATE. */
export interface IAssertActorTurnUseCase {
  assertActorTurn(input: AssertActorTurnRequestDTO): Promise<AssertActorTurnResponseDTO>;
}

/** Contended mutation. AD-TRD-2. Two accepts on one last unit never both commit. */
export interface IAcceptOfferUseCase {
  acceptOffer(input: AcceptOfferRequestDTO): Promise<AcceptOfferResponseDTO>;
}

/** Resolver. FR-TRD-1. null when no live Open offer exists. */
export interface IFindOpenOfferUseCase {
  findOpenOffer(input: FindOpenOfferRequestDTO): Promise<FindOpenOfferResponseDTO>;
}

export type TrdUseCases = IAssertActorTurnUseCase & IAcceptOfferUseCase & IFindOpenOfferUseCase;

export interface TrdDeps {
  offers: ITradeOfferRepository;
  listings: ListingsForTrading;
  transactions: TransactionRunner;
  outbox: Outbox;
  clock: Clock;
}

/** Interface stub (Solutioning stop-point). */
export class TrdService implements TrdUseCases {
  constructor(protected readonly deps: TrdDeps) {}

  async assertActorTurn(_input: AssertActorTurnRequestDTO): Promise<AssertActorTurnResponseDTO> {
    throw new NotImplementedError('trading.assertActorTurn');
  }

  async acceptOffer(_input: AcceptOfferRequestDTO): Promise<AcceptOfferResponseDTO> {
    throw new NotImplementedError('trading.acceptOffer');
  }

  async findOpenOffer(_input: FindOpenOfferRequestDTO): Promise<FindOpenOfferResponseDTO> {
    throw new NotImplementedError('trading.findOpenOffer');
  }
}
