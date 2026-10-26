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
import type { ApplicationRow, BusinessProfileRow, VerRepository } from '../ports/ver.v2.js';

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
    return (await this.readCapabilityFactsMany(tx, [userId])).get(userId) ?? null;
  }

  async readCapabilityFactsMany(tx: Tx, userIds: readonly CuidId[]): Promise<Map<CuidId, CapabilityFacts>> {
    // AD-IDN-1 rule 1: the latest application by ("submittedAt" DESC, id DESC), one statement for every id.
    const { rows } = await tx.query<{
      id: CuidId; emailVerified: boolean; signupConsentAt: Date | null; isAdmin: boolean; sellerTrack: SellerTrack | null; hasIndividualProfile: boolean;
      appId: CuidId | null; status: ApplicationStatus | null; decidedAt: Date | null; reapplyNotBefore: Date | null; barred: boolean | null;
    }>(
      `SELECT u.id, u."emailVerified", u."signupConsentAt", u."isAdmin", u."sellerTrack",
              EXISTS (SELECT 1 FROM "IndividualSellerProfile" p WHERE p."userId" = u.id) AS "hasIndividualProfile",
              a.id AS "appId", a.status, a."decidedAt", a."reapplyNotBefore", a."reapplyBarred" AS barred
         FROM "User" u
         LEFT JOIN LATERAL (SELECT * FROM "BusinessApplication" b WHERE b."businessId" = u.id
                             ORDER BY b."submittedAt" DESC, b.id DESC LIMIT 1) a ON true
        WHERE u.id = ANY($1)`,
      [userIds],
    );
    return new Map(rows.map((r) => [r.id, {
      emailVerified: r.emailVerified,
      signupConsentAt: iso(r.signupConsentAt),
      isAdmin: r.isAdmin,
      sellerTrack: r.sellerTrack,
      hasIndividualProfile: r.hasIndividualProfile,
      latestApplication: r.appId === null || r.status === null ? null : {
        id: r.appId, status: r.status, decidedAt: iso(r.decidedAt), reapplyNotBefore: iso(r.reapplyNotBefore), barred: r.barred ?? false,
      },
    }]));
  }

  async insertCapabilityAuditRead(tx: Tx, row: { id: CuidId; adminId: CuidId; targetUserId: CuidId; createdAt: IsoInstant }): Promise<void> {
    await tx.query(
      `INSERT INTO "CapabilityAuditRead" (id, "adminId", "targetUserId", "createdAt") VALUES ($1, $2, $3, $4)`,
      [row.id, row.adminId, row.targetUserId, row.createdAt],
    );
  }

  async readContactCard(tx: Tx, userId: CuidId): Promise<{ displayName: string; contactPhoneE164: string } | null> {
    const { rows } = await tx.query<{ displayName: string; contactPhoneE164: string }>(
      `SELECT "displayName", "contactPhoneE164" FROM "IndividualSellerProfile" WHERE "userId" = $1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  async readDisplayNames(tx: Tx, userIds: readonly CuidId[]): Promise<Map<CuidId, string>> {
    const { rows } = await tx.query<{ id: CuidId; displayName: string }>(
      `SELECT u.id, COALESCE(p."displayName", u.name) AS "displayName"
         FROM "User" u LEFT JOIN "IndividualSellerProfile" p ON p."userId" = u.id
        WHERE u.id = ANY($1)`,
      [userIds],
    );
    return new Map(rows.map((r) => [r.id, r.displayName]));
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

/**
 * The Solu-2 repository of VER, minus the legal identity (`legalIdentityRepository.ts`, AD-VER-2
 * rule 1). Every statement runs on the caller's `tx`; every instant is a bound parameter.
 * Proven by ver_contracts › VER-2.
 */
export class PgVerRepository implements Omit<VerRepository, keyof IdnRepository | 'insertLegalIdentity'> {
  async readLatestApplication(tx: Tx, businessId: CuidId): Promise<(LatestApplicationSnapshot & { id: CuidId; submittedAt: IsoInstant }) | null> {
    const { rows } = await tx.query<{ id: CuidId; status: ApplicationStatus; reapplyBarred: boolean; reapplyNotBefore: Date | null; submittedAt: Date }>(
      `SELECT id, status, "reapplyBarred", "reapplyNotBefore", "submittedAt" FROM "BusinessApplication"
        WHERE "businessId" = $1 ORDER BY "submittedAt" DESC, id DESC LIMIT 1`,
      [businessId],
    );
    const r = rows[0];
    return r === undefined ? null : { ...r, submittedAt: r.submittedAt.toISOString() };
  }

  async insertApplication(tx: Tx, row: ApplicationRow, now: IsoInstant): Promise<boolean> {
    // The savepoint keeps `tx` usable after a 23505, so the caller can still cite the winner's
    // "submittedAt" (25P02 never occurs; the same pattern as MSG-1's retry).
    await tx.query('SAVEPOINT ver_insert_application');
    try {
      await tx.query(
        `INSERT INTO "BusinessApplication" (id, "businessId", status, "businessName", city, "externalPresenceUrl",
           "submittedAt", "consentAt", "consentVersion", "createdAt", "updatedAt")
         VALUES ($1, $2, 'Pending', $3, $4, $5, $6, $6, $7, $6, $6)`,
        [row.id, row.businessId, row.businessName, row.city, row.externalPresenceUrl, now, row.consentVersion],
      );
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code !== '23505' || pgError.constraint !== 'business_application_one_pending') throw error;
      await tx.query('ROLLBACK TO SAVEPOINT ver_insert_application');
      return false;
    }
    await tx.query('RELEASE SAVEPOINT ver_insert_application');
    return true;
  }

  async upsertBusinessProfile(tx: Tx, row: BusinessProfileRow, now: IsoInstant): Promise<void> {
    await tx.query(
      `INSERT INTO "BusinessProfile" ("businessId", "publicName", city, "externalPresenceUrl", "bankName", "accountType",
         "accountNumber", "holderName", "qrObjectKey", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
       ON CONFLICT ("businessId") DO UPDATE SET
         "publicName" = EXCLUDED."publicName", city = EXCLUDED.city, "externalPresenceUrl" = EXCLUDED."externalPresenceUrl",
         "bankName" = EXCLUDED."bankName", "accountType" = EXCLUDED."accountType", "accountNumber" = EXCLUDED."accountNumber",
         "holderName" = EXCLUDED."holderName", "qrObjectKey" = EXCLUDED."qrObjectKey", "updatedAt" = EXCLUDED."updatedAt"`,
      [row.businessId, row.publicName, row.city, row.externalPresenceUrl, row.bankName, row.accountType,
        row.accountNumber, row.holderName, row.qrObjectKey, now],
    );
  }
}

const iso = (d: Date | null): IsoInstant | null => (d === null ? null : d.toISOString());
