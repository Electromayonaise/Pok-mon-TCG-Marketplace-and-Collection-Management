import type { CuidId, IsoDate, IsoInstant } from './types.js';

// Outbound ports to everything outside the deployment (AD-SYS-6; Solu-2 hard rule 3: "every
// external interaction is behind an outbound port with a simulated adapter"). Production
// adapters live in modules/*/infra/ (lint tezg/no-direct-io); simulated ones in test-support/simulated/.

/** Buckets of AD-SYS-8 rule 5. `upload-quarantine` has no read path, ever. */
export type Bucket = 'upload-quarantine' | 'ver-documents' | 'order-comprobantes' | 'topup-proofs';

export interface ObjectStorage {
  /** A signed direct-upload ticket into `upload-quarantine`, valid 2 h (AD-SYS-8 rule 5.1). */
  createUploadTicket(key: string): Promise<{ signedUrl: string; token: string; expiresAt: IsoInstant }>;
  /** Raw bytes, or null when the object does not exist. Used only by promotion. */
  get(bucket: Bucket, key: string): Promise<Uint8Array | null>;
  put(bucket: Exclude<Bucket, 'upload-quarantine'>, key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  delete(bucket: Bucket, key: string): Promise<void>;
  /** A signed read URL with `attachment` and `nosniff`. Never issued for quarantine (rule 5.5). */
  sign(bucket: Exclude<Bucket, 'upload-quarantine'>, key: string, ttlSeconds: 600): Promise<{ url: string; expiresAt: IsoInstant }>;
}

/** AD-SYS-8 rules 6–7. `sanitized` is the rendition viewers show (re-encoded image). */
export interface MalwareScanner {
  scan(bytes: Uint8Array, declared: 'image/jpeg' | 'image/png' | 'application/pdf'): Promise<
    { verdict: 'clean'; sanitized: Uint8Array | null } | { verdict: 'rejected'; cause: 'scanner' }
  >;
}

/** One raw row of the catalog feed (ADD-§8.1 validates it). */
export type FeedSourceRow = Record<string, string | number | null>;

/** The catalog feed (OQ-9: a fixture in V1). Fault switches of ADD-§8.3 live in the simulated adapter. */
export interface CatalogFeedSource {
  openRun(): Promise<{ sourceName: string; totalRows: number }>;
  readRows(cursor: number, limit: number): Promise<{ rows: { rowNumber: number; row: FeedSourceRow }[]; done: boolean }>;
}

/** datos.gov.co dataset 32sa-8pi3 (ADD-§6). `valor` stays a decimal string (AD-CAT-3 rule 3). */
export interface FxRateSource {
  getRateCovering(date: IsoDate): Promise<{ valor: string; validFrom: IsoDate; validTo: IsoDate; source: string } | null>;
}

/** ADD-§7: the one domain path for top-up decisions. V1 binds the admin action; v2 a webhook. */
export interface TopUpConfirmationPort {
  confirm(topUpRequestId: CuidId, actorId: CuidId): Promise<void>;
  reject(topUpRequestId: CuidId, reason: string, actorId: CuidId): Promise<void>;
}
