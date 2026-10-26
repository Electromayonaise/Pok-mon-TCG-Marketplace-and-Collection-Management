// Driven adapters (persistence) — commission. Bound to the Solu-1 migration 006_create_commission.sql (retired; git 853449c:docs/solu-1/planning/schemas/).
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql } from '../../../shared-kernel/ports.js';
import type { CommissionAccountDTO } from '../dto/com.dto.js';
import type { ICommissionAccountRepository, ICommissionLedgerRepository, ITopUpRepository } from '../ports/com.js';

export class PgCommissionLedgerRepository implements ICommissionLedgerRepository {
  constructor(protected readonly sql: Sql) {}
  async deductionExists(): Promise<boolean> {
    throw new NotImplementedError('PgCommissionLedgerRepository.deductionExists');
  }
  async rateAt(): Promise<bigint> {
    throw new NotImplementedError('PgCommissionLedgerRepository.rateAt');
  }
  async applyDeduction(): Promise<never> {
    throw new NotImplementedError('PgCommissionLedgerRepository.applyDeduction');
  }
}

export class PgCommissionAccountRepository implements ICommissionAccountRepository {
  constructor(protected readonly sql: Sql) {}
  async find(): Promise<CommissionAccountDTO | null> {
    throw new NotImplementedError('PgCommissionAccountRepository.find');
  }
}

export class PgTopUpRepository implements ITopUpRepository {
  constructor(protected readonly sql: Sql) {}
  async ownedBy(): Promise<boolean> {
    throw new NotImplementedError('PgTopUpRepository.ownedBy');
  }
}
