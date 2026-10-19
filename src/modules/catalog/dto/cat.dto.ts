import type { CuidId, IsoDate, IsoInstant } from '../../../shared-kernel/types.js';
import type { CatalogKind, CopDerivation } from '../domain/cat.js';

export type { CatalogKind, CopDerivation };

// DTOs — CAT (contracts.md §3). Primitive fields only.

// assertCatalogAdmin's DTO lives with the guard in src/server/trpc/admin-guard.ts (review E-23).

// startFeedRun
export interface StartFeedRunRequestDTO {
  actorId: CuidId;
}
export interface StartFeedRunResponseDTO {
  runId: CuidId;
  startedAt: IsoInstant;
}

// upsertCatalogEntry (supplementary contract, decision log #7)
/** A feed row that already passed validateRow (ADD-§8.1). */
export interface ValidFeedRowDTO {
  externalKey: string;
  setCode: string;
  number: string;
  name: string;
  kind: CatalogKind;
  eraCode: string;
  pokemon: string | null;
  colour: string | null;
  style: string | null;
  artist: string | null;
  imageUrl: string | null;
}
export interface UpsertCatalogEntryRequestDTO {
  row: ValidFeedRowDTO;
  runId: CuidId;
}
export interface UpsertCatalogEntryResponseDTO {
  catalogEntryId: CuidId;
  outcome: 'created' | 'updated' | 'unchanged';
  /** Attribute names that differed; empty unless outcome = 'updated'. */
  changedFields: string[];
}

// getReferencePriceAsOf
export interface GetReferencePriceAsOfRequestDTO {
  catalogEntryId: CuidId;
  asOf: IsoInstant;
}
/** AD-SYS-7 ReferencePrice: never assignable to a listing price. */
export interface ReferencePriceDTO {
  /** Present when the source quoted USD; null for a COP-native observation. */
  usdCents: number | null;
  cop: number;
  observedAt: IsoInstant;
  source: string;
  copDerivation: CopDerivation;
  /** The TRM's validFrom when copDerivation = 'fxDerived'; null otherwise. */
  fxRateDate: IsoDate | null;
  /** (asOf − observedAt) > freshnessThresholdHours, computed at read. */
  stale: boolean;
}
/** null when no observation exists at or before asOf (silent). */
export type GetReferencePriceAsOfResponseDTO = ReferencePriceDTO | null;
