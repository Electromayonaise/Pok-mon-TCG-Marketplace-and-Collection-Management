// Test binding of the Outbox port (AD-SYS-2 rules 1 and 3): writes OutboxEvent plus one
// pending EventDelivery per registered subscriber inside the publisher's transaction, so a
// rollback removes both — the property the contracts assert on.
import type { IdGenerator, Outbox, OutboxEnvelope, Tx } from '../src/shared-kernel/ports.js';
import type { Clock } from '../src/shared-kernel/ports.js';

/** ARCH §7.1 subscriber registry. */
export const SUBSCRIBERS: Record<OutboxEnvelope['type'], readonly ('commission' | 'listings' | 'collections')[]> = {
  BusinessApplicationApproved: ['commission', 'listings'],
  BusinessApplicationRejected: ['listings'],
  OrderPaymentConfirmedByBusiness: ['commission'],
  OrderClosed: ['commission', 'collections'],
  CommissionBalanceExhausted: ['listings'],
  CommissionBalanceReplenished: ['listings'],
  TradeAccepted: [],
};

export class SqlOutbox implements Outbox {
  constructor(
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async enqueue(tx: Tx, event: OutboxEnvelope): Promise<{ eventId: string }> {
    const eventId = this.ids.next();
    const at = this.clock.now().toISOString();
    await tx.query(
      `INSERT INTO "OutboxEvent" (id, type, "aggregateId", payload, "createdAt") VALUES ($1, $2, $3, $4, $5)`,
      [eventId, event.type, event.aggregateId, JSON.stringify(event.payload), at],
    );
    for (const subscriber of SUBSCRIBERS[event.type]) {
      await tx.query(
        `INSERT INTO "EventDelivery" ("eventId", subscriber, status, attempts, "createdAt") VALUES ($1, $2, 'pending', 0, $3)`,
        [eventId, subscriber, at],
      );
    }
    return { eventId };
  }
}
