import { DomainError } from './errors.js';
import type { EventEnvelope, EventType } from './events.js';
import type { Clock, TransactionRunner, Tx } from './ports.js';
import { raiserFor } from './raise.js';
import type { CuidId } from './types.js';

// The outbox dispatcher, sweeper and replay (AD-SYS-2 rules 4–7): the driving adapter that runs
// a subscriber's handler for one EventDelivery. It owns the delivery tables (AD-8, shared-kernel)
// and writes them directly; every instant is the Clock's (AD-SYS-6). Proven by sys › [SYS-2.*].

export type SubscriberName = 'commission' | 'listings' | 'collections';

/**
 * One subscriber's handler, run inside the delivery's handler transaction (rule 4 step 2), so
 * the subscriber's state and the `delivered` row commit together. It reads only the envelope's
 * payload (AD-9) and is idempotent by its natural keys (ARCH §7).
 */
export type DeliveryHandler = (tx: Tx, envelope: EventEnvelope) => Promise<void>;

export interface DispatcherV2 {
  /** Rule 5: after commit, one attempt per pending delivery of these events. */
  dispatch(eventIds: CuidId[]): Promise<{ delivered: number; failed: number }>;
  /** Rule 6: pending deliveries older than 60 s, oldest first, at most 50, one attempt each. */
  sweep(): Promise<{ attempted: number; delivered: number; failed: number }>;
  /**
   * Rule 7: re-runs one `failed` delivery in its claim transaction. `record` runs once, in the
   * transaction that settles the outcome (decision log Impl-1 #15). Any state but `failed`
   * raises EventDeliveryNotReplayable and records nothing.
   */
  replay(eventId: CuidId, subscriber: SubscriberName, record: ReplayRecorder): Promise<ReplayResult>;
}

export type ReplayOutcome = 'delivered' | 'failed' | 'noop';
/** Writes the EventReplayLog row through the settling `tx`. */
export type ReplayRecorder = (tx: Tx, outcome: ReplayOutcome) => Promise<void>;
/** `errorCode` is the handler's stored code when a replay ran and threw. */
export type ReplayResult = { status: 'delivered' | 'failed'; replayed: boolean; errorCode?: string };

export interface DispatcherV2Deps {
  transactions: TransactionRunner;
  clock: Clock;
}

/** Rule 4: at most 3 automatic attempts are ever counted. */
const MAX_ATTEMPTS = 3;
/** Rule 6: the sweeper leaves younger pending rows to the post-commit dispatch. */
const SWEEP_AGE_MS = 60_000;
const SWEEP_BATCH = 50;

const raise = raiserFor('shared-kernel');

type Outcome = 'delivered' | 'failed' | 'skipped';
type DeliveryKey = { eventId: CuidId; subscriber: SubscriberName };

/** The stored error code of a throwing handler: its registry code, never its message (rule 4 step 3). */
function errorCodeOf(error: unknown): string {
  return error instanceof DomainError ? error.code : 'Unexpected';
}

export class OutboxDispatcherV2 implements DispatcherV2 {
  constructor(
    protected readonly deps: DispatcherV2Deps,
    protected readonly handlers: Readonly<Record<SubscriberName, DeliveryHandler>>,
  ) {}

  async dispatch(eventIds: CuidId[]): Promise<{ delivered: number; failed: number }> {
    if (eventIds.length === 0) return { delivered: 0, failed: 0 };
    const keys = await this.pending(
      `SELECT "eventId", subscriber FROM "EventDelivery" WHERE "eventId" = ANY($1) AND status = 'pending' ORDER BY "eventId", subscriber`,
      [eventIds],
    );
    const { delivered, failed } = await this.attemptAll(keys);
    return { delivered, failed };
  }

  async sweep(): Promise<{ attempted: number; delivered: number; failed: number }> {
    const cutoff = new Date(this.deps.clock.now().getTime() - SWEEP_AGE_MS).toISOString();
    const keys = await this.pending(
      `SELECT "eventId", subscriber FROM "EventDelivery" WHERE status = 'pending' AND "createdAt" < $1
       ORDER BY "createdAt", "eventId", subscriber LIMIT ${SWEEP_BATCH}`,
      [cutoff],
    );
    return { attempted: keys.length, ...(await this.attemptAll(keys)) };
  }

  async replay(eventId: CuidId, subscriber: SubscriberName, record: ReplayRecorder): Promise<ReplayResult> {
    const { transactions, clock } = this.deps;
    let thrown: { error: unknown } | undefined;
    // Rule 7: `lastAttemptAt` is the claim time in both outcomes, however long the handler runs.
    let claimAt = '';
    try {
      // Claim the failed row and run the handler in the claim transaction; the log row commits with it.
      const claimed = await transactions.run(async (tx) => {
        claimAt = clock.now().toISOString();
        const { rowCount } = await tx.query(
          `SELECT 1 FROM "EventDelivery" WHERE "eventId" = $1 AND subscriber = $2 AND status = 'failed' FOR UPDATE SKIP LOCKED`,
          [eventId, subscriber],
        );
        if (rowCount === 0) return false;
        const envelope = await this.envelope(tx, eventId);
        try {
          await this.handlers[subscriber](tx, envelope);
        } catch (error) {
          thrown = { error };
          throw error;
        }
        // Decision log Impl-1 #17: `attempts` counts automatic attempts only; a replay leaves it.
        await tx.query(
          `UPDATE "EventDelivery" SET status = 'delivered', "deliveredAt" = $3, "lastAttemptAt" = $4, "updatedAt" = $3
           WHERE "eventId" = $1 AND subscriber = $2`,
          [eventId, subscriber, clock.now().toISOString(), claimAt],
        );
        await record(tx, 'delivered');
        return true;
      });
      if (claimed) return { status: 'delivered', replayed: true };
    } catch (error) {
      if (!thrown) throw error;
      // The claim transaction rolled back; record the failure apart, firstFailedAt untouched.
      const errorCode = errorCodeOf(thrown.error);
      await transactions.run(async (tx) => {
        const now = clock.now().toISOString();
        await tx.query(
          `UPDATE "EventDelivery" SET "lastErrorCode" = $4, "lastAttemptAt" = $5, "lastFailedAt" = $3, "updatedAt" = $3
           WHERE "eventId" = $1 AND subscriber = $2 AND status = 'failed'`,
          [eventId, subscriber, now, errorCode, claimAt],
        );
        await record(tx, 'failed');
      });
      return { status: 'failed', replayed: true, errorCode };
    }
    // Nothing claimed: a still-failed row is held by a concurrent replay; any other state refuses.
    const { rows } = await transactions.run((tx) => tx.query<{ status: string }>(
      `SELECT status FROM "EventDelivery" WHERE "eventId" = $1 AND subscriber = $2`,
      [eventId, subscriber],
    ), { readOnly: true });
    const status = rows[0]?.status ?? 'none';
    if (status !== 'failed') raise('EventDeliveryNotReplayable', [{ rule: 'AD-SYS-2', inputs: { eventId, subscriber, status } }]);
    await transactions.run((tx) => record(tx, 'noop'));
    return { status: 'failed', replayed: false };
  }

  private async pending(sql: string, params: unknown[]): Promise<DeliveryKey[]> {
    const { rows } = await this.deps.transactions.run((tx) => tx.query<DeliveryKey>(sql, params), { readOnly: true });
    return rows;
  }

  private async attemptAll(keys: DeliveryKey[]): Promise<{ delivered: number; failed: number }> {
    const result = { delivered: 0, failed: 0 };
    for (const { eventId, subscriber } of keys) {
      const outcome = await this.attempt(eventId, subscriber);
      if (outcome !== 'skipped') result[outcome]++;
    }
    return result;
  }

  /** Rule 4, the attempt procedure: count, then run the handler, then record a throw apart. */
  private async attempt(eventId: CuidId, subscriber: SubscriberName): Promise<Outcome> {
    const { transactions, clock } = this.deps;
    // Step 1: count the attempt in its own committed transaction, or fail an exhausted row.
    const counted = await transactions.run(async (tx) => {
      const now = clock.now().toISOString();
      const { rowCount } = await tx.query(
        `UPDATE "EventDelivery" SET attempts = attempts + 1, "lastAttemptAt" = $3, "updatedAt" = $3
         WHERE "eventId" = $1 AND subscriber = $2 AND status = 'pending' AND attempts < ${MAX_ATTEMPTS}`,
        [eventId, subscriber, now],
      );
      if (rowCount > 0) return 'counted';
      const exhausted = await tx.query(
        `UPDATE "EventDelivery" SET status = 'failed', "firstFailedAt" = COALESCE("firstFailedAt", $3), "lastFailedAt" = $3,
           "lastErrorCode" = 'DeliveryAttemptsExhausted', "updatedAt" = $3
         WHERE "eventId" = $1 AND subscriber = $2 AND status = 'pending' AND attempts >= ${MAX_ATTEMPTS}`,
        [eventId, subscriber, now],
      );
      return exhausted.rowCount > 0 ? 'exhausted' : 'gone';
    });
    if (counted === 'exhausted') return 'failed';
    if (counted === 'gone') return 'skipped';
    // Step 2: claim the row and run the handler; the `delivered` row commits with its effects.
    let thrown: { error: unknown } | undefined;
    try {
      const ran = await transactions.run(async (tx) => {
        const claimed = await tx.query(
          `SELECT 1 FROM "EventDelivery" WHERE "eventId" = $1 AND subscriber = $2 AND status = 'pending' FOR UPDATE SKIP LOCKED`,
          [eventId, subscriber],
        );
        if (claimed.rowCount === 0) return false;
        const envelope = await this.envelope(tx, eventId);
        try {
          await this.handlers[subscriber](tx, envelope);
        } catch (error) {
          thrown = { error };
          throw error;
        }
        await tx.query(
          `UPDATE "EventDelivery" SET status = 'delivered', "deliveredAt" = $3, "updatedAt" = $3 WHERE "eventId" = $1 AND subscriber = $2`,
          [eventId, subscriber, clock.now().toISOString()],
        );
        return true;
      });
      return ran ? 'delivered' : 'skipped';
    } catch (error) {
      // Step 3 is for a handler that throws. Any other error (a lost connection, a failed claim)
      // leaves the row `pending` with this attempt counted, for the sweeper to retry.
      if (!thrown) throw error;
      const errorCode = errorCodeOf(thrown.error);
      // Step 3: the handler transaction rolled back; record the failure in a separate one.
      await transactions.run((tx) => tx.query(
        `UPDATE "EventDelivery" SET status = 'failed', "firstFailedAt" = COALESCE("firstFailedAt", $3), "lastFailedAt" = $3,
           "lastErrorCode" = $4, "updatedAt" = $3
         WHERE "eventId" = $1 AND subscriber = $2 AND status = 'pending'`,
        [eventId, subscriber, clock.now().toISOString(), errorCode],
      ));
      return 'failed';
    }
  }

  /** The R-1 envelope, read back from the committed OutboxEvent (AD-9: the payload is the snapshot). */
  private async envelope(tx: Tx, eventId: CuidId): Promise<EventEnvelope> {
    const { rows } = await tx.query<{ type: EventType; schemaVersion: number; payload: EventEnvelope['payload']; createdAt: Date }>(
      `SELECT type, "schemaVersion", payload, "createdAt" FROM "OutboxEvent" WHERE id = $1`,
      [eventId],
    );
    const [event] = rows;
    if (!event) throw new Error(`OutboxEvent ${eventId} is missing`);
    return { eventId, type: event.type, occurredAt: event.createdAt.toISOString(), schemaVersion: event.schemaVersion, payload: event.payload };
  }
}
