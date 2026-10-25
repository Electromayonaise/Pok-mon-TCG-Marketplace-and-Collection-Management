// Driven adapter — the Postgres repository of SYS (AD-8: shared-kernel owns EventReplayLog).
// Every write goes through the caller's `tx`. Proven by admin-events.test.ts and sys › S-SYS.replay.
import type { AdminEventsRepository, ReplayLogRow } from '../admin-events.js';
import type { Tx } from '../ports.js';

export class PgAdminEventsRepository implements AdminEventsRepository {
  async insertReplayLog(tx: Tx, row: ReplayLogRow): Promise<void> {
    await tx.query(
      `INSERT INTO "EventReplayLog" (id, "adminId", "eventId", subscriber, outcome, "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
      [row.id, row.adminId, row.eventId, row.subscriber, row.outcome, row.createdAt],
    );
  }
}
