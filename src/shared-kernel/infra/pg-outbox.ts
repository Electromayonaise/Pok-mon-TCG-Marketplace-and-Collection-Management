// Driven adapter — the Postgres outbox (AD-SYS-2 rule 1): the OutboxEvent row and one pending
// EventDelivery per registered subscriber are inserted through the publisher's `tx`, so they
// commit or roll back with the change that raised the event. The AD-SYS-8 redactor runs over the
// payload. Proven by pg-outbox.test.ts.
import { EVENT_SCHEMA_VERSIONS, EVENT_SUBSCRIBERS, type EventEnvelope, type EventPayloads, type EventType, type OutboxV2 } from '../events.js';
import type { Clock, IdGenerator, Tx } from '../ports.js';
import { redact } from '../regulated.js';
import type { CuidId } from '../types.js';

export class PgOutboxV2 implements OutboxV2 {
  constructor(protected readonly ids: IdGenerator, protected readonly clock: Clock) {}

  /** Writes through `tx` and never commits it; returns the R-1 envelope the dispatcher delivers. */
  async enqueue<T extends EventType>(tx: Tx, type: T, aggregateId: CuidId, payload: EventPayloads[T]): Promise<EventEnvelope<T>> {
    const eventId = this.ids.next();
    const at = this.clock.now().toISOString();
    const stored = redact(payload);
    await tx.query(
      `INSERT INTO "OutboxEvent" (id, type, "aggregateId", "schemaVersion", payload, "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
      [eventId, type, aggregateId, EVENT_SCHEMA_VERSIONS[type], JSON.stringify(stored), at],
    );
    for (const subscriber of EVENT_SUBSCRIBERS[type]) {
      await tx.query(
        `INSERT INTO "EventDelivery" ("eventId", subscriber, status, attempts, "createdAt", "updatedAt") VALUES ($1, $2, 'pending', 0, $3, $3)`,
        [eventId, subscriber, at],
      );
    }
    return { eventId, type, occurredAt: at, schemaVersion: EVENT_SCHEMA_VERSIONS[type], payload: stored };
  }
}
