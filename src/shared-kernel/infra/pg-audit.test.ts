// PgAuditLog against a real database. sys › [SYS-R2] proves commit, rollback and the grants;
// these prove the redactor over `data`, one id per row, and a refusal inside the writer's tx.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../test-support/db.js';
import { id, rows, T0, wiring } from '../../../test-support/solu2/fixtures.js';
import type { AuditEntry } from '../audit.js';
import { REDACTED } from '../regulated.js';
import { PgAuditLog } from './pg-audit.js';

const db = useTestDatabase();
const entry: AuditEntry = { actorId: null, actorKind: 'system', module: 'shared-kernel', action: 'shared-kernel.probe.recorded', aggregateType: 'Probe', aggregateId: id('probe'), decisionCode: null, data: { n: 1 } };

describe('PgAuditLog.record', () => {
  it('stores `data` through the redactor', async () => {
    const w = wiring(db);
    await w.transactions.run((tx) => new PgAuditLog(w.ids, w.clock).record(tx, { ...entry, data: { phone: '+573009912345', listingId: 'lst1', n: 2 } }));
    expect(await rows(db, 'audit_events')).toMatchObject([{ data: { phone: REDACTED, listingId: 'lst1', n: 2 }, createdAt: new Date(T0) }]);
  });

  it('gives each row its own id from the IdGenerator, and returns it', async () => {
    const w = wiring(db);
    const audit = new PgAuditLog(w.ids, w.clock);
    const ids = await w.transactions.run(async (tx) => [await audit.record(tx, entry), await audit.record(tx, entry)]);
    const stored = await rows<{ id: string }>(db, 'audit_events');
    expect(new Set(ids.map((r) => r.auditEventId)).size).toBe(2);
    expect(stored.map((r) => r.id).sort()).toEqual(ids.map((r) => r.auditEventId).sort());
  });

  it('a row the schema refuses rejects inside the writer transaction, which then commits nothing', async () => {
    const w = wiring(db);
    const audit = new PgAuditLog(w.ids, w.clock);
    const refused = w.transactions.run(async (tx) => {
      await audit.record(tx, entry);
      await audit.record(tx, { ...entry, action: 'orders.fact.buyerPaid' }); // module is shared-kernel
    });
    await expect(refused).rejects.toMatchObject({ code: '23514' });
    expect(await rows(db, 'audit_events')).toEqual([]);
  });
});
