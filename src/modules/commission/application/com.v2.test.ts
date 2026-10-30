// COM against Postgres with the real identity: the edges the ATDD tests leave out.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs } from '../../../../test-support/errors.js';
import { codeOf } from '../../../../test-support/concurrency.js';
import { admin, at, business, commissionAccount, DAY, HOUR, id, ins, rows, topUp, wiring } from '../../../../test-support/solu2/fixtures.js';
import { IdnServiceV2, VerServiceV2 } from '../../identity/index.js';
import type { RequestTopUpRequest } from '../dto/com.v2.dto.js';
import { ComServiceV2 } from './com.v2.js';

const db = useTestDatabase();

/** COM composed as the composition root binds it: the real identity. */
function commission() {
  const w = wiring(db);
  const idn = new IdnServiceV2(w);
  const ver = new VerServiceV2(w);
  return { w, com: new ComServiceV2({ ...w, identity: { getCapabilities: (i) => idn.getCapabilities(i), getBusinessName: (i) => ver.getBusinessName(i) } }) };
}
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 1, 0xff, 0xd9]);
const request = (o: Partial<RequestTopUpRequest> = {}): RequestTopUpRequest => ({ businessId: id('andres'), amountCop: 50_000, transferReference: 'REF-1', uploadKey: `topup-proof/${id('andres')}/p1`, ...o });
async function shop(balance = 0): Promise<void> {
  await business(db, id('andres'), 'Approved');
  await commissionAccount(db, id('andres'), balance);
}

describe('openCommissionAccount (S-FR-COM-1)', () => {
  it('stores the approval instant as openedAt and writes one system audit row', async () => {
    await business(db, id('andres'), 'Approved');
    await db.transactions.run((tx) => commission().com.openCommissionAccount(tx, { businessId: id('andres'), approvedAt: at(-DAY) }));
    expect(await rows(db, 'CommissionAccount')).toMatchObject([{ openedAt: new Date(at(-DAY)) }]);
    expect(await rows(db, 'audit_events', `action = 'commission.account.opened'`)).toMatchObject([{ actorKind: 'system', aggregateId: id('andres') }]);
  });
});

describe('requestTopUp and its proof (S-FR-COM-2, AD-SYS-8)', () => {
  it('a ticket is under the business\'s prefix, and a pending business with no account is CommissionAccountNotOpen', async () => {
    await shop();
    const { com } = commission();
    expect((await com.createTopUpProofUpload({ businessId: id('andres') })).uploadKey).toMatch(new RegExp(`^topup-proof/${id('andres')}/[a-z0-9]+$`));
    await business(db, id('pending'), 'Pending');
    const error = await caught(() => com.createTopUpProofUpload({ businessId: id('pending') }));
    expect([codeOf(error), citedInputs(error)]).toEqual(['CommissionAccountNotOpen', { accountOpened: false }]);
  });

  it('a key outside the business\'s prefix, or with extra segments, is TopUpProofInvalidFile and is never read', async () => {
    await shop();
    const { w, com } = commission();
    w.storage.simulateDirectUpload(`topup-proof/${id('other')}/p1`, JPEG, 'image/jpeg');
    for (const uploadKey of [`topup-proof/${id('other')}/p1`, `topup-proof/${id('andres')}/`, `topup-proof/${id('andres')}/a/b`]) {
      const error = await caught(() => com.requestTopUp(request({ uploadKey })));
      expect([codeOf(error), citedInputs(error)]).toEqual(['TopUpProofInvalidFile', { cause: 'missing' }]);
    }
    expect(await rows(db, 'TopUpRequest')).toHaveLength(0);
  });

  it('wrong magic bytes are refused with cause magic, and nothing is promoted', async () => {
    await shop();
    const { w, com } = commission();
    w.storage.simulateDirectUpload(`topup-proof/${id('andres')}/p1`, new Uint8Array([1, 2, 3, 4]), 'image/jpeg');
    const error = await caught(() => com.requestTopUp(request()));
    expect(citedInputs(error)).toEqual({ cause: 'magic' });
    expect(await rows(db, 'TopUpRequest')).toHaveLength(0);
  });

  it('an accepted proof is promoted to topup-proofs, the quarantine copy is deleted, and the audit names the request', async () => {
    await shop();
    const { w, com } = commission();
    w.storage.simulateDirectUpload(`topup-proof/${id('andres')}/p1`, JPEG, 'image/jpeg');
    const { topUpRequestId } = await com.requestTopUp(request());
    const [row] = await rows<{ proofObjectKey: string }>(db, 'TopUpRequest');
    expect(row!.proofObjectKey).toMatch(/^topup-proofs\//);
    expect(await w.storage.get('upload-quarantine', `topup-proof/${id('andres')}/p1`)).toBeNull();
    expect(await rows(db, 'audit_events', `action = 'commission.topUp.requested'`)).toMatchObject([{ aggregateId: topUpRequestId, decisionCode: 'TopUpRequested' }]);
  });

  it('an admin reads any proof URL; the owner reads its own; the URL lives 600 s', async () => {
    await shop();
    await admin(db);
    await topUp(db, { id: id('t1'), businessId: id('andres'), amountCop: 50_000 });
    const { w, com } = commission();
    const owner = await com.getTopUpProofUrl({ topUpRequestId: id('t1'), actorId: id('andres') });
    expect(owner.expiresAt).toBe(new Date(w.clock.now().getTime() + 600_000).toISOString());
    expect((await com.getTopUpProofUrl({ topUpRequestId: id('t1'), actorId: id('admin') })).url).toBe(owner.url);
  });
});

describe('listMyTopUps and getMyCommissionAccount (S-FR-COM-2.mine, S-FR-COM-9)', () => {
  it('pages 25 at a time, newest first, and a foreign cursor is refused', async () => {
    await shop();
    for (let i = 0; i < 27; i++) {
      await ins(db, 'TopUpRequest', { id: id(`t${String(i).padStart(2, '0')}`), businessId: id('andres'), amountCop: 20_000, transferReference: 'REF-1234', proofObjectKey: 'topup-proofs/x', status: 'Pending', submittedAt: at(-HOUR + i * 1000) });
    }
    const { com } = commission();
    const first = await com.listMyTopUps({ businessId: id('andres'), cursor: null });
    expect(first.rows).toHaveLength(25);
    expect(first.rows[0]!.topUpRequestId).toBe(id('t26'));
    const second = await com.listMyTopUps({ businessId: id('andres'), cursor: first.nextCursor });
    expect(second.rows.map((r) => r.topUpRequestId)).toEqual([id('t01'), id('t00')]);
    expect(second.nextCursor).toBeNull();
    expect(codeOf(await caught(() => com.listMyTopUps({ businessId: id('andres'), cursor: 'bm9wZQ' })))).toBe('RequestValidationFailed');
  });

  it('a negative balance names what is needed to resume; no account reads as a notice, not an error', async () => {
    await shop(-4_000);
    await business(db, id('pending'), 'Pending');
    const { com } = commission();
    expect(await com.getMyCommissionAccount({ businessId: id('andres') })).toMatchObject({
      account: { balanceCop: -4_000, state: 'Exhausted', lowBalance: false, neededToResumeCop: 4_001 },
      decision: { outcome: 'allowedWithNotice', reasonCode: 'CommissionBalanceNeedsTopUp' },
    });
    expect(await com.getMyCommissionAccount({ businessId: id('pending') })).toMatchObject({
      account: null, ledger: [], decision: { outcome: 'allowedWithNotice', reasonCode: 'CommissionAccountNotYetOpen' },
    });
  });
});
