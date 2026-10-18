import type { Cop, CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { ValuationPeriod } from '../domain/val.js';

export type { ValuationPeriod };

// DTOs — VAL (contracts.md §11). Primitive fields only.

// assertValuationPeriod
export interface AssertValuationPeriodRequestDTO {
  /** Integer; allowed 7 | 30 | 90 | 365. */
  period: number;
}

// valueCollection
export interface ValueCollectionRequestDTO {
  collectionId: CuidId;
  actorId: CuidId;
}
export interface NotValuedEntryDTO {
  entryId: CuidId;
  reasonCode: 'ExternalEntryNotInCatalog' | 'NoReferencePrice';
}
export interface ValuationDTO {
  /** Exact BigInt sum, serialized as a safe integer; above 2^53 − 1 the mapping throws 'Unexpected' (AD-SYS-7 rule 1, review E-20). */
  totalCop: Cop;
  valuedCount: number;
  notValued: NotValuedEntryDTO[];
  staleCount: number;
  asOf: IsoInstant;
  /** floor(Σ qty over fx-derived entries / 2); reported, never applied (ADD-§2.8). */
  conversionDriftBoundCop: number;
}

// changePercent
export interface ChangePercentRequestDTO {
  base: Cop;
  current: Cop;
}
/** Hundredths of a percent, half away from zero; null when base = 0 (ValuationNoBaseline). */
export type ChangePercentResponseDTO = { hundredths: number } | null;
