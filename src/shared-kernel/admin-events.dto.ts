import type { CuidId, IsoInstant } from './types.js';
import type { ExplanationDTO } from './explanation.js';

// Solu-2 DTOs — the shared-kernel admin event panel (ARCHITECTURE §7.3; NFR-SYS-6).

export type Subscriber = 'commission' | 'listings' | 'collections';

export interface ReplayEventDeliveryRequest { adminId: CuidId; eventId: CuidId; subscriber: Subscriber }
export interface ReplayEventDeliveryResponse { status: 'delivered' | 'failed'; replayed: boolean; decision: ExplanationDTO }

export interface GetDeliveryHealthRequest { adminId: CuidId }
export interface GetDeliveryHealthResponse {
  failedCount: number;
  oldestFirstFailedAt: IsoInstant | null;
  stuckPendingCount: number;
  latestDigest: { date: string; count: number; stuckPendingCount: number } | null;
}

// Read models found by the UI-state check (contracts.md §15.12)
export interface GetTickHealthRequest { adminId: CuidId }
export interface GetTickHealthResponse { lastTickStartedAt: IsoInstant | null; tickSilent: boolean; decision: ExplanationDTO }
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
