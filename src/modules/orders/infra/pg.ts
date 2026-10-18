// Driven adapter (persistence) — orders. Bound to docs/solu-1/planning/schemas/005_create_orders.sql.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql } from '../../../shared-kernel/ports.js';
import type { IOrderRepository } from '../ports/ord.js';

export class PgOrderRepository implements IOrderRepository {
  constructor(protected readonly sql: Sql) {}
  async visibleTo(): Promise<null> {
    throw new NotImplementedError('PgOrderRepository.visibleTo');
  }
  async setPaidConditionally(): Promise<0 | 1> {
    throw new NotImplementedError('PgOrderRepository.setPaidConditionally');
  }
  async readFacts(): Promise<null> {
    throw new NotImplementedError('PgOrderRepository.readFacts');
  }
  async expireConditionally(): Promise<null> {
    throw new NotImplementedError('PgOrderRepository.expireConditionally');
  }
  async closedPurchase(): Promise<never> {
    throw new NotImplementedError('PgOrderRepository.closedPurchase');
  }
}
