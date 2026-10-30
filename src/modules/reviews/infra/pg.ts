// Driven adapters (persistence) — reviews. The Solu-1 stub below is bound to the retired migration 010_create_reviews.sql
// (git 853449c:docs/solu-1/planning/schemas/); the Solu-2 PgRepRepository at the end is bound to
// _bmad-output/planning-artifacts/detailed-design/schemas.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { IReviewRepository } from '../ports/rep.js';
import type { ReviewHideReason } from '../domain/rep.js';
import type { NewReview, NewReviewModerationLog, PairReview, RepRepository, ReviewSnapshot } from '../ports/rep.v2.js';

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

  async hideVisibleReview(tx: Tx, h: { reviewId: CuidId; reasonCode: ReviewHideReason; adminId: CuidId; now: IsoInstant }): Promise<ReviewSnapshot | null> {
    const { rows } = await tx.query<ReviewSnapshot>(
      `UPDATE "Review" SET "hiddenAt" = $2, "hiddenReason" = $3, "hiddenBy" = $4, "updatedAt" = $2, version = version + 1
       WHERE id = $1 AND "hiddenAt" IS NULL RETURNING rating, text`,
      [h.reviewId, h.now, h.reasonCode, h.adminId],
    );
    return rows[0] ?? null;
  }

  async unhideHiddenReview(tx: Tx, u: { reviewId: CuidId; now: IsoInstant }): Promise<ReviewSnapshot | null> {
    const { rows } = await tx.query<ReviewSnapshot>(
      `UPDATE "Review" SET "hiddenAt" = NULL, "hiddenReason" = NULL, "hiddenBy" = NULL, "updatedAt" = $2, version = version + 1
       WHERE id = $1 AND "hiddenAt" IS NOT NULL RETURNING rating, text`,
      [u.reviewId, u.now],
    );
    return rows[0] ?? null;
  }

  async readReviewHide(tx: Tx, reviewId: CuidId): Promise<{ hiddenAt: IsoInstant | null; hiddenBy: CuidId | null } | null> {
    const { rows } = await tx.query<{ hiddenAt: Date | null; hiddenBy: CuidId | null }>(`SELECT "hiddenAt", "hiddenBy" FROM "Review" WHERE id = $1`, [reviewId]);
    const row = rows[0];
    return row === undefined ? null : { hiddenAt: row.hiddenAt?.toISOString() ?? null, hiddenBy: row.hiddenBy };
  }

  async insertReviewModerationLog(tx: Tx, l: NewReviewModerationLog): Promise<void> {
    await tx.query(
      `INSERT INTO "ReviewModerationLog" (id, "reviewId", action, "reasonCode", note, "adminId", "ratingSnapshot", "textSnapshot", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [l.id, l.reviewId, l.action, l.reasonCode, l.note, l.adminId, l.snapshot.rating, l.snapshot.text, l.now],
    );
  }

  async visibleReviewTotals(tx: Tx, sellerIds: readonly CuidId[]): Promise<{ sellerId: CuidId; count: bigint; sum: bigint }[]> {
    const { rows } = await tx.query<{ sellerId: CuidId; count: string; sum: string }>(
      `SELECT "targetUserId" AS "sellerId", count(*)::text AS count, sum(rating)::text AS sum
       FROM "Review" WHERE "hiddenAt" IS NULL AND "targetUserId" = ANY($1) GROUP BY "targetUserId"`,
      [sellerIds],
    );
    return rows.map((r) => ({ sellerId: r.sellerId, count: BigInt(r.count), sum: BigInt(r.sum) }));
  }
}
