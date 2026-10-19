// Driven adapters (persistence) — identity. Bound to
// docs/solu-1/planning/schemas/001_create_identity_user_and_profile.sql and
// 002_create_identity_business_application.sql. Stubs until their stories are implemented.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { CuidId } from '../../../shared-kernel/types.js';
import type { ApplicationStatus, CapabilityFacts, SellerTrack } from '../domain/idn.js';
import type { LatestApplicationSnapshot } from '../domain/ver.js';
import type { PaymentInstructionsDTO } from '../dto/ver.dto.js';
import type { IUserRepository } from '../ports/idn.js';
import type { IBusinessApplicationRepository, IBusinessProfileRepository, IRejectionReasonRepository } from '../ports/ver.js';

export class PgUserRepository implements IUserRepository {
  constructor(protected readonly sql: Sql) {}
  async loadFacts(_userIds: readonly CuidId[]): Promise<Map<CuidId, CapabilityFacts>> {
    throw new NotImplementedError('PgUserRepository.loadFacts');
  }
  async claimTrackConditionally(_tx: Tx, _userId: CuidId, _track: SellerTrack): Promise<0 | 1> {
    throw new NotImplementedError('PgUserRepository.claimTrackConditionally');
  }
  async readTrackAndLatestStatus(_tx: Tx, _userId: CuidId): Promise<{ sellerTrack: SellerTrack | null; latestStatus: ApplicationStatus | null }> {
    throw new NotImplementedError('PgUserRepository.readTrackAndLatestStatus');
  }
}

export class PgBusinessApplicationRepository implements IBusinessApplicationRepository {
  constructor(protected readonly sql: Sql) {}
  async latestFor(_tx: Tx, _businessId: CuidId): Promise<LatestApplicationSnapshot | null> {
    throw new NotImplementedError('PgBusinessApplicationRepository.latestFor');
  }
  async transitionFromPending(): Promise<0 | 1> {
    throw new NotImplementedError('PgBusinessApplicationRepository.transitionFromPending');
  }
  async readStatus(): Promise<null> {
    throw new NotImplementedError('PgBusinessApplicationRepository.readStatus');
  }
  async insertDecisionLog(): Promise<void> {
    throw new NotImplementedError('PgBusinessApplicationRepository.insertDecisionLog');
  }
}

export class PgRejectionReasonRepository implements IRejectionReasonRepository {
  constructor(protected readonly sql: Sql) {}
  async findActiveForShare(): Promise<{ barred: boolean; cooldownDays: number | null } | null> {
    throw new NotImplementedError('PgRejectionReasonRepository.findActiveForShare');
  }
}

export class PgBusinessProfileRepository implements IBusinessProfileRepository {
  constructor(protected readonly sql: Sql) {}
  async paymentInstructionsIfApproved(_businessId: CuidId): Promise<PaymentInstructionsDTO | null> {
    throw new NotImplementedError('PgBusinessProfileRepository.paymentInstructionsIfApproved');
  }
}
