// Driven adapter — the Postgres repository of SYS (AD-8: shared-kernel owns EventReplayLog,
// EventDelivery, OutboxEvent, FailedDeliveryDigest and JobRun). Every statement runs on the
// caller's `tx`, and every instant is a bound parameter from the clock, never SQL `now()`
// (AD-SYS-6). Proven by admin-events.test.ts and sys › S-SYS.replay, .tick, .deliveries, .health.
import type { DeliveryRowDTO, GetDeliveryHealthResponse, Subscriber } from '../admin-events.dto.js';
import type { AdminEventsRepository, DeliveryPageKey, ReplayLogRow } from '../admin-events.js';
import type { Tx } from '../ports.js';
import type { CuidId, IsoInstant } from '../types.js';

interface DeliveryRow {
  eventId: CuidId;
  eventType: string;
  subscriber: Subscriber;
  attempts: number;
  lastErrorCode: string | null;
  lastAttemptAt: Date | null;
  firstFailedAt: Date | null;
  lastFailedAt: Date | null;
  createdAt: Date;
}

const DELIVERY_COLUMNS = `d."eventId", e.type AS "eventType", d.subscriber, d.attempts, d."lastErrorCode", d."lastAttemptAt", d."firstFailedAt", d."lastFailedAt", d."createdAt"`;

/** Each set reads its own partial index in key order. `$1`–`$3` are the cursor key (NULL on the first page), `$4` the limit, `$5` the stuck cutoff. */
const LIST_SQL = {
  failed: `SELECT ${DELIVERY_COLUMNS} FROM "EventDelivery" d JOIN "OutboxEvent" e ON e.id = d."eventId"
    WHERE d.status = 'failed' AND ($1::timestamptz IS NULL OR (d."firstFailedAt", d."eventId", d.subscriber) > ($1::timestamptz, $2::text, $3::text))
    ORDER BY d."firstFailedAt", d."eventId", d.subscriber LIMIT $4`,
  stuck: `SELECT ${DELIVERY_COLUMNS} FROM "EventDelivery" d JOIN "OutboxEvent" e ON e.id = d."eventId"
    WHERE d.status = 'pending' AND d."createdAt" < $5 AND ($1::timestamptz IS NULL OR (d."createdAt", d."eventId", d.subscriber) > ($1::timestamptz, $2::text, $3::text))
    ORDER BY d."createdAt", d."eventId", d.subscriber LIMIT $4`,
} as const;

const iso = (d: Date | null): IsoInstant | null => (d === null ? null : d.toISOString());

export class PgAdminEventsRepository implements AdminEventsRepository {
  async insertReplayLog(tx: Tx, row: ReplayLogRow): Promise<void> {
    await tx.query(
      `INSERT INTO "EventReplayLog" (id, "adminId", "eventId", subscriber, outcome, "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
      [row.id, row.adminId, row.eventId, row.subscriber, row.outcome, row.createdAt],
    );
  }

  async readLastTickStartedAt(tx: Tx, notAfter: IsoInstant): Promise<IsoInstant | null> {
    const { rows } = await tx.query<{ startedAt: Date }>(
      `SELECT "startedAt" FROM "JobRun" WHERE trigger = 'tick' AND "startedAt" <= $1 ORDER BY "startedAt" DESC LIMIT 1`,
      [notAfter],
    );
    return iso(rows[0]?.startedAt ?? null);
  }

  async listDeliveries(tx: Tx, q: { kind: DeliveryPageKey['kind']; stuckBefore: IsoInstant; after: DeliveryPageKey | null; limit: number }): Promise<DeliveryRowDTO[]> {
    const params = [q.after?.at ?? null, q.after?.eventId ?? null, q.after?.subscriber ?? null, q.limit];
    const { rows } = await tx.query<DeliveryRow>(LIST_SQL[q.kind], q.kind === 'stuck' ? [...params, q.stuckBefore] : params);
    return rows.map((r) => ({
      eventId: r.eventId,
      eventType: r.eventType,
      subscriber: r.subscriber,
      attempts: r.attempts,
      lastErrorCode: r.lastErrorCode,
      lastAttemptAt: iso(r.lastAttemptAt),
      firstFailedAt: iso(r.firstFailedAt),
      lastFailedAt: iso(r.lastFailedAt),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async readDeliveryHealth(tx: Tx, stuckBefore: IsoInstant): Promise<GetDeliveryHealthResponse> {
    const { rows } = await tx.query<{ failedCount: number; oldestFirstFailedAt: Date | null; stuckPendingCount: number; digestDate: string | null; digestCount: number | null; digestStuck: number | null }>(
      `SELECT
         (SELECT count(*)::int FROM "EventDelivery" WHERE status = 'failed') AS "failedCount",
         (SELECT min("firstFailedAt") FROM "EventDelivery" WHERE status = 'failed') AS "oldestFirstFailedAt",
         (SELECT count(*)::int FROM "EventDelivery" WHERE status = 'pending' AND "createdAt" < $1) AS "stuckPendingCount",
         g."digestDate", g."digestCount", g."digestStuck"
       FROM (SELECT 1) AS one
       LEFT JOIN LATERAL (
         SELECT to_char(date, 'YYYY-MM-DD') AS "digestDate", count AS "digestCount", "stuckPendingCount" AS "digestStuck"
         FROM "FailedDeliveryDigest" ORDER BY date DESC LIMIT 1
       ) g ON true`,
      [stuckBefore],
    );
    const r = rows[0]!;
    return {
      failedCount: r.failedCount,
      oldestFirstFailedAt: iso(r.oldestFirstFailedAt),
      stuckPendingCount: r.stuckPendingCount,
      latestDigest: r.digestDate === null ? null : { date: r.digestDate, count: r.digestCount!, stuckPendingCount: r.digestStuck! },
    };
  }
}
