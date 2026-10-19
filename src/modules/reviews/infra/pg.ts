// Driven adapter (persistence) — reviews. Bound to docs/solu-1/planning/schemas/010_create_reviews.sql.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql } from '../../../shared-kernel/ports.js';
import type { IReviewRepository } from '../ports/rep.js';

export class PgReviewRepository implements IReviewRepository {
  constructor(protected readonly sql: Sql) {}
  async hideConditionally(): Promise<null> {
    throw new NotImplementedError('PgReviewRepository.hideConditionally');
  }
  async readHide(): Promise<null> {
    throw new NotImplementedError('PgReviewRepository.readHide');
  }
  async insertModerationLog(): Promise<void> {
    throw new NotImplementedError('PgReviewRepository.insertModerationLog');
  }
  async sumsAndCounts(): Promise<never> {
    throw new NotImplementedError('PgReviewRepository.sumsAndCounts');
  }
}
