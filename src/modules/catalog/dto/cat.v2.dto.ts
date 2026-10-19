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
export interface GetPriceProvenanceRequest {
  /** @minItems 1 @maxItems 500 */
  catalogEntryIds: CuidId[];
  period: 7 | 30 | 90;
}
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
export interface BrowseCatalogRequest {
  filters: CatalogFilters;
  /** @minimum 1 */
  page: number;
  /** @minimum 1 @maximum 100 */
  pageSize: number;
}
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

// CAT-2 ingress: catalog.feed.continue (runs batches of CAT-2 under the lease)
export interface ContinueFeedRunRequest { actorId: CuidId; runId: CuidId }
export interface ContinueFeedRunResponse { done: boolean; status: 'Running' | 'Completed' | 'Failed'; cursor: number }

// Offered ports (contracts.md §15.11)
export interface GetEntryRequest { catalogEntryId: CuidId }
export type GetEntryResponse = CatalogEntryDTO;
export interface GetEntriesRequest { catalogEntryIds: CuidId[] }
export interface GetEntriesResponse { entries: CatalogEntryDTO[]; missing: CuidId[] }
export interface MatchEntryIdsRequest { filters: CatalogFilters }
export type MatchEntryIdsResponse = { ids: CuidId[]; tooBroad: false } | { ids: []; tooBroad: true };
export interface ResolveItemRefsRequest { refs: CuidId[] }
export interface ResolveItemRefsResponse { resolved: { ref: CuidId; kind: CatalogKind }[]; missing: CuidId[] }
export interface GetReferencePricesAsOfRequest { catalogEntryIds: CuidId[]; asOf: IsoInstant }
export interface GetReferencePricesAsOfResponse { prices: { catalogEntryId: CuidId; price: ObservedPriceDTO | null; stale: boolean }[] }
export interface GetPriceHistoryRequest { catalogEntryIds: CuidId[]; from: IsoInstant; to: IsoInstant }
export interface GetPriceHistoryResponse { series: { catalogEntryId: CuidId; observations: ObservedPriceDTO[] }[] }
export interface GetSetSummariesRequest { setIds: CuidId[] }
export interface GetSetSummariesResponse { sets: { setId: CuidId; name: string; cardEntryCount: number }[] }

// Read models found by the UI-state check (contracts.md §15.12)
export interface ListFeedRunsRequest { actorId: CuidId; cursor: string | null }
export interface FeedRunDTO {
  runId: CuidId;
  status: 'Running' | 'Completed' | 'Failed';
  cursor: number;
  created: number;
  updated: number;
  unchanged: number;
  quarantined: number;
  deferredNoFx: number;
  startedAt: IsoInstant;
  endedAt: IsoInstant | null;
}
export interface ListFeedRunsResponse { runs: FeedRunDTO[]; nextCursor: string | null }
export interface ListQuarantinedRowsRequest { actorId: CuidId; runId: CuidId; reasonCode?: string; cursor: string | null }
export interface ListQuarantinedRowsResponse {
  rows: { rowNumber: number; externalKey: string | null; reasonCode: string }[];
  nextCursor: string | null;
}
