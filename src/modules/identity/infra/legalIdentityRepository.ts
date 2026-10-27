// Driven adapter — the only reader and writer of the regulated legal identity (AD-13, AD-VER-2
// rule 1; lint `tezg/legal-identity-confined`). Its values go into the row and back to the
// caller only: never into an error, a log line, an audit row or a `RETURNING` clause.
import type { Tx } from '../../../shared-kernel/ports.js';
import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { ApplicationForReviewRow, LegalIdentityRow, VerRepository } from '../ports/ver.v2.js';

export class PgLegalIdentityRepository implements Pick<VerRepository, 'insertLegalIdentity' | 'readForReview'> {
  async insertLegalIdentity(tx: Tx, row: LegalIdentityRow, now: IsoInstant): Promise<void> {
    await tx.query(
      `INSERT INTO "BusinessApplicationLegalIdentity" ("applicationId", type, number, "documentKeys", "createdAt")
       VALUES ($1, $2, $3, $4, $5)`,
      [row.applicationId, row.type, row.number, row.documentKeys, now],
    );
  }

  /** VER-3 Q2: the one instrumented read (AD-VER-2 rule 5); the caller logs it in the same transaction. */
  async readForReview(tx: Tx, applicationId: CuidId): Promise<ApplicationForReviewRow | null> {
    const { rows } = await tx.query<Omit<ApplicationForReviewRow, 'submittedAt'> & { submittedAt: Date }>(
      `SELECT a.id AS "applicationId", a."businessId", a."businessName", a.city, a."externalPresenceUrl", a."submittedAt", a.status,
              l.type, l.number, l."documentKeys"
         FROM "BusinessApplication" a JOIN "BusinessApplicationLegalIdentity" l ON l."applicationId" = a.id
        WHERE a.id = $1`,
      [applicationId],
    );
    const r = rows[0];
    return r === undefined ? null : { ...r, submittedAt: r.submittedAt.toISOString() };
  }
}
