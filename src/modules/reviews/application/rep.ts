import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Clock, IdGenerator, TransactionRunner } from '../../../shared-kernel/ports.js';
import type {
  AssertVerifiedPurchaserRequestDTO,
  AssertVerifiedPurchaserResponseDTO,
  GetAggregatesRequestDTO,
  GetAggregatesResponseDTO,
  HideReviewRequestDTO,
  HideReviewResponseDTO,
} from '../dto/rep.dto.js';
import type { IdentityForReviews, IReviewRepository, OrdersForReviews } from '../ports/rep.js';

// Inbound ports (use cases) — REP, contracts.md §12.

/** Guard. FR-REP-1/2. Read-only; TargetNotFound | NotVerifiedPurchaser. */
export interface IAssertVerifiedPurchaserUseCase {
  assertVerifiedPurchaser(input: AssertVerifiedPurchaserRequestDTO): Promise<AssertVerifiedPurchaserResponseDTO>;
}

/** Contended mutation. AD-REP-3. One log row per real transition; a double hide is an explained no-op. */
export interface IHideReviewUseCase {
  hideReview(input: HideReviewRequestDTO): Promise<HideReviewResponseDTO>;
}

/** Resolver. FR-REP-3. { averageTenths: null, count: 0 } for a seller with no visible review. */
export interface IGetAggregatesUseCase {
  getAggregates(input: GetAggregatesRequestDTO): Promise<GetAggregatesResponseDTO>;
}

export type RepUseCases = IAssertVerifiedPurchaserUseCase & IHideReviewUseCase & IGetAggregatesUseCase;

export interface RepDeps {
  reviews: IReviewRepository;
  identity: IdentityForReviews;
  orders: OrdersForReviews;
  transactions: TransactionRunner;
  clock: Clock;
  ids: IdGenerator;
}

/** Interface stub (Solutioning stop-point). */
export class RepService implements RepUseCases {
  constructor(protected readonly deps: RepDeps) {}

  async assertVerifiedPurchaser(_input: AssertVerifiedPurchaserRequestDTO): Promise<AssertVerifiedPurchaserResponseDTO> {
    throw new NotImplementedError('reviews.assertVerifiedPurchaser');
  }

  async hideReview(_input: HideReviewRequestDTO): Promise<HideReviewResponseDTO> {
    throw new NotImplementedError('reviews.hideReview');
  }

  async getAggregates(_input: GetAggregatesRequestDTO): Promise<GetAggregatesResponseDTO> {
    throw new NotImplementedError('reviews.getAggregates');
  }
}
