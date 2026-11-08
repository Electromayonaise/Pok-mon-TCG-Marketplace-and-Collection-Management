// VerServiceV2.decideApplication (VER-1): admin only, the race loser's re-read (Q-fail) and the barred snapshot (Q2).
// The supporting contracts S-FR-VER-8 and S-FR-VER-2: every rule-6 branch, upsert no-ops and shape, queue paging and its cursor.
// Split from ver.v2.test.ts by the Impl-2 test review (HIGH-2); the shared Given steps are in test-support/suites/ver.ts.
import { describe, expect, it } from 'vitest';
import { codeOf } from '../../../../test-support/concurrency.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { admin, at, business, DAY, explainAssert, id, rejectionReason, rows, user, wiring } from '../../../../test-support/solu2/fixtures.js';
import { VerServiceV2 } from './ver.v2.js';
import { useVerSuite } from '../../../../test-support/suites/ver.js';

const { db, setup } = useVerSuite();

describe('VerServiceV2.decideApplication — admin only (AD-16)', () => {
  it('a non-admin is AdminOnly, even past the router, and nothing is written', async () => {
    await user(db, { id: id('camila') });
    const applicationId = await business(db, id('andres'), 'Pending');
    const error = await caught(() => setup().ver.decideApplication({ applicationId, decision: { kind: 'approve' }, adminId: id('camila') }));
    expect(codeOf(error)).toBe('AdminOnly');
    expect(await db.counts(['ApplicationDecisionLog', 'OutboxEvent', 'audit_events'])).toEqual({ ApplicationDecisionLog: 0, OutboxEvent: 0, audit_events: 0 });
  });
});

describe('VerServiceV2.decideApplication — the race loser (VER-1 Q-fail, AD-VER-1 rule 3)', () => {
  /** The P3 read saw Pending, but another decider committed first: the UPDATE matches 0 rows. */
  function staleRead(w: ReturnType<typeof wiring>) {
    const repo = Object.create(w.repo) as typeof w.repo;
    let reads = 0;
    repo.readDecisionState = async (tx, applicationId) =>
      reads++ === 0 ? { status: 'Pending', decidedBy: null, decidedAt: null } : w.repo.readDecisionState(tx, applicationId);
    return new VerServiceV2({ ...w, repo });
  }

  it('re-reads and names the winner, and writes no log, audit or event row', async () => {
    await admin(db);
    await admin(db, id('admin2'));
    const applicationId = await business(db, id('andres'), 'Approved');
    const error = await caught(() => staleRead(wiring(db)).decideApplication({ applicationId, decision: { kind: 'approve' }, adminId: id('admin2') }));
    expect(codeOf(error)).toBe('ApplicationNotPending');
    expect(citedInputs(error)).toEqual({ status: 'Approved', decidedBy: id('admin'), decidedAt: at(-DAY) });
    expect(await db.counts(['ApplicationDecisionLog', 'OutboxEvent', 'audit_events'])).toEqual({ ApplicationDecisionLog: 0, OutboxEvent: 0, audit_events: 0 });
  });

  it('a row gone by the re-read is ApplicationNotFound', async () => {
    await admin(db);
    const error = await caught(() => staleRead(wiring(db)).decideApplication({ applicationId: id('noapp'), decision: { kind: 'approve' }, adminId: id('admin') }));
    expect(codeOf(error)).toBe('ApplicationNotFound');
  });
});

describe('VerServiceV2.decideApplication — the barred snapshot (VER-1 Q2, AD-VER-1 rule 5)', () => {
  it('a barred reason sets reapplyBarred with no date, publishes barred: true and cites it', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'Fraud', barred: true });
    const applicationId = await business(db, id('andres'), 'Pending');
    const { ver } = setup();
    const result = await ver.decideApplication({ applicationId, decision: { kind: 'reject', reasonCode: 'Fraud', note: 'Documento alterado' }, adminId: id('admin') });
    expect(await rows(db, 'BusinessApplication', 'id = $1', [applicationId])).toMatchObject([{ status: 'Rejected', reapplyBarred: true, reapplyNotBefore: null, rejectionNote: 'Documento alterado' }]);
    const [event] = await rows<{ payload: Record<string, unknown> }>(db, 'OutboxEvent', `type = 'BusinessApplicationRejected'`);
    expect(event?.payload).toMatchObject({ applicationId, reasonCode: 'Fraud', barred: true });
    expect(event?.payload).not.toHaveProperty('reapplyNotBefore');
    explainAssert(result.decision, { outcome: 'allowed', rule: 'FR-VER-4', inputs: { applicationId, reasonCode: 'Fraud', barred: true } });
    expect(await rows(db, 'ApplicationDecisionLog')).toMatchObject([{ decision: 'Rejected', reasonCode: 'Fraud', adminId: id('admin') }]);
  });

  it('a later edit of the reason never moves the snapshot', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'DataMismatch', cooldownDays: 7 });
    const applicationId = await business(db, id('andres'), 'Pending');
    const { w, ver } = setup();
    await ver.decideApplication({ applicationId, decision: { kind: 'reject', reasonCode: 'DataMismatch', note: null }, adminId: id('admin') });
    await db.query(`UPDATE "RejectionReason" SET "cooldownDays" = 30 WHERE code = 'DataMismatch'`);
    const [app] = await rows<{ reapplyNotBefore: Date }>(db, 'BusinessApplication', 'id = $1', [applicationId]);
    expect(app?.reapplyNotBefore.toISOString()).toBe(new Date(w.clock.now().getTime() + 7 * DAY).toISOString());
  });
});

describe('VerServiceV2.setRejectionReasonActive (S-FR-VER-8.active, AD-VER-1 rule 6)', () => {
  const changes = () => rows<{ before: { active: boolean } | null; after: { active: boolean } }>(db, 'RejectionReasonChange');

  it('deactivating an absent or already inactive code is a no-op with no change or audit row (AEC-08)', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'DataMismatch' });
    await rejectionReason(db, { code: 'Fraud', active: false });
    const { ver } = setup();
    expect(await ver.setRejectionReasonActive({ adminId: id('admin'), code: 'Nope', active: false })).toEqual({ code: 'Nope', active: false, changed: false });
    expect(await ver.setRejectionReasonActive({ adminId: id('admin'), code: 'Fraud', active: false })).toEqual({ code: 'Fraud', active: false, changed: false });
    expect(await db.counts(['RejectionReasonChange', 'audit_events'])).toEqual({ RejectionReasonChange: 0, audit_events: 0 });
  });

  it('the only active reason is LastActiveReasonRequired citing AD-VER-1', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'DataMismatch' });
    await rejectionReason(db, { code: 'Fraud', active: false });
    const error = await caught(() => setup().ver.setRejectionReasonActive({ adminId: id('admin'), code: 'DataMismatch', active: false }));
    explainAssert(error, { code: 'LastActiveReasonRequired', rule: 'AD-VER-1', inputs: { code: 'DataMismatch' } });
    expect(await rows(db, 'RejectionReason', `code = 'DataMismatch'`)).toMatchObject([{ active: true }]);
  });

  it('activating an unknown code is RejectionReasonUnknown', async () => {
    await admin(db);
    const error = await caught(() => setup().ver.setRejectionReasonActive({ adminId: id('admin'), code: 'Nope', active: true }));
    explainAssert(error, { code: 'RejectionReasonUnknown', rule: 'FR-VER-8', inputs: { reasonCode: 'Nope' } });
  });

  it('activating an inactive reason writes one change row and one audit row; again is a no-op', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'Fraud', barred: true, active: false });
    const { ver } = setup();
    expect(await ver.setRejectionReasonActive({ adminId: id('admin'), code: 'Fraud', active: true })).toEqual({ code: 'Fraud', active: true, changed: true });
    expect(await ver.setRejectionReasonActive({ adminId: id('admin'), code: 'Fraud', active: true })).toEqual({ code: 'Fraud', active: true, changed: false });
    expect(await changes()).toMatchObject([{ code: 'Fraud', adminId: id('admin'), before: { active: false }, after: { active: true } }]);
    expect(await rows(db, 'audit_events', `action = 'verification.rejectionReason.changed'`)).toMatchObject([{ aggregateId: 'Fraud' }]);
  });
});

describe('VerServiceV2.upsertRejectionReason (S-FR-VER-8.upsert)', () => {
  const policyOf = (cooldownDays: number) => ({ barred: false as const, cooldownDays });

  it('a new code is created active with a change row whose before is null', async () => {
    await admin(db);
    const { ver } = setup();
    const result = await ver.upsertRejectionReason({ adminId: id('admin'), code: 'BlurryDocs', textEsCo: 'Los documentos no se leen bien.', policy: policyOf(3) });
    expect(result).toEqual({ code: 'BlurryDocs', changed: true });
    expect(await rows(db, 'RejectionReason')).toMatchObject([{ code: 'BlurryDocs', cooldownDays: 3, barred: false, active: true }]);
    expect(await rows(db, 'RejectionReasonChange')).toMatchObject([{ before: null, after: { code: 'BlurryDocs', active: true } }]);
  });

  it('the same text and policy is a no-op; a barred policy clears the cooldown and keeps active', async () => {
    await admin(db);
    await rejectionReason(db, { code: 'DataMismatch', cooldownDays: 7, active: false });
    const { ver } = setup();
    const textEsCo = 'Motivo de rechazo DataMismatch.';
    expect(await ver.upsertRejectionReason({ adminId: id('admin'), code: 'DataMismatch', textEsCo, policy: policyOf(7) })).toEqual({ code: 'DataMismatch', changed: false });
    expect(await ver.upsertRejectionReason({ adminId: id('admin'), code: 'DataMismatch', textEsCo, policy: { barred: true } })).toEqual({ code: 'DataMismatch', changed: true });
    expect(await rows(db, 'RejectionReason')).toMatchObject([{ barred: true, cooldownDays: null, active: false }]);
    expect(await rows(db, 'RejectionReasonChange')).toMatchObject([{ before: { barred: false, cooldownDays: 7 }, after: { barred: true, cooldownDays: null, active: false } }]);
  });

  it('a bad code, a short text and a cooldown over 365 are refused field by field before any read', async () => {
    const error = await caught(() => setup().ver.upsertRejectionReason({ adminId: id('nobody'), code: 'bad', textEsCo: 'corto', policy: policyOf(400) })) as { code: string; citations: { inputs: { field: string } }[] };
    expect(error.code).toBe('RequestValidationFailed');
    expect(error.citations.map((c) => c.inputs.field)).toEqual(['code', 'textEsCo', 'policy.cooldownDays']);
  });

  it('a non-admin is AdminOnly and nothing is written', async () => {
    await user(db, { id: id('andres') });
    const error = await caught(() => setup().ver.upsertRejectionReason({ adminId: id('andres'), code: 'BlurryDocs', textEsCo: 'Los documentos no se leen bien.', policy: policyOf(3) }));
    expect(codeOf(error)).toBe('AdminOnly');
    expect(await db.counts(['RejectionReason', 'RejectionReasonChange'])).toEqual({ RejectionReason: 0, RejectionReasonChange: 0 });
  });
});

describe('VerServiceV2.listReviewQueue (S-FR-VER-2) — paging', () => {
  it('pages 25 at a time by ("submittedAt", id), ties broken by id, and the last page has no cursor', async () => {
    await admin(db);
    const ids = Array.from({ length: 26 }, (_, i) => id(`b${i}`));
    const expected: string[] = [];
    for (const businessId of ids) expected.push(await business(db, businessId, 'Pending', { submittedAt: at(-DAY) }));
    expected.sort();
    const { ver } = setup();
    const first = await ver.listReviewQueue({ adminId: id('admin'), cursor: null });
    expect(first.items.map((r) => r.applicationId)).toEqual(expected.slice(0, 25));
    expect(first.nextCursor).not.toBeNull();
    const second = await ver.listReviewQueue({ adminId: id('admin'), cursor: first.nextCursor });
    expect(second).toEqual({ items: [expect.objectContaining({ applicationId: expected[25] })], nextCursor: null });
  });

  it('a cursor it never issued is RequestValidationFailed on the cursor field', async () => {
    await admin(db);
    const error = await caught(() => setup().ver.listReviewQueue({ adminId: id('admin'), cursor: 'bm9wZQ' })) as { code: string; citations: { inputs: { field: string } }[] };
    expect(error.code).toBe('RequestValidationFailed');
    expect(error.citations.map((c) => c.inputs.field)).toEqual(['cursor']);
  });
});
