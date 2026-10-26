// Driven adapter — the only reader and writer of the regulated legal identity (AD-13, AD-VER-2
// rule 1; lint `tezg/legal-identity-confined`). Its values go into the row and back to the
// caller only: never into an error, a log line, an audit row or a `RETURNING` clause.
import type { Tx } from '../../../shared-kernel/ports.js';
import type { IsoInstant } from '../../../shared-kernel/types.js';
import type { LegalIdentityRow, VerRepository } from '../ports/ver.v2.js';

export class PgLegalIdentityRepository implements Pick<VerRepository, 'insertLegalIdentity'> {
  async insertLegalIdentity(tx: Tx, row: LegalIdentityRow, now: IsoInstant): Promise<void> {
    await tx.query(
      `INSERT INTO "BusinessApplicationLegalIdentity" ("applicationId", type, number, "documentKeys", "createdAt")
       VALUES ($1, $2, $3, $4, $5)`,
      [row.applicationId, row.type, row.number, row.documentKeys, now],
    );
  }
}
