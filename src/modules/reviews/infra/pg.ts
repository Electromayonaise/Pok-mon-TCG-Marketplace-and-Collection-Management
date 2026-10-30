// Driven adapters (persistence) — reviews. The Solu-1 stub below is bound to the retired migration 010_create_reviews.sql
// (git 853449c:docs/solu-1/planning/schemas/); the Solu-2 PgRepRepository at the end is bound to
// _bmad-output/planning-artifacts/detailed-design/schemas.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { IReviewRepository } from '../ports/rep.js';
import type { NewReview, PairReview, RepRepository } from '../ports/rep.v2.js';

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

/** REP's own tables (AD-8): `"Review"` and `"ReviewModerationLog"`. `DELETE` is revoked on `"Review"` (AD-12). */
export class PgRepRepository implements RepRepository {
  async insertReview(tx: Tx, r: NewReview): Promise<'inserted' | 'duplicate'> {
    await tx.query('SAVEPOINT review_insert');
    try {
      await tx.query(
        `INSERT INTO "Review" (id, "reviewerId", "targetUserId", "targetKind", "purchaseVerified", rating, text, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
        [r.id, r.reviewerId, r.targetUserId, r.targetKind, r.purchaseVerified, r.rating, r.text, r.now],
      );
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code !== '23505' || pgError.constraint !== 'review_one_per_pair') throw error;
      await tx.query('ROLLBACK TO SAVEPOINT review_insert');
      return 'duplicate';
    }
    await tx.query('RELEASE SAVEPOINT review_insert');
    return 'inserted';
  }

  async editVisibleReview(tx: Tx, e: { reviewId: CuidId; reviewerId: CuidId; rating: number; text: string; now: IsoInstant }): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE "Review" SET rating = $3, text = $4, "editedAt" = $5, "updatedAt" = $5, version = version + 1
       WHERE id = $1 AND "reviewerId" = $2 AND "hiddenAt" IS NULL`,
      [e.reviewId, e.reviewerId, e.rating, e.text, e.now],
    );
    return rowCount === 1;
  }

  async readReviewOfPair(tx: Tx, reviewerId: CuidId, targetUserId: CuidId): Promise<PairReview | null> {
    const { rows } = await tx.query<PairReview>(
      `SELECT id AS "reviewId", rating, text, "hiddenAt" IS NOT NULL AS hidden FROM "Review" WHERE "reviewerId" = $1 AND "targetUserId" = $2`,
      [reviewerId, targetUserId],
    );
    return rows[0] ?? null;
  }
}
