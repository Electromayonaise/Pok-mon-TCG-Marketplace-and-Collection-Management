// ATDD — SYS (contracts.md §0, §13, §14, §15): the cross-cutting proofs of the walking skeleton
// (Epic 1). Red phase: every test must fail with NotImplementedError. The static fitness
// functions of the same ADs (import graph, table ownership, payload registry, wall-clock scan,
// socket guard, grants) hold already and run green in docs/solu-2/test/fitness/.
import fs from 'node:fs';
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { DOMAIN_ERRORS, HTTP_STATUS, type DomainErrorCode } from '../../../../src/shared-kernel/codes.js';
import { DomainError } from '../../../../src/shared-kernel/errors.js';
import { raiserFor } from '../../../../src/shared-kernel/raise.js';
import { createLogger, redact } from '../../../../src/shared-kernel/regulated.js';
import { PgAuditLog } from '../../../../src/shared-kernel/infra/pg-audit.js';
import { OutboxDispatcherV2, type DeliveryHandler, type SubscriberName } from '../../../../src/shared-kernel/dispatcher.js';
import { AdminEventsServiceV2 } from '../../../../src/shared-kernel/admin-events.js';
import type { EventEnvelope } from '../../../../src/shared-kernel/events.js';
import { toErrorBody } from '../../../../src/server/trpc/errors.js';
import { describeProceduresV2 } from '../../../../src/server/trpc/router.v2.js';
import { IdnServiceV2 } from '../../../../src/modules/identity/index.js';
import { PgTransactionRunner, useTestDatabase } from '../../../../test-support/db.js';
import { PG } from '../../../../test-support/env.js';
import { caught, httpOf } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { admin, at, DAY, explainAssert, HOUR, id, ins, rows, T0, user, wiring } from '../../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();
const cite = [{ rule: 'AD-SYS-1', inputs: { probe: 1 } }] as [{ rule: string; inputs: { probe: number } }];

/** A dispatcher whose handlers record each envelope they run, and optionally throw. */
function dispatcher(w: ReturnType<typeof wiring>, fail: Partial<Record<SubscriberName, () => Error>> = {}) {
  const ran: { subscriber: SubscriberName; envelope: EventEnvelope }[] = [];
  const handler = (subscriber: SubscriberName): DeliveryHandler => async (_tx, envelope) => {
    ran.push({ subscriber, envelope });
    const f = fail[subscriber];
    if (f) throw f();
  };
  return { ran, d: new OutboxDispatcherV2({ transactions: w.transactions, clock: w.clock }, { commission: handler('commission'), listings: handler('listings'), collections: handler('collections') }) };
}
/** Commits one CommissionBalanceExhausted event (one `listings` delivery) at the virtual clock's now. */
async function publish(w: ReturnType<typeof wiring>): Promise<string> {
  const envelope = await w.transactions.run((tx) => w.outbox.enqueue(tx, 'CommissionBalanceExhausted', id('tienda'), { businessId: id('tienda'), ledgerSeq: 7, balanceAfter: -1_200 }));
  return envelope.eventId;
}
/** An OutboxEvent plus one delivery in a given state, for the admin panel reads. */
async function delivery(eventId: string, o: { status: 'pending' | 'delivered' | 'failed'; attempts?: number; createdAt?: string; firstFailedAt?: string }) {
  await ins(db, 'OutboxEvent', { id: eventId, type: 'CommissionBalanceExhausted', aggregateId: id('tienda'), schemaVersion: 1, payload: JSON.stringify({ businessId: id('tienda'), ledgerSeq: 1, balanceAfter: 0 }), createdAt: o.createdAt ?? T0 }, 'none');
  const failed = o.status === 'failed';
  await ins(db, 'EventDelivery', {
    eventId, subscriber: 'listings', status: o.status, attempts: o.attempts ?? (failed ? 1 : 0),
    lastErrorCode: failed ? 'Unexpected' : null, firstFailedAt: failed ? (o.firstFailedAt ?? T0) : null, lastFailedAt: failed ? (o.firstFailedAt ?? T0) : null,
    deliveredAt: o.status === 'delivered' ? T0 : null, createdAt: o.createdAt ?? T0, updatedAt: o.createdAt ?? T0,
  });
}
function events(w: ReturnType<typeof wiring>) {
  return new AdminEventsServiceV2({ ...w, dispatcher: dispatcher(w).d });
}

describe('SYS-1.R2 — raiserFor (AD-11, AD-SYS-1 rule 2)', () => {
  it('[SYS-1.R2] a non-owner raise fails as Unexpected; the owner raise is a DomainError with its code', async () => {
    const foreign = await caught(() => raiserFor('reviews')('AdminOnly', cite));
    expect(codeOf(foreign)).toBe('Unexpected');
    const own = await caught(() => raiserFor('identity')('AdminOnly', cite));
    expect(own).toBeInstanceOf(DomainError);
    expect(codeOf(own)).toBe('AdminOnly');
  });
});

describe('SYS-1.R6 — toErrorBody (AD-SYS-1, R-9)', () => {
  it('[SYS-1.R6] every registry code formats with its family status, an es-CO message and a cited decision', () => {
    const now = new Date(T0);
    for (const code of Object.keys(DOMAIN_ERRORS) as DomainErrorCode[]) {
      const body = toErrorBody(new DomainError(code, cite), now);
      expect(body.code).toBe(code);
      expect(body.httpStatus).toBe(HTTP_STATUS[DOMAIN_ERRORS[code].trpc]);
      explainAssert(body.decision, { code, rule: 'AD-SYS-1', occurredAt: T0 });
    }
  });

  it('[SYS-1.R6.unexpected] a non-domain error is Unexpected (500) and its message never reaches the body', () => {
    const body = toErrorBody(new Error('relation "Order" does not exist at 10.0.0.7'), new Date(T0));
    expect(body).toMatchObject({ code: 'Unexpected', httpStatus: 500 });
    expect(JSON.stringify(body)).not.toMatch(/relation|10\.0\.0\.7/);
  });

  it('[SYS-1.R6.s2] two NotVisibleToCaller bodies differ only in occurredAt (S-2)', () => {
    const a = toErrorBody(new DomainError('OrderNotVisibleToCaller', [{ rule: 'FR-ORD-5', inputs: {} }]), new Date(T0));
    const b = toErrorBody(new DomainError('OrderNotVisibleToCaller', [{ rule: 'FR-ORD-5', inputs: {} }]), new Date(Date.parse(T0) + HOUR));
    expect({ ...a, decision: { ...a.decision, occurredAt: null } }).toEqual({ ...b, decision: { ...b.decision, occurredAt: null } });
  });
});

describe('SYS-2.R4 — sweep (AD-SYS-2 rules 4–6)', () => {
  it('[SYS-2.R4] a pending delivery with 3 unrecorded attempts becomes failed DeliveryAttemptsExhausted, and its handler never runs again', async () => {
    const w = wiring(db);
    await delivery(id('ev1'), { status: 'pending', attempts: 3, createdAt: at(-HOUR) });
    const { d, ran } = dispatcher(w);
    const result = await d.sweep();
    expect(result).toMatchObject({ attempted: 1, delivered: 0, failed: 1 });
    expect(ran).toEqual([]);
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'failed', attempts: 3, lastErrorCode: 'DeliveryAttemptsExhausted', firstFailedAt: new Date(T0), lastFailedAt: new Date(T0) }]);
  });

  it('[SYS-2.R4.code] a throwing handler records the registry code, never the message, and the failed row is not retried by the sweeper', async () => {
    const w = wiring(db);
    await publish(w);
    w.clock.advance(61_000);
    const { d, ran } = dispatcher(w, { listings: () => new DomainError('ListingNotFound', cite) });
    await d.sweep();
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'failed', attempts: 1, lastErrorCode: 'ListingNotFound' }]);
    w.clock.advance(HOUR);
    expect(await d.sweep()).toMatchObject({ attempted: 0 });
    expect(ran).toHaveLength(1);
  });
});

describe('SYS-2.R6 — dispatch (AD-SYS-2 rules 1, 5, 6; AD-10)', () => {
  it('[SYS-2.R6] a crash between commit and dispatch: the sweeper delivers it once, with the R-1 envelope, and a second sweep finds nothing', async () => {
    const w = wiring(db);
    const eventId = await publish(w);
    w.clock.advance(61_000);
    const { d, ran } = dispatcher(w);
    expect(await d.sweep()).toMatchObject({ attempted: 1, delivered: 1, failed: 0 });
    expect(await d.sweep()).toMatchObject({ attempted: 0 });
    expect(ran).toEqual([{ subscriber: 'listings', envelope: { eventId, type: 'CommissionBalanceExhausted', occurredAt: T0, schemaVersion: 1, payload: { businessId: id('tienda'), ledgerSeq: 7, balanceAfter: -1_200 } } }]);
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'delivered', attempts: 1 }]);
  });

  it('[SYS-2.R6.young] dispatch after commit delivers at once; the sweeper ignores pending rows younger than 60 s', async () => {
    const w = wiring(db);
    const eventId = await publish(w);
    const { d, ran } = dispatcher(w);
    expect(await d.dispatch([eventId])).toEqual({ delivered: 1, failed: 0 });
    expect(ran).toHaveLength(1);
  });
});

describe('SYS-4.R9 — getSellerVerification (AD-SYS-4 rule 9)', () => {
  it('[SYS-4.R9] a neighbour query inside an open transaction completes with a pool of 1 (no second connection)', async () => {
    const pool = new pg.Pool({ ...PG, database: (db.pool.options as { database: string }).database, max: 1 });
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      const w = { ...wiring(db), transactions: new PgTransactionRunner(pool) };
      await user(db, { id: id('julian') });
      const idn = new IdnServiceV2(w);
      const deadlock = new Promise<never>((_, reject) => { watchdog = setTimeout(() => reject(new Error('deadlock: a second connection was requested')), 3_000); });
      const result = await Promise.race([w.transactions.run(() => idn.getSellerVerification({ sellerId: id('julian') })), deadlock]);
      expect(result).toEqual({ status: 'none' });
    } finally {
      clearTimeout(watchdog);
      await pool.end();
    }
  });
});

describe('SYS-8.R2 — describeProceduresV2 (AD-SYS-8 rules 1–2, AD-16, NFR-IDN-3)', () => {
  type Ingress = { procedure: string; kind: string; builder: string; omit: string[] };
  const ingress = (JSON.parse(fs.readFileSync('docs/solu-2/planning/detailed-design/schemas/operations.json', 'utf8')) as { ingress: Ingress[] }).ingress.filter((p) => p.kind !== 'job');

  it('[SYS-8.R2] the router is exactly the registry, each procedure on its builder, with no role-like or actor input key', () => {
    const shapes = describeProceduresV2();
    expect(shapes.map((s) => s.procedure).sort()).toEqual(ingress.map((p) => p.procedure).sort());
    for (const s of shapes) {
      const reg = ingress.find((p) => p.procedure === s.procedure)!;
      expect([s.procedure, s.builder, s.kind]).toEqual([reg.procedure, reg.builder, reg.kind]);
      expect(s.inputKeys.filter((k) => /^(role|roles|sellerKind|isAdmin|capabilities)$/.test(k) || reg.omit.includes(k))).toEqual([]);
    }
  });
});

describe('SYS-8.R4 — redact (AD-SYS-8 rules 3–4, AD-17)', () => {
  const canary = (field: string) => `CANARY-${field}-7f3a`;
  const regulated = {
    orderId: id('ord1'),
    legalIdentity: { nit: canary('nit'), legalName: canary('legalName') },
    comprobanteKey: canary('comprobanteKey'),
    documentKeys: [canary('documentKey')],
    uploadKey: canary('uploadKey'),
    signedUrl: `https://storage.test/${canary('signedUrl')}`,
    token: canary('token'),
    contactPhoneE164: canary('phone'),
    body: canary('body'),
  };

  it('[SYS-8.R4] canary scan = 0: no canary in captured log lines, and non-regulated ids survive', () => {
    const lines: string[] = [];
    const log = createLogger((line) => lines.push(line));
    log.info('orders.comprobante.attached', regulated);
    log.error('verification.submit.failed', { nested: regulated });
    const captured = lines.join('\n');
    expect(captured.match(/CANARY-/g) ?? []).toEqual([]);
    expect(captured).toContain(id('ord1'));
  });

  it('[SYS-8.R4.redact] the redactor keeps the shape and replaces every regulated value', () => {
    const out = redact(regulated);
    expect(JSON.stringify(out).match(/CANARY-/g) ?? []).toEqual([]);
    expect(out.orderId).toBe(id('ord1'));
    expect(Object.keys(out).sort()).toEqual(Object.keys(regulated).sort());
  });

  it('[SYS-8.R4.error] a citation carrying a phone is redacted in the error body', () => {
    const body = toErrorBody(new DomainError('ContactRateLimited', [{ rule: 'FR-MSG-2', inputs: { phone: canary('phone'), listingId: id('l1') } }]), new Date(T0));
    expect(JSON.stringify(body).match(/CANARY-/g) ?? []).toEqual([]);
  });
});

describe('SYS-R2 — record (R-2; AD-SYS-2 rule 10)', () => {
  const entry = { actorId: null, actorKind: 'system' as const, module: 'shared-kernel' as const, action: 'shared-kernel.probe.recorded', aggregateType: 'Probe', aggregateId: id('probe'), decisionCode: null, data: { n: 1 } };

  it('[SYS-R2] an audit row rolls back with its transaction and commits with it; the app role cannot rewrite it', async () => {
    const w = wiring(db);
    const audit = new PgAuditLog(w.ids, w.clock);
    const aborted = await caught(() => w.transactions.run(async (tx) => { await audit.record(tx, entry); throw new Error('abort after audit'); }));
    expect((aborted as Error).message).toBe('abort after audit');
    expect(await rows(db, 'audit_events')).toEqual([]);
    await w.transactions.run((tx) => audit.record(tx, entry));
    expect(await rows(db, 'audit_events')).toMatchObject([{ action: 'shared-kernel.probe.recorded', createdAt: new Date(T0) }]);
    const [grant] = await db.query<{ u: boolean; d: boolean }>(`SELECT has_table_privilege('tezg_app', 'audit_events', 'UPDATE') AS u, has_table_privilege('tezg_app', 'audit_events', 'DELETE') AS d`);
    expect(grant).toEqual({ u: false, d: false });
  });
});

describe('S-SYS.tick — getTickHealth (ARCH §4)', () => {
  it('[S-SYS.tick.h] 3 h after the last tick, read inside 10:17–23:17 Bogotá, tickSilent=true; 1 h after, false', async () => {
    await admin(db);
    await ins(db, 'JobRun', { id: id('run1'), trigger: 'tick', job: 'tick', startedAt: T0, finishedAt: T0, outcome: 'succeeded', errorCode: null });
    const w = wiring(db);
    w.clock.advance(HOUR);
    expect(await events(w).getTickHealth({ adminId: id('admin') })).toMatchObject({ lastTickStartedAt: T0, tickSilent: false });
    w.clock.advance(2 * HOUR + 60_000);
    const silent = await events(w).getTickHealth({ adminId: id('admin') });
    expect(silent.tickSilent).toBe(true);
    explainAssert(silent.decision, { inputs: { lastTickStartedAt: T0 } });
  });
});

describe('S-SYS.deliveries — listDeliveries (AD-SYS-2 rule 9)', () => {
  it('[S-SYS.deliveries.h] failed rows by firstFailedAt; stuck = pending older than 24 h by createdAt; 25 per page', async () => {
    await admin(db);
    for (let i = 0; i < 27; i++) await delivery(id(`f${i}`), { status: 'failed', createdAt: at(-3 * DAY), firstFailedAt: at(-2 * DAY + i * HOUR) });
    await delivery(id('stuck'), { status: 'pending', createdAt: at(-25 * HOUR) });
    await delivery(id('young'), { status: 'pending', createdAt: at(-23 * HOUR) });
    const svc = events(wiring(db));
    const failed = await svc.listDeliveries({ adminId: id('admin'), kind: 'failed', cursor: null });
    expect(failed.rows).toHaveLength(25);
    expect(failed.rows[0]!.eventId).toBe(id('f0'));
    expect(failed.nextCursor).not.toBeNull();
    const stuck = await svc.listDeliveries({ adminId: id('admin'), kind: 'stuck', cursor: null });
    expect(stuck.rows.map((r) => r.eventId)).toEqual([id('stuck')]);
  });
});

describe('S-SYS.health — getDeliveryHealth (AD-SYS-2 rule 9)', () => {
  it('[S-SYS.health.h] counts failed rows, the oldest firstFailedAt and stuck pending rows; delivered rows are not counted', async () => {
    await admin(db);
    await delivery(id('f1'), { status: 'failed', firstFailedAt: at(-2 * DAY) });
    await delivery(id('f2'), { status: 'failed', firstFailedAt: at(-DAY) });
    await delivery(id('ok'), { status: 'delivered' });
    await delivery(id('stuck'), { status: 'pending', createdAt: at(-25 * HOUR) });
    expect(await events(wiring(db)).getDeliveryHealth({ adminId: id('admin') })).toEqual({ failedCount: 2, oldestFirstFailedAt: at(-2 * DAY), stuckPendingCount: 1, latestDigest: null });
  });
});

describe('S-SYS.replay — replayEventDelivery (AD-SYS-2 rule 7)', () => {
  it('[S-SYS.replay.h] a failed delivery replays to delivered, keeps firstFailedAt, and writes one EventReplayLog row', async () => {
    await admin(db);
    await delivery(id('ev1'), { status: 'failed', firstFailedAt: at(-DAY) });
    const w = wiring(db);
    const result = await events(w).replayEventDelivery({ adminId: id('admin'), eventId: id('ev1'), subscriber: 'listings' });
    expect(result).toMatchObject({ status: 'delivered', replayed: true });
    expect(await rows(db, 'EventDelivery')).toMatchObject([{ status: 'delivered', firstFailedAt: new Date(at(-DAY)), lastAttemptAt: new Date(T0) }]);
    expect(await rows(db, 'EventReplayLog')).toMatchObject([{ adminId: id('admin'), outcome: 'delivered' }]);
  });

  it('[S-SYS.replay.f] a pending delivery is EventDeliveryNotReplayable (409) citing its status, with zero writes', async () => {
    await admin(db);
    await delivery(id('ev1'), { status: 'pending' });
    const error = await caught(() => events(wiring(db)).replayEventDelivery({ adminId: id('admin'), eventId: id('ev1'), subscriber: 'listings' }));
    expect(codeOf(error)).toBe('EventDeliveryNotReplayable');
    expect(httpOf(error)).toBe(409);
    expect(await rows(db, 'EventReplayLog')).toEqual([]);
  });
});
