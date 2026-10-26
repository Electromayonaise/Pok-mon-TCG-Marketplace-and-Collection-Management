// Simulated driven adapters for the Solu-2 suites (task statement §5 hard rule 3). Each one
// implements a shared-kernel port with fixtures and fault switches, never the network
// (NFR-SYS-3). Phase 2 deliverable, audited in _bmad-output/planning-artifacts/reviews/review-detailed-design.md.
import { createHash } from 'node:crypto';
import type { AuditEntry, AuditLog } from '../../src/shared-kernel/audit.js';
import { EVENT_SCHEMA_VERSIONS, EVENT_SUBSCRIBERS, type EventEnvelope, type EventPayloads, type EventType, type OutboxV2 } from '../../src/shared-kernel/events.js';
import type {
  Bucket, CatalogFeedSource, FxRateSource, MalwareScanner, ObjectStorage, FeedSourceRow, TopUpConfirmationPort,
} from '../../src/shared-kernel/external.js';
import type { Clock, IdGenerator, Tx } from '../../src/shared-kernel/ports.js';

// ------------------------------------------------------------------ events (R-1, AD-SYS-2)

/** The Solu-2 outbox: the R-1 envelope plus one pending delivery per registered subscriber. */
export class SqlOutboxV2 implements OutboxV2 {
  constructor(private readonly ids: IdGenerator, private readonly clock: Clock) {}

  async enqueue<T extends EventType>(tx: Tx, type: T, aggregateId: string, payload: EventPayloads[T]): Promise<EventEnvelope<T>> {
    const eventId = this.ids.next();
    const at = this.clock.now().toISOString();
    await tx.query(
      `INSERT INTO "OutboxEvent" (id, type, "aggregateId", "schemaVersion", payload, "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
      [eventId, type, aggregateId, EVENT_SCHEMA_VERSIONS[type], JSON.stringify(payload), at],
    );
    for (const subscriber of EVENT_SUBSCRIBERS[type]) {
      await tx.query(
        `INSERT INTO "EventDelivery" ("eventId", subscriber, status, attempts, "createdAt", "updatedAt") VALUES ($1, $2, 'pending', 0, $3, $3)`,
        [eventId, subscriber, at],
      );
    }
    return { eventId, type, occurredAt: at, schemaVersion: EVENT_SCHEMA_VERSIONS[type], payload };
  }
}

/**
 * `sim_events` fault injector (Phase 3 fixture): makes one named subscriber throw, so the
 * failed-delivery and replay paths of AD-SYS-2 can be driven deterministically.
 */
export class SubscriberFaults {
  private readonly failing = new Map<string, string>();
  failNext(subscriber: 'commission' | 'listings' | 'collections', code = 'Unexpected'): void { this.failing.set(subscriber, code); }
  clear(): void { this.failing.clear(); }
  /** Called by the test dispatcher before a handler runs. */
  check(subscriber: string): void {
    const code = this.failing.get(subscriber);
    if (code) { this.failing.delete(subscriber); throw Object.assign(new Error(code), { code }); }
  }
}

// ------------------------------------------------------------------ audit (R-2)

export class SqlAuditLog implements AuditLog {
  constructor(private readonly ids: IdGenerator, private readonly clock: Clock) {}
  async record(tx: Tx, e: AuditEntry): Promise<{ auditEventId: string }> {
    const auditEventId = this.ids.next();
    await tx.query(
      `INSERT INTO audit_events (id, "actorId", "actorKind", module, action, "aggregateType", "aggregateId", "decisionCode", data, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [auditEventId, e.actorId, e.actorKind, e.module, e.action, e.aggregateType, e.aggregateId, e.decisionCode, JSON.stringify(e.data), this.clock.now().toISOString()],
    );
    return { auditEventId };
  }
}

// ------------------------------------------------------------------ storage (AD-SYS-8 rule 5)

export class InMemoryObjectStorage implements ObjectStorage {
  readonly objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
  /** Every signed read URL issued, so a test can assert none was for quarantine. */
  readonly signedReads: { bucket: Bucket; key: string }[] = [];
  /** Every upload ticket issued (review S-5), so a test can assert the owner composed
   * `<purpose>/<actorId>/<cuid2>` from the session (AD-SYS-8 rules 5.1 and 8). */
  readonly issuedTickets: { key: string; expiresAt: string }[] = [];
  constructor(private readonly clock: Clock) {}
  private k(bucket: Bucket, key: string): string { return `${bucket}/${key}`; }

  async createUploadTicket(key: string) {
    const expiresAt = new Date(this.clock.now().getTime() + 2 * 3_600_000).toISOString();
    this.issuedTickets.push({ key, expiresAt });
    return { signedUrl: `sim://upload-quarantine/${key}`, token: createHash('sha256').update(key).digest('hex').slice(0, 32), expiresAt };
  }
  /** Test helper: the browser's direct upload into quarantine. */
  simulateDirectUpload(key: string, bytes: Uint8Array, contentType: string): void {
    this.objects.set(this.k('upload-quarantine', key), { bytes, contentType });
  }
  async get(bucket: Bucket, key: string) { return this.objects.get(this.k(bucket, key))?.bytes ?? null; }
  async put(bucket: Exclude<Bucket, 'upload-quarantine'>, key: string, bytes: Uint8Array, contentType: string) {
    this.objects.set(this.k(bucket, key), { bytes, contentType });
  }
  async delete(bucket: Bucket, key: string) { this.objects.delete(this.k(bucket, key)); }
  async sign(bucket: Exclude<Bucket, 'upload-quarantine'>, key: string, ttlSeconds: 600) {
    if ((bucket as Bucket) === 'upload-quarantine') throw new Error('no read path to upload-quarantine (AD-SYS-8 rule 5.5)');
    this.signedReads.push({ bucket, key });
    return { url: `sim://${bucket}/${key}?ttl=${ttlSeconds}`, expiresAt: new Date(this.clock.now().getTime() + ttlSeconds * 1000).toISOString() };
  }
}

// ------------------------------------------------------------------ scanner (AD-SYS-8 rules 6–7)

const MAGIC = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'application/pdf': [0x25, 0x50, 0x44, 0x46, 0x2d],
} as const;

/**
 * Simulates StructuralScanner [G-4]: rejects PDFs naming /JavaScript, /JS, /Launch,
 * /EmbeddedFile or /OpenAction, and "re-encodes" images by truncating at the format's end
 * marker (JPEG FF D9, PNG IEND chunk), which drops trailing payloads. An image without its end
 * marker is rejected (review S-3): it cannot be re-encoded, so it is never "clean".
 * Fault switch: `failAll`.
 */
export class SimulatedScanner implements MalwareScanner {
  failAll = false;
  async scan(bytes: Uint8Array, declared: keyof typeof MAGIC) {
    if (this.failAll) return { verdict: 'rejected' as const, cause: 'scanner' as const };
    const magic = MAGIC[declared];
    if (!magic.every((b, i) => bytes[i] === b)) return { verdict: 'rejected' as const, cause: 'scanner' as const };
    if (declared === 'application/pdf') {
      const text = Buffer.from(bytes).toString('latin1');
      if (/\/(JavaScript|JS|Launch|EmbeddedFile|OpenAction)\b/.test(text)) return { verdict: 'rejected' as const, cause: 'scanner' as const };
      return { verdict: 'clean' as const, sanitized: null }; // no PDF rendition until G-5 closes (LG-3)
    }
    const buf = Buffer.from(bytes);
    // JPEG ends after FF D9; PNG ends after the IEND chunk type (4 bytes) and its CRC (4 bytes).
    const marker = declared === 'image/jpeg' ? buf.lastIndexOf(Buffer.from([0xff, 0xd9])) : buf.indexOf(Buffer.from('IEND'));
    const end = marker < 0 ? -1 : marker + (declared === 'image/jpeg' ? 2 : 8);
    if (end < 0 || end > buf.length) return { verdict: 'rejected' as const, cause: 'scanner' as const };
    return { verdict: 'clean' as const, sanitized: new Uint8Array(buf.subarray(0, end)) };
  }
}

// ------------------------------------------------------------------ catalog feed (ADD-§8.3)

export type FeedFault = 'none' | 'down' | 'stale' | 'malformedRows' | 'renamedRows';

/**
 * The fixture files of ADD-§8 the feed can serve. `previous` is the last file ingested; `defects`
 * is the §8.2 file (10 rows of each defect kind); `renamed` has 30 attribute changes and 5 reprints.
 */
export interface FeedFiles {
  current: FeedSourceRow[];
  previous: FeedSourceRow[];
  defects: FeedSourceRow[];
  renamed: FeedSourceRow[];
}

/**
 * The V1 fixture feed with the ADD-§8.3 fault switches (review S-2): each switch selects a whole
 * file, as the addendum defines it. `down` throws a connection error; `stale` returns the previous
 * file unchanged; `malformedRows` serves the §8.2 file; `renamedRows` serves the renamed file.
 */
export class FixtureFeedSource implements CatalogFeedSource {
  fault: FeedFault = 'none';
  constructor(private readonly files: FeedFiles, private readonly sourceName = 'fixture-feed') {}
  private file(): FeedSourceRow[] {
    switch (this.fault) {
      case 'down': throw Object.assign(new Error('feed unavailable'), { code: 'FeedUnavailable' });
      case 'stale': return this.files.previous;
      case 'malformedRows': return this.files.defects;
      case 'renamedRows': return this.files.renamed;
      case 'none': return this.files.current;
    }
  }
  async openRun() {
    return { sourceName: this.sourceName, totalRows: this.file().length };
  }
  async readRows(cursor: number, limit: number) {
    const rows = this.file();
    return {
      rows: rows.slice(cursor, cursor + limit).map((row, i) => ({ rowNumber: cursor + i + 1, row })),
      done: cursor + limit >= rows.length,
    };
  }
}

// ------------------------------------------------------------------ TRM (ADD-§6)

export type FxFault = 'none' | 'down' | 'mismatch';

export class FixtureFxRateSource implements FxRateSource {
  fault: FxFault = 'none';
  calls = 0;
  constructor(private readonly rates: { valor: string; validFrom: string; validTo: string }[]) {}
  async getRateCovering(date: string) {
    this.calls += 1;
    if (this.fault === 'down') return null;
    const r = this.rates.find((x) => x.validFrom <= date && date <= x.validTo);
    if (!r) return null;
    const valor = this.fault === 'mismatch' ? plusOnePeso(r.valor) : r.valor;
    return { valor, validFrom: r.validFrom, validTo: r.validTo, source: 'datos.gov.co/32sa-8pi3 (fixture)' };
  }
}

/**
 * `valor` + 1 peso, in decimal-string arithmetic (review S-4): the TRM is never parsed as a float
 * (AD-CAT-3 rule 3). Accepts `"4123"`, `"4123.3"` or `"4123.37"`; keeps the input's scale.
 */
export function plusOnePeso(valor: string): string {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(valor);
  if (!m) throw new Error(`not a TRM decimal: ${valor}`);
  const [, whole, frac = ''] = m;
  const scale = frac.length;
  const units = BigInt(whole + frac) + 10n ** BigInt(scale);
  const s = units.toString().padStart(scale + 1, '0');
  return scale ? `${s.slice(0, -scale)}.${s.slice(-scale)}` : s;
}

// ------------------------------------------------------------------ top-up confirmation (ADD-§7)

/** V1 binding: the admin action forwards to commission's own commands (AD-COM-3 rule 1). */
export class AdminTopUpConfirmation implements TopUpConfirmationPort {
  constructor(private readonly commission: {
    confirmTopUp(input: { topUpRequestId: string; adminId: string }): Promise<unknown>;
    rejectTopUp(input: { topUpRequestId: string; adminId: string; reason: string }): Promise<unknown>;
  }) {}
  async confirm(topUpRequestId: string, actorId: string) { await this.commission.confirmTopUp({ topUpRequestId, adminId: actorId }); }
  async reject(topUpRequestId: string, reason: string, actorId: string) { await this.commission.rejectTopUp({ topUpRequestId, adminId: actorId, reason }); }
}
