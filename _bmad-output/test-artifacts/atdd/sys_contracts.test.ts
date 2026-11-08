// ATDD — SYS (contracts.md §0, §13, §14, §15): the cross-cutting proofs of the walking skeleton
// (Epic 1). Red phase: every test must fail with NotImplementedError. The static fitness
// functions of the same ADs (import graph, table ownership, payload registry, wall-clock scan,
// socket guard, grants) hold already and run green in _bmad-output/test-artifacts/fitness/.
// The admin panel's reads (S-SYS.tick, .deliveries, .health, .replay) are in sys_admin.test.ts, split from this file by
// the Impl-2 test review re-run (decision log Impl-2 #38); the shared Given steps are in test-support/suites/sys.ts.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DOMAIN_ERRORS, HTTP_STATUS, type DomainErrorCode } from '../../../src/shared-kernel/codes.js';
import { DomainError } from '../../../src/shared-kernel/errors.js';
import { raiserFor } from '../../../src/shared-kernel/raise.js';
import { createLogger, redact } from '../../../src/shared-kernel/regulated.js';
import { PgAuditLog } from '../../../src/shared-kernel/infra/pg-audit.js';
import { toErrorBody } from '../../../src/server/trpc/errors.js';
import { describeProceduresV2 } from '../../../src/server/trpc/router.v2.js';
import { IdnServiceV2 } from '../../../src/modules/identity/index.js';
import { PgTransactionRunner } from '../../../test-support/db.js';
import { caught } from '../../../test-support/errors.js';
import { codeOf } from '../../../test-support/concurrency.js';
import { at, explainAssert, HOUR, id, rows, T0, user, wiring } from '../../../test-support/solu2/fixtures.js';
import { singleConnectionPool } from '../../../test-support/single-connection.js';
import { useSysSuite } from '../../../test-support/suites/sys.js';

const { db, dispatcher, publish, delivery } = useSysSuite();
const cite = [{ rule: 'AD-SYS-1', inputs: { probe: 1 } }] as [{ rule: string; inputs: { probe: number } }];

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
    const pool = singleConnectionPool(db);
    try {
      const w = { ...wiring(db), transactions: new PgTransactionRunner(pool) };
      await user(db, { id: id('julian') });
      const idn = new IdnServiceV2(w);
      const result = await w.transactions.run(() => idn.getSellerVerification({ sellerId: id('julian') }));
      expect(result).toEqual({ status: 'none' });
    } finally {
      await pool.end();
    }
  });
});

describe('SYS-8.R2 — describeProceduresV2 (AD-SYS-8 rules 1–2, AD-16, NFR-IDN-3)', () => {
  type Ingress = { procedure: string; kind: string; builder: string; omit: string[] };
  const ingress = (JSON.parse(fs.readFileSync('_bmad-output/planning-artifacts/detailed-design/schemas/operations.json', 'utf8')) as { ingress: Ingress[] }).ingress.filter((p) => p.kind !== 'job');

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
