// Driven adapters (persistence) — listings. The Solu-1 stubs below are bound to the retired migration
// 004_create_listings_inventory.sql (git 853449c:docs/solu-1/planning/schemas/); the Solu-2
// PgInvRepository at the end is bound to _bmad-output/planning-artifacts/detailed-design/schemas.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { Condition, CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { AvailabilityCandidate, InvRepository, ListingDetailRow, ListingHeader, ListingUnit, NewListingRow, ReserveFacts, ResolvedUnit } from '../ports/inv.v2.js';
import type { IDiscoveryQuery, IInventoryUnitRepository, IListingRepository } from '../ports/listings.js';

export class PgListingRepository implements IListingRepository {
  constructor(protected readonly sql: Sql) {}
  async ownershipFacts(): Promise<null> {
    throw new NotImplementedError('PgListingRepository.ownershipFacts');
  }
  async purchaseFacts(): Promise<null> {
    throw new NotImplementedError('PgListingRepository.purchaseFacts');
  }
}

export class PgInventoryUnitRepository implements IInventoryUnitRepository {
  constructor(protected readonly sql: Sql) {}
  async unitsFor(): Promise<never> {
    throw new NotImplementedError('PgInventoryUnitRepository.unitsFor');
  }
  async decrementConditionally(): Promise<never> {
    throw new NotImplementedError('PgInventoryUnitRepository.decrementConditionally');
  }
  async exhaustedListingIds(): Promise<never> {
    throw new NotImplementedError('PgInventoryUnitRepository.exhaustedListingIds');
  }
  async snapshot(): Promise<never> {
    throw new NotImplementedError('PgInventoryUnitRepository.snapshot');
  }
}

export class PgDiscoveryQuery implements IDiscoveryQuery {
  constructor(protected readonly sql: Sql) {}
  async searchListings(): Promise<never> {
    throw new NotImplementedError('PgDiscoveryQuery.searchListings');
  }
  async availabilitySummary(): Promise<never> {
    throw new NotImplementedError('PgDiscoveryQuery.availabilitySummary');
  }
}

// ---------------------------------------------------------------- Solu-2 (AD-INV-1, AD-INV-2, AD-INV-3)

const VISIBLE = `("hiddenAt" IS NULL AND "withdrawnAt" IS NULL AND "deactivatedAt" IS NULL)`;
const HEADER_COLUMNS = `id, "sellerId", "sellerKindAtCreation", kind, ${VISIBLE} AS visible`;

/** The units a listing draws on (a single listing's unit with `perBundleQty` 1, or its bundle components), for listing `l`. */
const LISTING_UNITS = `
  SELECT s."inventoryUnitId" AS unit, 1 AS per FROM "Listing" s WHERE s.id = l.id AND s.kind = 'single'
  UNION ALL SELECT b."inventoryUnitId", b."perBundleQty" FROM "BundleComponent" b WHERE b."listingId" = l.id`;
/** AD-INV-1 rule 2 in SQL: listing `l`'s availability, computed at read; integer division floors a non-negative quantity. */
const AVAILABILITY_SQL = `(SELECT COALESCE(MIN(u.quantity / x.per), 0)::int FROM (${LISTING_UNITS}) x JOIN "InventoryUnit" u ON u.id = x.unit)`;

/** S-FR-INV-10: a listing's detail columns over `"Listing" l`, its unit `u` and its projection `c`. */
const DETAIL_COLUMNS = `l.id, l."sellerId", l."sellerKindAtCreation", l.kind, (l."hiddenAt" IS NULL AND l."withdrawnAt" IS NULL AND l."deactivatedAt" IS NULL) AS visible,
  l.title, u."catalogEntryId" AS "unitEntryId", l."priceCop"::text AS "priceCop", l."openToTrade", l."pausedAt" IS NOT NULL AS paused, l."hiddenReason",
  l."hiddenAt" IS NOT NULL AS hidden, l."withdrawnAt" IS NOT NULL AS withdrawn, l."deactivatedAt" IS NOT NULL AS deactivated, l.version,
  CASE WHEN c."businessId" IS NULL THEN 'absent' WHEN c.paused THEN 'paused' ELSE 'funded' END AS projection, c."lastAppliedSeq"::text AS "ledgerSeq",
  ${AVAILABILITY_SQL} AS availability, l."createdAt"`;
const DETAIL_FROM = `"Listing" l LEFT JOIN "InventoryUnit" u ON u.id = l."inventoryUnitId" LEFT JOIN "SellerCommissionState" c ON c."businessId" = l."sellerId"`;
type DetailRow = Omit<ListingDetailRow, 'priceCop' | 'createdAt' | 'ledgerSeq'> & { priceCop: string; createdAt: Date; ledgerSeq: string | null };
const detail = (r: DetailRow): ListingDetailRow => ({ ...r, priceCop: Number(r.priceCop), ledgerSeq: r.ledgerSeq === null ? null : Number(r.ledgerSeq), createdAt: r.createdAt.toISOString() });

/** INV's repository port over `_bmad-output/planning-artifacts/detailed-design/schemas` (AD-8). */
export class PgInvRepository implements InvRepository {
  async resolveUnit(tx: Tx, u: { id: CuidId; sellerId: CuidId; catalogEntryId: CuidId; condition: Condition; quantity: number; now: IsoInstant }): Promise<ResolvedUnit> {
    const inserted = await tx.query(
      `INSERT INTO "InventoryUnit" (id, "sellerId", "catalogEntryId", condition, quantity, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $6) ON CONFLICT ("sellerId", "catalogEntryId", condition) DO NOTHING RETURNING id`,
      [u.id, u.sellerId, u.catalogEntryId, u.condition, u.quantity, u.now],
    );
    const { rows } = await tx.query<{ id: CuidId; quantity: number }>(
      `SELECT id, quantity FROM "InventoryUnit" WHERE "sellerId" = $1 AND "catalogEntryId" = $2 AND condition = $3`,
      [u.sellerId, u.catalogEntryId, u.condition],
    );
    return { id: rows[0]!.id, quantity: rows[0]!.quantity, created: inserted.rowCount === 1 };
  }

  async readProjectionForShare(tx: Tx, businessId: CuidId): Promise<{ paused: boolean } | null> {
    const { rows } = await tx.query<{ paused: boolean }>(`SELECT paused FROM "SellerCommissionState" WHERE "businessId" = $1 FOR SHARE`, [businessId]);
    return rows[0] ?? null;
  }

  async insertListing(tx: Tx, r: NewListingRow): Promise<void> {
    await tx.query(
      `INSERT INTO "Listing" (id, "sellerId", "sellerKindAtCreation", kind, "inventoryUnitId", title, "priceCop", lat, lng, description, "openToTrade", "pausedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)`,
      [r.id, r.sellerId, r.sellerKindAtCreation, r.kind, r.inventoryUnitId, r.title, r.priceCop, r.location?.lat ?? null, r.location?.lng ?? null, r.description, r.openToTrade, r.pausedAt, r.now],
    );
  }

  async readReserveFacts(tx: Tx, listingId: CuidId): Promise<ReserveFacts | null> {
    const { rows } = await tx.query<Omit<ReserveFacts, 'units' | 'pausedAt' | 'priceCop'> & { pausedAt: Date | null; priceCop: string }>(
      `SELECT l.id, l."sellerId", l."sellerKindAtCreation", l.kind,
              (l."hiddenAt" IS NULL AND l."withdrawnAt" IS NULL AND l."deactivatedAt" IS NULL) AS visible, l.title, l."priceCop"::text AS "priceCop", l."pausedAt", l."openToTrade",
              CASE WHEN c."businessId" IS NULL THEN 'absent' WHEN c.paused THEN 'paused' ELSE 'funded' END AS projection
       FROM "Listing" l LEFT JOIN "SellerCommissionState" c ON c."businessId" = l."sellerId" WHERE l.id = $1`,
      [listingId],
    );
    const row = rows[0];
    if (!row) return null;
    const units = await tx.query<ListingUnit>(
      `SELECT u.id AS "inventoryUnitId", u."catalogEntryId", u.condition, u.quantity, x.per AS "perBundleQty"
       FROM (SELECT $1::text AS id) l, LATERAL (${LISTING_UNITS}) x JOIN "InventoryUnit" u ON u.id = x.unit ORDER BY u.id`,
      [listingId],
    );
    return { ...row, priceCop: Number(row.priceCop), pausedAt: row.pausedAt?.toISOString() ?? null, units: units.rows };
  }

  async decrementUnit(tx: Tx, unitId: CuidId, req: number, now: IsoInstant): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE "InventoryUnit" SET quantity = quantity - $2, "updatedAt" = $3 WHERE id = $1 AND quantity >= $2 RETURNING quantity`,
      [unitId, req, now],
    );
    return rowCount === 1;
  }

  async incrementUnit(tx: Tx, unitId: CuidId, qty: number, now: IsoInstant): Promise<boolean> {
    const { rowCount } = await tx.query(`UPDATE "InventoryUnit" SET quantity = quantity + $2, "updatedAt" = $3 WHERE id = $1`, [unitId, qty, now]);
    return rowCount === 1;
  }

  async unitQuantity(tx: Tx, unitId: CuidId): Promise<number | null> {
    const { rows } = await tx.query<{ quantity: number }>(`SELECT quantity FROM "InventoryUnit" WHERE id = $1`, [unitId]);
    return rows[0]?.quantity ?? null;
  }

  async exhaustedListingIds(tx: Tx, unitIds: CuidId[]): Promise<CuidId[]> {
    const { rows } = await tx.query<{ id: CuidId }>(
      `SELECT l.id FROM "Listing" l
       WHERE (l."inventoryUnitId" = ANY($1) OR EXISTS (SELECT 1 FROM "BundleComponent" b WHERE b."listingId" = l.id AND b."inventoryUnitId" = ANY($1)))
         AND ${AVAILABILITY_SQL} = 0
       ORDER BY l.id`,
      [unitIds],
    );
    return rows.map((r) => r.id);
  }

  async readListingHeader(tx: Tx, listingId: CuidId): Promise<ListingHeader | null> {
    const { rows } = await tx.query<ListingHeader>(`SELECT ${HEADER_COLUMNS} FROM "Listing" WHERE id = $1`, [listingId]);
    return rows[0] ?? null;
  }

  async upsertProjection(tx: Tx, p: { businessId: CuidId; seq: number; paused: boolean; now: IsoInstant }): Promise<boolean> {
    const { rowCount } = await tx.query(
      `INSERT INTO "SellerCommissionState" ("businessId", "lastAppliedSeq", paused, "appliedAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $4, $4)
       ON CONFLICT ("businessId") DO UPDATE SET "lastAppliedSeq" = EXCLUDED."lastAppliedSeq", paused = EXCLUDED.paused, "appliedAt" = EXCLUDED."appliedAt", "updatedAt" = EXCLUDED."updatedAt"
       WHERE "SellerCommissionState"."lastAppliedSeq" < EXCLUDED."lastAppliedSeq" RETURNING 1`,
      [p.businessId, p.seq, p.paused, p.now],
    );
    return rowCount === 1;
  }

  async setPausedForSeller(tx: Tx, businessId: CuidId, paused: boolean, now: IsoInstant): Promise<number> {
    const { rowCount } = await tx.query(
      paused
        ? `UPDATE "Listing" SET "pausedAt" = $2, "updatedAt" = $2 WHERE "sellerId" = $1 AND "sellerKindAtCreation" = 'business' AND "pausedAt" IS NULL`
        : `UPDATE "Listing" SET "pausedAt" = NULL, "updatedAt" = $2 WHERE "sellerId" = $1 AND "pausedAt" IS NOT NULL`,
      [businessId, now],
    );
    return rowCount;
  }

  async lockSellerListings(tx: Tx, sellerId: CuidId): Promise<void> {
    await tx.query(`SELECT id FROM "Listing" WHERE "sellerId" = $1 ORDER BY id FOR UPDATE`, [sellerId]);
  }

  async newestAppliedDecision(tx: Tx, businessId: CuidId): Promise<IsoInstant | null> {
    const { rows } = await tx.query<{ newest: Date | null }>(
      `SELECT max("decidedAt") AS newest FROM "AppliedApplicationDecision" WHERE "businessId" = $1 AND NOT ignored`, [businessId]);
    return rows[0]?.newest?.toISOString() ?? null;
  }

  async insertAppliedDecision(tx: Tx, d: { applicationId: CuidId; businessId: CuidId; decision: 'Approved' | 'Rejected'; decidedAt: IsoInstant; ignored: boolean; now: IsoInstant }): Promise<boolean> {
    const { rowCount } = await tx.query(
      `INSERT INTO "AppliedApplicationDecision" ("applicationId", "businessId", decision, "decidedAt", "appliedAt", ignored, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $5) ON CONFLICT ("applicationId") DO NOTHING`,
      [d.applicationId, d.businessId, d.decision, d.decidedAt, d.now, d.ignored],
    );
    return rowCount === 1;
  }

  async withdrawForRejection(tx: Tx, sellerId: CuidId, applicationId: CuidId, now: IsoInstant): Promise<number> {
    const { rowCount } = await tx.query(
      `UPDATE "Listing" SET "withdrawnAt" = $3, "withdrawnReason" = 'ApplicationRejected', "withdrawnByApplicationId" = $2, "updatedAt" = $3
       WHERE "sellerId" = $1 AND "sellerKindAtCreation" = 'business' AND "withdrawnAt" IS NULL`,
      [sellerId, applicationId, now],
    );
    return rowCount;
  }

  async restoreFromRejection(tx: Tx, sellerId: CuidId, now: IsoInstant): Promise<number> {
    const { rowCount } = await tx.query(
      `UPDATE "Listing" SET "withdrawnAt" = NULL, "withdrawnReason" = NULL, "withdrawnByApplicationId" = NULL, "updatedAt" = $2
       WHERE "sellerId" = $1 AND "sellerKindAtCreation" = 'business' AND "withdrawnReason" = 'ApplicationRejected'`,
      [sellerId, now],
    );
    return rowCount;
  }

  async insertBundleComponents(tx: Tx, listingId: CuidId, sellerId: CuidId, components: { inventoryUnitId: CuidId; catalogEntryId: CuidId; condition: Condition; perBundleQty: number }[], now: IsoInstant): Promise<void> {
    for (const c of components) {
      await tx.query(
        `INSERT INTO "BundleComponent" ("listingId", "inventoryUnitId", "sellerId", "catalogEntryId", condition, "perBundleQty", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [listingId, c.inventoryUnitId, sellerId, c.catalogEntryId, c.condition, c.perBundleQty, now],
      );
    }
  }

  async readListingDetail(tx: Tx, listingId: CuidId): Promise<ListingDetailRow | null> {
    const { rows } = await tx.query<DetailRow>(`SELECT ${DETAIL_COLUMNS} FROM ${DETAIL_FROM} WHERE l.id = $1`, [listingId]);
    return rows[0] ? detail(rows[0]) : null;
  }

  async listSellerListings(tx: Tx, sellerId: CuidId, after: { createdAt: IsoInstant; id: CuidId } | null, limit: number): Promise<ListingDetailRow[]> {
    // Two statements, never `OR $2 IS NULL`, so each keeps its own plan (deferred-work, Story 1.5).
    const { rows } = after === null
      ? await tx.query<DetailRow>(`SELECT ${DETAIL_COLUMNS} FROM ${DETAIL_FROM} WHERE l."sellerId" = $1 ORDER BY l."createdAt" DESC, l.id DESC LIMIT $2`, [sellerId, limit])
      : await tx.query<DetailRow>(
        `SELECT ${DETAIL_COLUMNS} FROM ${DETAIL_FROM} WHERE l."sellerId" = $1 AND (l."createdAt", l.id) < ($2::timestamptz, $3) ORDER BY l."createdAt" DESC, l.id DESC LIMIT $4`,
        [sellerId, after.createdAt, after.id, limit],
      );
    return rows.map(detail);
  }

  async updateListingFields(tx: Tx, listingId: CuidId, expectedVersion: number, changes: { priceCop?: number; description?: string; openToTrade?: boolean }, now: IsoInstant): Promise<number | null> {
    const params: unknown[] = [listingId, expectedVersion, now];
    const sets = ['version = version + 1', '"updatedAt" = $3'];
    if (changes.priceCop !== undefined) sets.push(`"priceCop" = $${params.push(changes.priceCop)}`);
    if (changes.description !== undefined) sets.push(`description = $${params.push(changes.description)}`);
    if (changes.openToTrade !== undefined) sets.push(`"openToTrade" = $${params.push(changes.openToTrade)}`);
    const { rows } = await tx.query<{ version: number }>(`UPDATE "Listing" SET ${sets.join(', ')} WHERE id = $1 AND version = $2 RETURNING version`, params);
    return rows[0]?.version ?? null;
  }

  async setDeactivated(tx: Tx, listingId: CuidId, deactivated: boolean, now: IsoInstant): Promise<number | null> {
    const { rows } = await tx.query<{ version: number }>(
      deactivated
        ? `UPDATE "Listing" SET "deactivatedAt" = $2, version = version + 1, "updatedAt" = $2 WHERE id = $1 AND "deactivatedAt" IS NULL RETURNING version`
        : `UPDATE "Listing" SET "deactivatedAt" = NULL, version = version + 1, "updatedAt" = $2 WHERE id = $1 AND "deactivatedAt" IS NOT NULL RETURNING version`,
      [listingId, now],
    );
    return rows[0]?.version ?? null;
  }

  async availabilityCandidates(tx: Tx, entryIds: CuidId[]): Promise<AvailabilityCandidate[]> {
    const { rows } = await tx.query<Omit<AvailabilityCandidate, 'priceCop'> & { priceCop: string }>(
      `SELECT u."catalogEntryId", l."sellerId", l."sellerKindAtCreation", l."priceCop"::text AS "priceCop"
       FROM "Listing" l JOIN "InventoryUnit" u ON u.id = l."inventoryUnitId" LEFT JOIN "SellerCommissionState" c ON c."businessId" = l."sellerId"
       WHERE l.kind = 'single' AND u."catalogEntryId" = ANY($1) AND u.quantity >= 1
         AND l."hiddenAt" IS NULL AND l."withdrawnAt" IS NULL AND l."deactivatedAt" IS NULL
         AND (l."sellerKindAtCreation" = 'individual' OR (l."pausedAt" IS NULL AND c.paused = false))`,
      [entryIds],
    );
    return rows.map((r) => ({ ...r, priceCop: Number(r.priceCop) }));
  }

  async listingUnitIds(tx: Tx, listingId: CuidId): Promise<CuidId[]> {
    const { rows } = await tx.query<{ unit: CuidId }>(`SELECT x.unit FROM (SELECT $1::text AS id) l, LATERAL (${LISTING_UNITS}) x ORDER BY x.unit`, [listingId]);
    return rows.map((r) => r.unit);
  }
}
