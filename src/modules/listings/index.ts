// Public surface of `listings` (AD-1). Hosts INV and DSC (ARCH §6.4, §6.5).
import type { Clock, Sql } from '../../shared-kernel/ports.js';
import { DscService, type DscUseCases } from './application/dsc.js';
import { InvService, type InvUseCases } from './application/inv.js';
import { PgDiscoveryQuery, PgInventoryUnitRepository, PgListingRepository } from './infra/pg.js';
import type { CatalogForListings, IdentityForListings } from './ports/listings.js';

export type * from './dto/inv.dto.js';
export type * from './dto/inv.v2.dto.js';
export type * from './dto/dsc.v2.dto.js';
export type * from './dto/contact.v2.dto.js';
export type * from './dto/dsc.dto.js';
export type { InvUseCases } from './application/inv.js';
export type { DscUseCases } from './application/dsc.js';
export type { CatalogForListings, IdentityForListings } from './ports/listings.js';

export interface ListingsWiring {
  sql: Sql;
  clock: Clock;
  identity: IdentityForListings;
  catalog: CatalogForListings;
}

/** Composition root for INV (contracts.md §5). */
export function createInvModule(w: ListingsWiring): InvUseCases {
  return new InvService({
    listings: new PgListingRepository(w.sql),
    units: new PgInventoryUnitRepository(w.sql),
    discovery: new PgDiscoveryQuery(w.sql),
    identity: w.identity,
    clock: w.clock,
  });
}

/** Composition root for DSC (contracts.md §4). */
export function createDscModule(w: ListingsWiring): DscUseCases {
  return new DscService({ discovery: new PgDiscoveryQuery(w.sql), catalog: w.catalog, identity: w.identity, clock: w.clock });
}
