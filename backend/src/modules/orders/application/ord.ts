import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Clock, Outbox, TransactionRunner } from '../../../shared-kernel/ports.js';
import type {
  AssertOrderVisibleRequestDTO,
  AssertOrderVisibleResponseDTO,
  ConfirmPaidRequestDTO,
  ConfirmPaidResponseDTO,
  HasClosedPurchaseRequestDTO,
  HasClosedPurchaseResponseDTO,
} from '../dto/ord.dto.js';
import type { IOrderRepository, ListingsForOrders } from '../ports/ord.js';

// Inbound ports (use cases) — ORD, contracts.md §6.

/** Guard. FR-ORD-6, AD-15. One predicate; identical body for unknown and foreign ids. */
export interface IAssertOrderVisibleUseCase {
  assertOrderVisible(input: AssertOrderVisibleRequestDTO): Promise<AssertOrderVisibleResponseDTO>;
}

/** Contended mutation. AD-ORD-2. "paid" set once; paid-vs-expiry race has one winner. */
export interface IConfirmPaidUseCase {
  confirmPaid(input: ConfirmPaidRequestDTO): Promise<ConfirmPaidResponseDTO>;
}

/** Resolver. FR-ORD-9. { closed: false, latestState: null } when the pair has no order. */
export interface IHasClosedPurchaseUseCase {
  hasClosedPurchase(input: HasClosedPurchaseRequestDTO): Promise<HasClosedPurchaseResponseDTO>;
}

export type OrdUseCases = IAssertOrderVisibleUseCase & IConfirmPaidUseCase & IHasClosedPurchaseUseCase;

export interface OrdDeps {
  orders: IOrderRepository;
  listings: ListingsForOrders;
  transactions: TransactionRunner;
  outbox: Outbox;
  clock: Clock;
}

/** Interface stub (Solutioning stop-point). */
export class OrdService implements OrdUseCases {
  constructor(protected readonly deps: OrdDeps) {}

  async assertOrderVisible(_input: AssertOrderVisibleRequestDTO): Promise<AssertOrderVisibleResponseDTO> {
    throw new NotImplementedError('orders.assertOrderVisible');
  }

  async confirmPaid(_input: ConfirmPaidRequestDTO): Promise<ConfirmPaidResponseDTO> {
    throw new NotImplementedError('orders.confirmPaid');
  }

  async hasClosedPurchase(_input: HasClosedPurchaseRequestDTO): Promise<HasClosedPurchaseResponseDTO> {
    throw new NotImplementedError('orders.hasClosedPurchase');
  }
}
