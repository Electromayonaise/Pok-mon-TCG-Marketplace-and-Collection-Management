// Driven adapters (persistence) — listings. The Solu-1 stubs below are bound to the retired migration
// 004_create_listings_inventory.sql (git 853449c:docs/solu-1/planning/schemas/); the Solu-2
// PgInvRepository at the end is bound to _bmad-output/planning-artifacts/detailed-design/schemas.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { Condition, CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { InvRepository, ListingHeader, ListingUnit, NewListingRow, ReserveFacts, ResolvedUnit } from '../ports/inv.v2.js';
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

  async listingUnitIds(tx: Tx, listingId: CuidId): Promise<CuidId[]> {
    const { rows } = await tx.query<{ unit: CuidId }>(`SELECT x.unit FROM (SELECT $1::text AS id) l, LATERAL (${LISTING_UNITS}) x ORDER BY x.unit`, [listingId]);
    return rows.map((r) => r.unit);
  }
}
