import type { Cop, CuidId, IsoDate, IsoInstant } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';
import type { CatalogKind, CopDerivation } from '../domain/cat.js';

// Solu-2 DTOs — CAT (contracts.md §3, §15).

// CAT-1 startFeedRun
export interface StartFeedRunRequest { actorId: CuidId }
export interface StartFeedRunResponse { runId: CuidId; startedAt: IsoInstant; decision: ExplanationDTO }

// CAT-2 upsertCatalogEntry (one row of a feed batch)
export interface ValidFeedRow {
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
export interface UpsertCatalogEntryRequest { row: ValidFeedRow; runId: CuidId; rowNumber: number }
export interface UpsertCatalogEntryResponse {
  catalogEntryId: CuidId;
  outcome: 'created' | 'updated' | 'unchanged' | 'quarantinedKindChanged';
  changedFields: string[];
}

// CAT-3 getPriceProvenance
export interface ObservedPriceDTO {
  usdCents: number | null;
  cop: Cop;
  observedAt: IsoInstant;
  source: string;
  copDerivation: CopDerivation;
  fxRateDate: IsoDate | null;
}
export interface GetPriceProvenanceRequest { catalogEntryIds: CuidId[]; period: 7 | 30 | 90 }
export interface PriceProvenanceDTO {
  catalogEntryId: CuidId;
  lastTransactionReference: ObservedPriceDTO | null;
  trend: {
    period: 7 | 30 | 90;
    referencePriceAtStart: ObservedPriceDTO | null;
    /** ADD-§2.2 in hundredths of a percent; null without a baseline (TrendNoBaseline). */
    changePercentHundredths: number | null;
    decision: ExplanationDTO;
  };
  freshness: 'fresh' | 'stale' | null;
  decision: ExplanationDTO;
}
export interface GetPriceProvenanceResponse { items: PriceProvenanceDTO[] }

// S-FR-CAT-1 browse
export interface CatalogFilters {
  setIds?: CuidId[];
  pokemon?: string;
  colour?: string;
  style?: string;
  artist?: string;
  kind?: CatalogKind;
  nameQuery?: string;
}
export interface CatalogEntryDTO {
  catalogEntryId: CuidId;
  setId: CuidId;
  kind: CatalogKind;
  name: string;
  number: string;
  pokemon: string | null;
  colour: string | null;
  style: string | null;
  artist: string | null;
  imageUrl: string | null;
}
export interface BrowseCatalogRequest { filters: CatalogFilters; page: number; pageSize: number }
export interface BrowseCatalogResponse {
  entries: CatalogEntryDTO[];
  total: number;
  facets: { name: string; values: { value: string; count: number }[] }[];
}

// S-FR-CAT-8 TRM
export interface FetchTrmRequest { trigger: 'tick' | 'daily-morning' | 'admin' }
export interface FetchTrmResponse { outcome: 'stored' | 'alreadyCovered' | 'sourceUnavailable' | 'mismatchKept'; decision: ExplanationDTO }
export interface GetFxRateRequest { date: IsoDate }
export interface GetFxRateResponse {
  copPerUsdCentavos: number;
  validFrom: IsoDate;
  validTo: IsoDate;
  stale: boolean;
  decision: ExplanationDTO;
}
