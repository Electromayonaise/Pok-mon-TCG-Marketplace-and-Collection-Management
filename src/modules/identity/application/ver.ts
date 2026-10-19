import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Clock, IdGenerator, Outbox, TransactionRunner, Tx } from '../../../shared-kernel/ports.js';
import type {
  AssertCanSubmitApplicationRequestDTO,
  DecideApplicationRequestDTO,
  DecideApplicationResponseDTO,
  GetBusinessPaymentInstructionsRequestDTO,
  GetBusinessPaymentInstructionsResponseDTO,
} from '../dto/ver.dto.js';
import type { IBusinessApplicationRepository, IBusinessProfileRepository, IRejectionReasonRepository } from '../ports/ver.js';

// Inbound ports (use cases) — VER, contracts.md §2.

/** Guard. FR-VER-1 r2–4, FR-VER-6. Runs inside verification.submit after claimSellerTrack. */
export interface IAssertCanSubmitApplicationUseCase {
  assertCanSubmitApplication(tx: Tx, input: AssertCanSubmitApplicationRequestDTO): Promise<void>;
}

/** Contended mutation. AD-VER-1. One terminal transition per application. */
export interface IDecideApplicationUseCase {
  decideApplication(input: DecideApplicationRequestDTO): Promise<DecideApplicationResponseDTO>;
}

/** Resolver. FR-VER-9. null when not Approved. */
export interface IGetBusinessPaymentInstructionsUseCase {
  getBusinessPaymentInstructions(input: GetBusinessPaymentInstructionsRequestDTO): Promise<GetBusinessPaymentInstructionsResponseDTO>;
}

export type VerUseCases = IAssertCanSubmitApplicationUseCase & IDecideApplicationUseCase & IGetBusinessPaymentInstructionsUseCase;

export interface VerDeps {
  applications: IBusinessApplicationRepository;
  reasons: IRejectionReasonRepository;
  profiles: IBusinessProfileRepository;
  transactions: TransactionRunner;
  outbox: Outbox;
  clock: Clock;
  ids: IdGenerator;
}

/** Interface stub (Solutioning stop-point). */
export class VerService implements VerUseCases {
  constructor(protected readonly deps: VerDeps) {}

  async assertCanSubmitApplication(_tx: Tx, _input: AssertCanSubmitApplicationRequestDTO): Promise<void> {
    throw new NotImplementedError('identity.assertCanSubmitApplication');
  }

  async decideApplication(_input: DecideApplicationRequestDTO): Promise<DecideApplicationResponseDTO> {
    throw new NotImplementedError('identity.decideApplication');
  }

  async getBusinessPaymentInstructions(_input: GetBusinessPaymentInstructionsRequestDTO): Promise<GetBusinessPaymentInstructionsResponseDTO> {
    throw new NotImplementedError('identity.getBusinessPaymentInstructions');
  }
}
