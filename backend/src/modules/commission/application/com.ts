import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Clock, IdGenerator, Outbox, Tx } from '../../../shared-kernel/ports.js';
import type {
  ApplyOrderDeductionResponseDTO,
  AssertTopUpVisibleRequestDTO,
  FindCommissionAccountRequestDTO,
  FindCommissionAccountResponseDTO,
  OrderCommissionEventDTO,
} from '../dto/com.dto.js';
import type { ICommissionAccountRepository, ICommissionLedgerRepository, ITopUpRepository } from '../ports/com.js';

// Inbound ports (use cases) — COM, contracts.md §7.

/** Guard. FR-COM-3, AD-COM-3 rule 4. TopUpNotVisibleToCaller, identical body for unknown ids. */
export interface IAssertTopUpVisibleUseCase {
  assertTopUpVisible(input: AssertTopUpVisibleRequestDTO): Promise<void>;
}

/**
 * Contended mutation, driven by the outbox subscribers onOrderPaymentConfirmedByBusiness and
 * onOrderClosed. Runs in the delivery's handler tx (AD-SYS-2 rule 4 step 2). Never refused.
 */
export interface IApplyOrderDeductionUseCase {
  applyOrderDeduction(tx: Tx, event: OrderCommissionEventDTO): Promise<ApplyOrderDeductionResponseDTO>;
}

/** Resolver. FR-COM-8. null when no account has been opened. */
export interface IFindCommissionAccountUseCase {
  findCommissionAccount(input: FindCommissionAccountRequestDTO): Promise<FindCommissionAccountResponseDTO>;
}

export type ComUseCases = IAssertTopUpVisibleUseCase & IApplyOrderDeductionUseCase & IFindCommissionAccountUseCase;

export interface ComDeps {
  ledger: ICommissionLedgerRepository;
  accounts: ICommissionAccountRepository;
  topUps: ITopUpRepository;
  outbox: Outbox;
  clock: Clock;
  ids: IdGenerator;
}

/** Interface stub (Solutioning stop-point). */
export class ComService implements ComUseCases {
  constructor(protected readonly deps: ComDeps) {}

  async assertTopUpVisible(_input: AssertTopUpVisibleRequestDTO): Promise<void> {
    throw new NotImplementedError('commission.assertTopUpVisible');
  }

  async applyOrderDeduction(_tx: Tx, _event: OrderCommissionEventDTO): Promise<ApplyOrderDeductionResponseDTO> {
    throw new NotImplementedError('commission.applyOrderDeduction');
  }

  async findCommissionAccount(_input: FindCommissionAccountRequestDTO): Promise<FindCommissionAccountResponseDTO> {
    throw new NotImplementedError('commission.findCommissionAccount');
  }
}
