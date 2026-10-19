import type { Cop, CuidId, IsoDate, IsoInstant } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';
import type { ValuationPeriod } from '../domain/val.js';

// Solu-2 DTOs — VAL (contracts.md §11).

// VAL-1 valueCollection
export interface ValueCollectionRequest { collectionId: CuidId; actorId: CuidId }
export interface ValueCollectionResponse {
  totalCop: Cop;
  valuedCount: number;
  notValued: { entryId: CuidId; reasonCode: 'ExternalEntryNotInCatalog' | 'NoReferencePrice' }[];
  staleCount: number;
  asOf: IsoInstant;
  conversionDriftBoundCop: Cop;
  decision: ExplanationDTO;
}

// VAL-2 valuationTrend
export interface ValuationTrendRequest { collectionId: CuidId; period: ValuationPeriod; actorId: CuidId }
export interface ValuationTrendResponse {
  period: ValuationPeriod;
  start: IsoInstant;
  asOf: IsoInstant;
  valueAtStartCop: Cop;
  valueNowCop: Cop;
  /** Signed. */
  changeCop: number;
  changePercentHundredths: number | null;
  marketChangePercentHundredths: number | null;
  label: 'current-cards-were-worth';
  decision: ExplanationDTO;
}

// VAL-3 valuationHistory
export interface ValuationHistoryRequest { collectionId: CuidId; days: number; actorId: CuidId }
export interface ValuationHistoryResponse {
  points: { date: IsoDate; valueCop: Cop; stale: boolean }[];
  label: 'current-cards-were-worth';
  decision: ExplanationDTO;
}
