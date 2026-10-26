// Driven adapters (persistence) — identity. Bound to
// docs/solu-1/planning/schemas/001_create_identity_user_and_profile.sql and
// 002_create_identity_business_application.sql (the Solu-1 stubs below), and the Solu-2
// PgIdnRepository at the end, bound to docs/solu-2/planning/detailed-design/schemas.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { ApplicationStatus, AuthThrottleScope, CapabilityFacts, SellerTrack } from '../domain/idn.js';
import type { LatestApplicationSnapshot } from '../domain/ver.js';
import type { PaymentInstructionsDTO } from '../dto/ver.dto.js';
import type { IUserRepository } from '../ports/idn.js';
import type { IdnRepository, IndividualProfileRow } from '../ports/idn.v2.js';
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

/**
 * The Solu-2 repository of IDN (`IdnRepository`, AD-8). Every statement runs on the caller's
 * `tx`. Proven by idn_contracts › IDN-1.
 */
export class PgIdnRepository implements IdnRepository {
  async claimSellerTrack(tx: Tx, userId: CuidId, track: SellerTrack, now: IsoInstant): Promise<0 | 1> {
    // IDN-1 Q1: the two WHERE predicates are the exclusivity rule (AD-IDN-2 rule 3, AD-18).
    const guard = track === 'individual' ? `"sellerTrack" IS NULL` : `"sellerTrack" IS DISTINCT FROM 'individual'`;
    const { rowCount } = await tx.query(
      `UPDATE "User" SET "sellerTrack" = $2, "updatedAt" = $3 WHERE id = $1 AND ${guard} RETURNING id`,
      [userId, track, now],
    );
    return rowCount === 1 ? 1 : 0;
  }

  async readTrackAndLatestStatus(tx: Tx, userId: CuidId): Promise<{ sellerTrack: SellerTrack | null; latestApplicationStatus: ApplicationStatus | null }> {
    const { rows } = await tx.query<{ sellerTrack: SellerTrack | null; latestApplicationStatus: ApplicationStatus | null }>(
      `SELECT u."sellerTrack",
              (SELECT a.status FROM "BusinessApplication" a WHERE a."businessId" = u.id
                ORDER BY a."submittedAt" DESC, a.id DESC LIMIT 1) AS "latestApplicationStatus"
         FROM "User" u WHERE u.id = $1`,
      [userId],
    );
    return rows[0] ?? { sellerTrack: null, latestApplicationStatus: null };
  }

  async insertIndividualProfile(tx: Tx, row: IndividualProfileRow, now: IsoInstant): Promise<void> {
    await tx.query(
      `INSERT INTO "IndividualSellerProfile" ("userId", "displayName", "contactPhoneE164", "phoneSharingConsentAt", "phoneSharingConsentVersion",
         "meetingLat", "meetingLng", "meetingCity", "completedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
      [row.userId, row.displayName, row.contactPhoneE164, row.phoneSharingConsentAt, row.phoneSharingConsentVersion,
        row.meetingLat, row.meetingLng, row.meetingCity, row.completedAt, now],
    );
  }

  async readCapabilityFacts(tx: Tx, userId: CuidId): Promise<CapabilityFacts | null> {
    // AD-IDN-1 rule 1 for one user: the latest application by ("submittedAt" DESC, id DESC).
    const { rows } = await tx.query<{
      emailVerified: boolean; signupConsentAt: Date | null; isAdmin: boolean; sellerTrack: SellerTrack | null; hasIndividualProfile: boolean;
      appId: CuidId | null; status: ApplicationStatus | null; decidedAt: Date | null; reapplyNotBefore: Date | null; barred: boolean | null;
    }>(
      `SELECT u."emailVerified", u."signupConsentAt", u."isAdmin", u."sellerTrack",
              EXISTS (SELECT 1 FROM "IndividualSellerProfile" p WHERE p."userId" = u.id) AS "hasIndividualProfile",
              a.id AS "appId", a.status, a."decidedAt", a."reapplyNotBefore", a."reapplyBarred" AS barred
         FROM "User" u
         LEFT JOIN LATERAL (SELECT * FROM "BusinessApplication" b WHERE b."businessId" = u.id
                             ORDER BY b."submittedAt" DESC, b.id DESC LIMIT 1) a ON true
        WHERE u.id = $1`,
      [userId],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      emailVerified: r.emailVerified,
      signupConsentAt: iso(r.signupConsentAt),
      isAdmin: r.isAdmin,
      sellerTrack: r.sellerTrack,
      hasIndividualProfile: r.hasIndividualProfile,
      latestApplication: r.appId === null || r.status === null ? null : {
        id: r.appId, status: r.status, decidedAt: iso(r.decidedAt), reapplyNotBefore: iso(r.reapplyNotBefore), barred: r.barred ?? false,
      },
    };
  }

  async readThrottleCutoff(tx: Tx, q: { scope: AuthThrottleScope; key: string; since: IsoInstant; until: IsoInstant; limit: number }): Promise<IsoInstant | null> {
    // One row from the (scope, key, "createdAt") index: the limit-th newest in the window.
    const { rows } = await tx.query<{ createdAt: Date }>(
      `SELECT "createdAt" FROM "AuthThrottleEvent"
        WHERE scope = $1 AND key = $2 AND "createdAt" > $3 AND "createdAt" <= $4
        ORDER BY "createdAt" DESC OFFSET $5 LIMIT 1`,
      [q.scope, q.key, q.since, q.until, q.limit - 1],
    );
    return iso(rows[0]?.createdAt ?? null);
  }
}

const iso = (d: Date | null): IsoInstant | null => (d === null ? null : d.toISOString());
