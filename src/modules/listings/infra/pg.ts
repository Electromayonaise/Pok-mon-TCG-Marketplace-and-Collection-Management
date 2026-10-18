// Driven adapters (persistence) — listings. Bound to docs/solu-1/planning/schemas/004_create_listings_inventory.sql.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql } from '../../../shared-kernel/ports.js';
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
