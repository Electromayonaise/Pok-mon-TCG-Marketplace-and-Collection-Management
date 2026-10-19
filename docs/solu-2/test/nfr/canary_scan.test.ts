// NFR benchmark — the canary scan (AD-SYS-8 rule 4; ARCHITECTURE risk S-4; NFR-SYS-8 for the
// legal-identity reads). Unique canaries are planted in every regulated column of the §3 seed;
// every row of those tables then flows through the three egress points the redactor guards —
// the logger, the error formatter's citations and the outbox payload path — and the captured
// text is scanned. Expected count: 0. RED until the redactor and the logger are implemented.
import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../../src/shared-kernel/errors.js';
import { createLogger, redact } from '../../../../src/shared-kernel/regulated.js';
import { toErrorBody } from '../../../../src/server/trpc/errors.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { conversation, id, ins, T0 } from '../../../../test-support/solu2/fixtures.js';
import { buyerId, businessId, seedMarketplace } from '../../../../test-support/solu2/seed-marketplace.js';

const db = useTestDatabase();

describe('AD-SYS-8 rule 4 — canary scan (S-4)', () => {
  it('[NFR-SYS-8.canary] canaries in phones, legal identities, document and comprobante keys and message bodies never reach logs, error bodies or payloads', async () => {
    await seedMarketplace(db);
    // Plant the canaries. Phones and NITs must pass their CHECKs, so the canary is the distinctive number itself.
    await db.query(`UPDATE "IndividualSellerProfile" p SET "contactPhoneE164" = '+5730099' || lpad(r.n::text, 5, '0')
                    FROM (SELECT "userId", row_number() OVER (ORDER BY "userId") AS n FROM "IndividualSellerProfile") r WHERE r."userId" = p."userId"`);
    for (let b = 0; b < 8; b++) {
      await ins(db, 'BusinessApplicationLegalIdentity', { applicationId: id(`app${b}`), type: 'NIT', number: `99900${String(b).padStart(4, '0')}`, documentKeys: [`ver-documents/CANARYDOC${b}`] }, 'created');
    }
    await db.query(`UPDATE "Order" SET "comprobanteObjectKey" = 'order-comprobantes/CANARYKEY' || id WHERE "comprobanteObjectKey" IS NOT NULL`);
    await conversation(db, { id: id('conv1'), buyerId: buyerId(10), businessId: businessId(0), lastSeq: 3 });
    for (let s = 1; s <= 3; s++) await ins(db, 'Message', { id: id(`msg${s}`), conversationId: id('conv1'), seq: s, senderId: buyerId(10), body: `CANARYMSG${s} hola, ¿sigue disponible?`, clientMessageId: `c${s}`, recipientVerificationAtSend: 'Approved', createdAt: T0 }, 'none');

    const regulated = [
      ...(await db.query(`SELECT "userId", "contactPhoneE164" FROM "IndividualSellerProfile"`)),
      ...(await db.query(`SELECT "applicationId", number, "documentKeys" FROM "BusinessApplicationLegalIdentity"`)).map((r) => ({ applicationId: r.applicationId, legalIdentity: { number: r.number }, documentKeys: r.documentKeys })),
      ...(await db.query(`SELECT id AS "orderId", "comprobanteObjectKey" AS "comprobanteKey" FROM "Order" WHERE "comprobanteObjectKey" IS NOT NULL`)),
      ...(await db.query(`SELECT id AS "messageId", body FROM "Message"`)),
    ];
    const canaries = /\+5730099\d{5}|99900\d{4}|CANARY(DOC|KEY|MSG)/g;
    // The plant itself is visible (the scan would otherwise prove nothing).
    expect(JSON.stringify(regulated).match(canaries)?.length ?? 0).toBeGreaterThan(200);

    const captured: string[] = [];
    const log = createLogger((line) => captured.push(line));
    for (const row of regulated) {
      log.info('probe.row', row as Record<string, unknown>);
      captured.push(JSON.stringify(toErrorBody(new DomainError('ListingNotFound', [{ rule: 'AD-SYS-8 rule 4', inputs: Object.fromEntries(Object.entries(row as Record<string, unknown>).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])) }]), new Date(T0))));
      captured.push(JSON.stringify(redact(row)));
    }
    expect(captured.join('\n').match(canaries) ?? []).toEqual([]);
    expect(captured.join('\n')).toContain(id('ord0'));
  }, 300_000);
});
