// Solu-1 ATDD — VER contracts (contracts.md §2). RED until implemented.
import { beforeEach, describe, expect, it } from 'vitest';
import { createVerModule } from '../../../../src/modules/identity/index.js';
import { DAY } from '../../../../test-support/clock.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { id } from '../../../../test-support/ids.js';
import * as seed from '../../../../test-support/seed.js';
import { wiring, type Wiring } from '../../../../test-support/wiring.js';

const db = useTestDatabase();
let w: Wiring;
beforeEach(() => {
  w = wiring(db);
});
const sebastian = id('sebastian');

describe('Solu-1 ATDD: VER — assertCanSubmitApplication (guard, FR-VER-1, FR-VER-6)', () => {
  const check = (businessId: string) => db.transactions.run((tx) => createVerModule(w).assertCanSubmitApplication(tx, { businessId }));

  it('RED: a business with no application on file may submit', async () => {
    const andres = await seed.user(db, { id: id('andres'), sellerTrack: 'business' });
    await expect(check(andres)).resolves.toBeUndefined();
  });

  it('RED: a Pending application blocks a second submission with ApplicationAlreadyPending (409), read-only', async () => {
    const andres = await seed.business(db, 'andres', 'Pending');
    const before = await db.counts(['BusinessApplication']);
    const error = await caught(() => check(andres));
    expect(codeOf(error)).toBe('ApplicationAlreadyPending');
    expect(httpOf(error)).toBe(409);
    expect(await db.counts(['BusinessApplication'])).toEqual(before);
  });

  it('RED: the cooldown is half-open — refused 1 s before reapplyNotBefore, allowed at the instant', async () => {
    const andres = await seed.business(db, 'andres', 'Rejected'); // reapplyNotBefore = seed + 7 days
    w.clock.advance(7 * DAY - 1000);
    const error = await caught(() => check(andres));
    expect(codeOf(error)).toBe('ReapplicationCooldownActive');
    expect(citedInputs(error)).toEqual({ reapplyNotBefore: '2026-10-08T15:00:00.000Z' });
    w.clock.advance(1000);
    await expect(check(andres)).resolves.toBeUndefined();
  });

  it('RED: a barred rejection refuses with ReapplicationBarred (409) citing the reason code', async () => {
    const andres = await seed.user(db, { id: id('andres'), sellerTrack: 'business' });
    await seed.rejectionReason(db, { code: 'FraudSuspected', barred: true });
    await seed.businessApplication(db, { id: id('appandres'), businessId: andres, status: 'Rejected', rejectionReasonCode: 'FraudSuspected', reapplyBarred: true });
    const error = await caught(() => check(andres));
    expect(codeOf(error)).toBe('ReapplicationBarred');
    expect(citedInputs(error)).toEqual({ rejectionReasonCode: 'FraudSuspected' });
  });

  it('RED: an Approved business gets AlreadyVerifiedBusiness (409)', async () => {
    const andres = await seed.business(db, 'andres', 'Approved');
    expect(codeOf(await caught(() => check(andres)))).toBe('AlreadyVerifiedBusiness');
  });
});

describe('Solu-1 ATDD: VER — decideApplication (contended mutation, AD-VER-1)', () => {
  it('RED: approving a Pending application decides it once, logs it, and enqueues one Approved event for commission and listings', async () => {
    const andres = await seed.business(db, 'andres', 'Pending');
    const result = await createVerModule(w).decideApplication({ applicationId: id('appandres'), decision: { kind: 'approve' }, adminId: sebastian });
    expect(result).toEqual({ applicationId: id('appandres'), status: 'Approved', decidedAt: w.clock.iso(), decidedBy: sebastian });
    expect(await db.query(`SELECT status, "decidedBy" FROM "BusinessApplication" WHERE id = $1`, [id('appandres')])).toEqual([{ status: 'Approved', decidedBy: sebastian }]);
    expect(await db.counts(['ApplicationDecisionLog'])).toEqual({ ApplicationDecisionLog: 1 });
    const events = await db.query<{ type: string; payload: Record<string, unknown> }>(`SELECT type, payload FROM "OutboxEvent"`);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'BusinessApplicationApproved', payload: { applicationId: id('appandres'), businessId: andres, approvedBy: sebastian } });
  });

  it("RED: rejecting snapshots the reason's 7-day cooldown and enqueues one Rejected event for listings", async () => {
    await seed.business(db, 'andres', 'Pending');
    await seed.rejectionReason(db, { code: 'DataMismatch', cooldownDays: 7 });
    await createVerModule(w).decideApplication({ applicationId: id('appandres'), decision: { kind: 'reject', reasonCode: 'DataMismatch' }, adminId: sebastian });
    expect(await db.query(`SELECT status, "rejectionReasonCode", "reapplyNotBefore" FROM "BusinessApplication" WHERE id = $1`, [id('appandres')])).toEqual([
      { status: 'Rejected', rejectionReasonCode: 'DataMismatch', reapplyNotBefore: new Date('2026-10-08T15:00:00.000Z') },
    ]);
    expect(await db.query(`SELECT type, payload->>'reasonCode' AS "reasonCode" FROM "OutboxEvent"`)).toEqual([{ type: 'BusinessApplicationRejected', reasonCode: 'DataMismatch' }]);
  });

  it('RED: an unknown application gets ApplicationNotFound (404) before the reason is checked, with zero writes', async () => {
    const before = await db.counts(['BusinessApplication', 'ApplicationDecisionLog', 'OutboxEvent']);
    const error = await caught(() =>
      createVerModule(w).decideApplication({ applicationId: id('ghost'), decision: { kind: 'reject', reasonCode: 'Inactive' }, adminId: sebastian }),
    );
    expect(codeOf(error)).toBe('ApplicationNotFound');
    expect(httpOf(error)).toBe(404);
    expect(await db.counts(['BusinessApplication', 'ApplicationDecisionLog', 'OutboxEvent'])).toEqual(before);
  });

  it('RED: an inactive reason gets RejectionReasonUnknown (409) and the application stays Pending', async () => {
    await seed.business(db, 'andres', 'Pending');
    await seed.rejectionReason(db, { code: 'OldReason', active: false });
    const error = await caught(() =>
      createVerModule(w).decideApplication({ applicationId: id('appandres'), decision: { kind: 'reject', reasonCode: 'OldReason' }, adminId: sebastian }),
    );
    expect(codeOf(error)).toBe('RejectionReasonUnknown');
    expect(await db.query(`SELECT status FROM "BusinessApplication" WHERE id = $1`, [id('appandres')])).toEqual([{ status: 'Pending' }]);
  });

  it('RED (mandatory edge case NFR-VER-1): approve and reject at once — one terminal transition, one log, one event of the winner', async () => {
    await seed.business(db, 'andres', 'Pending');
    await seed.rejectionReason(db, { code: 'DataMismatch' });
    const ver = createVerModule(w);
    const outcome = await race(2, (n) =>
      ver.decideApplication({
        applicationId: id('appandres'),
        decision: n === 0 ? { kind: 'approve' } : { kind: 'reject', reasonCode: 'DataMismatch' },
        adminId: id(n === 0 ? 'sebastian' : 'laura'),
      }),
    );
    expect(outcome.rejected.map(codeOf)).toEqual(['ApplicationNotPending']);
    expect(outcome.fulfilled).toHaveLength(1);
    const winner = outcome.fulfilled[0]!.status;
    expect(await db.counts(['ApplicationDecisionLog', 'OutboxEvent'])).toEqual({ ApplicationDecisionLog: 1, OutboxEvent: 1 });
    expect(await db.query(`SELECT type FROM "OutboxEvent"`)).toEqual([{ type: winner === 'Approved' ? 'BusinessApplicationApproved' : 'BusinessApplicationRejected' }]);
  });
});

describe('Solu-1 ATDD: VER — getBusinessPaymentInstructions (resolver, FR-VER-9)', () => {
  it('RED: an Approved business returns its instructions', async () => {
    const andres = await seed.business(db, 'andres', 'Approved');
    expect(await createVerModule(w).getBusinessPaymentInstructions({ businessId: andres })).toEqual({
      bankName: 'Bancolombia',
      accountType: 'savings',
      accountNumber: '12345678901',
      holderName: 'Andrés Restrepo',
      qrObjectKey: null,
    });
  });

  it('RED: a Pending business resolves silently to null', async () => {
    const andres = await seed.business(db, 'andres', 'Pending');
    expect(await createVerModule(w).getBusinessPaymentInstructions({ businessId: andres })).toBeNull();
  });
});
