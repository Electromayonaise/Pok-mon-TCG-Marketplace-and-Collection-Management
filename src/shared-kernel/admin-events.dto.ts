import type { CuidId, IsoInstant } from './types.js';
import type { ExplanationDTO } from './explanation.js';

// Solu-2 DTOs — the shared-kernel admin event panel (ARCHITECTURE §7.3; NFR-SYS-6).

export type Subscriber = 'commission' | 'listings' | 'collections';

export interface ReplayEventDeliveryRequest { adminId: CuidId; eventId: CuidId; subscriber: Subscriber }
export interface ReplayEventDeliveryResponse { status: 'delivered' | 'failed'; replayed: boolean; decision: ExplanationDTO }

/** S-SYS.sweep (Story 1.6): the `outbox-sweep` job's run of the attempt procedure (AD-SYS-2 rules 4 and 6). */
export interface SweepDeliveriesRequest { trigger: 'tick' | 'daily-morning' | 'daily-night' }
export interface SweepDeliveriesResponse { attempted: number; delivered: number; failed: number }

export interface GetDeliveryHealthRequest { adminId: CuidId }
export interface GetDeliveryHealthResponse {
  failedCount: number;
  oldestFirstFailedAt: IsoInstant | null;
  stuckPendingCount: number;
  latestDigest: { date: string; count: number; stuckPendingCount: number } | null;
}

// Read models found by the UI-state check (contracts.md §15.12)
export interface GetTickHealthRequest { adminId: CuidId }
/**
 * S-SYS.tick (architecture audit F3, decision log Impl-2 #34): one job's runs as tick health reads them. `failedInWindow`
 * counts the `failed` runs started in the 24 h before the read; `stuckRunning` the runs still `running` that started in
 * that window more than 15 min before the read.
 */
export interface JobHealthDTO {
  job: string;
  lastOutcome: 'running' | 'succeeded' | 'skipped' | 'failed';
  lastErrorCode: string | null;
  lastStartedAt: IsoInstant;
  failedInWindow: number;
  stuckRunning: number;
}
/** `degraded`: a job failed in the 24 h window or is stuck `running` (architecture audit F3); `tickSilent` stays the tick's own signal. */
export interface GetTickHealthResponse { lastTickStartedAt: IsoInstant | null; tickSilent: boolean; jobs: JobHealthDTO[]; degraded: boolean; decision: ExplanationDTO }
export interface ListDeliveriesRequest { adminId: CuidId; kind: 'failed' | 'stuck'; cursor: string | null }
export interface DeliveryRowDTO {
  eventId: CuidId;
  eventType: string;
  subscriber: Subscriber;
  attempts: number;
  lastErrorCode: string | null;
  lastAttemptAt: IsoInstant | null;
  firstFailedAt: IsoInstant | null;
  lastFailedAt: IsoInstant | null;
  createdAt: IsoInstant;
}
export interface ListDeliveriesResponse { rows: DeliveryRowDTO[]; nextCursor: string | null }
