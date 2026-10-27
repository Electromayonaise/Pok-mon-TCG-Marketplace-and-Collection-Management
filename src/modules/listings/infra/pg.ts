// Driven adapters (persistence) — listings. The Solu-1 stubs below are bound to the retired migration
// 004_create_listings_inventory.sql (git 853449c:docs/solu-1/planning/schemas/); the Solu-2
// PgInvRepository at the end is bound to _bmad-output/planning-artifacts/detailed-design/schemas.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { Condition, CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { InvRepository, NewListingRow, ResolvedUnit } from '../ports/inv.v2.js';
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
}
