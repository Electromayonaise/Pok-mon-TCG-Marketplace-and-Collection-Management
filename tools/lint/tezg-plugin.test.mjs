// Proves each `tezg/*` rule fails on its planted violation (Story 1.4), so `npm run lint` passing
// on src/ is never vacuous. The plants are the ones the fitness probes and ATDD tests use:
// [SYS-1.R2] (a foreign raiser), [SYS-AD8.probe] (a listings write to "CommissionAccount"),
// AD-SYS-8 rule 3 (an admin path selecting "Message".body), AD-VER-2 rule 1 (the legal-identity
// table named outside its repository, Story 3.4). Run with `npm run test:lint-rules`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import plugin, { CODE_OWNERS, LEGAL_IDENTITY_FILE, REGULATED_COLUMNS, REPO_ROOT, TABLE_OWNERS } from './tezg-plugin.mjs';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { parser: tseslint.parser, ecmaVersion: 2023, sourceType: 'module' } });
const at = (file) => path.join(REPO_ROOT, file);

tester.run('tezg/error-owner', plugin.rules['error-owner'], {
  valid: [
    { filename: at('src/modules/identity/application/gate.ts'), code: "const raise = raiserFor('identity'); raise('AdminOnly', [c]);" },
    { filename: at('src/shared-kernel/dispatcher.ts'), code: "const raise = raiserFor('shared-kernel'); raise('EventDeliveryNotReplayable', [c]);" },
    { filename: at('src/shared-kernel/raise.ts'), code: 'throw new DomainError(code, citations);' },
    // A computed code is left to raiserFor's runtime guard.
    { filename: at('src/modules/identity/application/idn.v2.ts'), code: "const raise = raiserFor('identity'); raise(code, [c]);" },
    { filename: at('src/modules/identity/application/gate.ts'), code: "raiserFor('identity')('AdminOnly', [c]);" },
    { filename: at('src/modules/identity/application/gate.ts'), code: 'const raise = raiserFor(`identity`); raise(`AdminOnly`, [c]);' },
  ],
  invalid: [
    // [SYS-1.R2]: the owner's raiser, curried, raising a code another module owns.
    { filename: at('src/modules/reviews/application/rep.ts'), code: "raiserFor('reviews')('AdminOnly', [c]);", errors: [{ messageId: 'foreignCode', data: { name: 'AdminOnly', module: 'reviews', owner: 'identity' } }] },
    { filename: at('src/modules/reviews/application/rep.ts'), code: "function f() { fail('AdminOnly', [c]); } const fail = raiserFor('reviews');", errors: [{ messageId: 'foreignCode', data: { name: 'AdminOnly', module: 'reviews', owner: 'identity' } }] },
    { filename: at('src/modules/reviews/application/rep.ts'), code: "const raise = raiserFor('reviews'); raise(`AdminOnly`, [c]);", errors: [{ messageId: 'foreignCode', data: { name: 'AdminOnly', module: 'reviews', owner: 'identity' } }] },
    { filename: at('src/modules/reviews/application/rep.ts'), code: "const raise = raiserFor('identity');", errors: [{ messageId: 'foreignRaiser', data: { name: 'identity', module: 'reviews' } }] },
    { filename: at('src/modules/reviews/application/rep.ts'), code: "const raise = raiserFor('reviews'); raise('AdminOnly', [c]);", errors: [{ messageId: 'foreignCode', data: { name: 'AdminOnly', module: 'reviews', owner: 'identity' } }] },
    { filename: at('src/server/composition.ts'), code: "raiserFor('identity');", errors: [{ messageId: 'raiserOutsideModule' }] },
    { filename: at('src/modules/listings/application/inv.ts'), code: "throw new DomainError('ListingNotFound', [c]);", errors: [{ messageId: 'directConstruction' }] },
  ],
});

tester.run('tezg/table-owner', plugin.rules['table-owner'], {
  valid: [
    { filename: at('src/modules/identity/infra/pg.ts'), code: 'q(`UPDATE "User" SET "sellerTrack" = $2 WHERE id = $1`);' },
    { filename: at('src/shared-kernel/dispatcher.ts'), code: 'q(`SELECT 1 FROM "EventDelivery" WHERE status = \'pending\' FOR UPDATE SKIP LOCKED`);' },
    { filename: at('src/shared-kernel/audit.ts'), code: "q('INSERT INTO audit_events (id) VALUES ($1)');" },
    // An upsert's DO UPDATE and a FOR NO KEY UPDATE lock write no other table; prose is not SQL.
    { filename: at('src/modules/identity/infra/pg.ts'), code: 'q(`INSERT INTO "User" (id) VALUES ($1) ON CONFLICT (id) DO UPDATE SET "sellerTrack" = $2`);' },
    { filename: at('src/shared-kernel/dispatcher.ts'), code: 'q(`SELECT 1 FROM "EventDelivery" WHERE "eventId" = $1 FOR NO KEY UPDATE`);' },
    { filename: at('src/modules/orders/application/ord.ts'), code: "const why = 'could not update the listing';" },
  ],
  invalid: [
    { filename: at('src/modules/listings/infra/pg.ts'), code: 'q(`UPDATE "CommissionAccount" SET balance = 0`);', errors: [{ messageId: 'foreignWrite', data: { name: 'CommissionAccount', module: 'listings', owner: 'commission' } }] },
    { filename: at('src/modules/orders/infra/pg.ts'), code: "q('DELETE FROM \"Listing\" WHERE id = $1');", errors: [{ messageId: 'foreignWrite', data: { name: 'Listing', module: 'orders', owner: 'listings' } }] },
    { filename: at('src/modules/orders/infra/pg.ts'), code: 'q(`INSERT INTO "Nowhere" (id) VALUES (${id})`);', errors: [{ messageId: 'unknownTable', data: { name: 'Nowhere', module: 'orders' } }] },
  ],
});

tester.run('tezg/regulated-select', plugin.rules['regulated-select'], {
  valid: [
    { filename: at('src/modules/identity/infra/pg.ts'), code: 'q(`SELECT "contactPhoneE164" FROM "IndividualSellerProfile" WHERE "userId" = $1`);' },
    { filename: at('src/modules/messaging/infra/pg.ts'), code: 'q(`SELECT m.body FROM "Message" m WHERE m."conversationId" = $1`);' },
    // The capability read: an existence check and a star over a table with no regulated column.
    {
      filename: at('src/modules/identity/infra/pg.ts'),
      code: 'q(`SELECT EXISTS (SELECT 1 FROM "IndividualSellerProfile" p WHERE p."userId" = u.id) FROM "User" u LEFT JOIN LATERAL (SELECT * FROM "BusinessApplication" b WHERE b."businessId" = u.id) a ON true`);',
    },
    { filename: at('src/shared-kernel/admin-events.ts'), code: 'q(`SELECT seq, "senderId" FROM "Message" WHERE "conversationId" = $1`);' },
  ],
  invalid: [
    { filename: at('src/shared-kernel/admin-events.ts'), code: 'q(`SELECT body FROM "Message"`);', errors: [{ messageId: 'regulatedColumn', data: { name: 'Message.body', owner: 'messaging' } }] },
    { filename: at('src/modules/identity/application/ver.v2.ts'), code: 'q(`SELECT s.token FROM "Session" s`);', errors: [{ messageId: 'regulatedColumn', data: { name: 'Session.token', owner: 'identity' } }] },
    { filename: at('src/modules/listings/infra/pg.ts'), code: 'q(`SELECT "contactPhoneE164" FROM "IndividualSellerProfile"`);', errors: [{ messageId: 'regulatedColumn', data: { name: 'IndividualSellerProfile.contactPhoneE164', owner: 'identity' } }] },
    { filename: at('src/modules/identity/application/ver.v2.ts'), code: "q('SELECT type FROM \"BusinessApplicationLegalIdentity\" WHERE \"applicationId\" = $1');", errors: [{ messageId: 'regulatedColumn', data: { name: 'BusinessApplicationLegalIdentity', owner: 'identity' } }] },
    { filename: at('src/modules/identity/infra/pg.ts'), code: 'q(`SELECT * FROM "IndividualSellerProfile" WHERE "userId" = $1`);', errors: [{ messageId: 'regulatedStar', data: { name: 'IndividualSellerProfile' } }] },
    { filename: at('src/modules/identity/application/ver.v2.ts'), code: 'q(`SELECT "proofObjectKey" FROM "TopUpRequest"`);', errors: [{ messageId: 'regulatedColumn', data: { name: 'TopUpRequest.proofObjectKey', owner: 'commission' } }] },
    { filename: at('src/modules/messaging/infra/pg.ts'), code: 'q(`SELECT c.id, m.* FROM "Conversation" c JOIN "Message" m ON m."conversationId" = c.id`);', errors: [{ messageId: 'regulatedStar', data: { name: 'Message' } }] },
    { filename: at('src/shared-kernel/admin-events.ts'), code: 'q(`SELECT m.body FROM "Conversation" c, "Message" m WHERE m."conversationId" = c.id`);', errors: [{ messageId: 'regulatedColumn', data: { name: 'Message.body', owner: 'messaging' } }] },
    { filename: at('src/modules/identity/infra/pg.ts'), code: 'q(`SELECT "userId", * FROM "IndividualSellerProfile"`);', errors: [{ messageId: 'regulatedStar', data: { name: 'IndividualSellerProfile' } }] },
  ],
});

tester.run('tezg/legal-identity-confined', plugin.rules['legal-identity-confined'], {
  valid: [
    { filename: at(LEGAL_IDENTITY_FILE), code: 'q(`SELECT l.type FROM "BusinessApplicationLegalIdentity" l WHERE l."applicationId" = $1`);' },
    // The access log only shares a prefix; prose about the legal identity names no table.
    { filename: at('src/modules/identity/infra/pg.ts'), code: 'q(`INSERT INTO "LegalIdentityAccessLog" (id) VALUES ($1)`);' },
    { filename: at('src/modules/identity/application/ver.v2.ts'), code: "const why = 'legal identity read';" },
  ],
  invalid: [
    // Story 3.4 AC: the table named in infra/pg.ts, which regulated-select allows in identity's infra/.
    { filename: at('src/modules/identity/infra/pg.ts'), code: 'q("BusinessApplicationLegalIdentity");', errors: [{ messageId: 'confined', data: { file: LEGAL_IDENTITY_FILE } }] },
    // The Story 1.4 deferred gap: a RETURNING that regulated-select does not read.
    { filename: at('src/modules/identity/infra/pg.ts'), code: 'q(`INSERT INTO "BusinessApplicationLegalIdentity" ("applicationId") VALUES ($1) RETURNING number`);', errors: [{ messageId: 'confined' }] },
    { filename: at('src/modules/orders/application/ord.ts'), code: 'q(`SELECT 1 FROM "BusinessApplicationLegalIdentity" WHERE "applicationId" = ${id}`);', errors: [{ messageId: 'confined' }] },
  ],
});

describe('the rules read their sources of truth', () => {
  it('every DOMAIN_ERRORS code is parsed with its owner', () => {
    assert.equal(CODE_OWNERS.get('AdminOnly'), 'identity');
    assert.equal(CODE_OWNERS.get('RequestValidationFailed'), 'shared-kernel');
    assert.equal(CODE_OWNERS.has('ListingUnverified'), false, 'a DECISION_CODES entry is not raisable');
    const codesTs = fs.readFileSync(path.join(REPO_ROOT, 'src/shared-kernel/codes.ts'), 'utf8');
    const block = codesTs.slice(codesTs.indexOf('export const DOMAIN_ERRORS'), codesTs.indexOf('export type DomainErrorCode'));
    assert.equal(CODE_OWNERS.size, block.match(/^\s+\w+: \{/gm).length);
  });

  it('REGULATED_COLUMNS names real columns and covers every `-- regulated` marker in the schema', () => {
    const schema = fs.readFileSync(path.join(REPO_ROOT, '_bmad-output/planning-artifacts/detailed-design/schemas/001_tezg_schema.sql'), 'utf8');
    const blocks = new Map([...schema.matchAll(/^CREATE TABLE IF NOT EXISTS "?(\w+)"?[^\n]*\n([\s\S]*?)^\);/gm)].map((m) => [m[1], m[2]]));
    for (const [table, columns] of Object.entries(REGULATED_COLUMNS)) {
      assert.ok(TABLE_OWNERS.has(table), `${table} has a schema section`);
      for (const c of columns ?? []) assert.match(blocks.get(table), new RegExp(`^\\s+"?${c}"?\\s`, 'm'), `${table}.${c} exists`);
    }
    for (const [table, body] of blocks) {
      for (const m of body.matchAll(/^\s+"?(\w+)"?\s.*--\s*regulated\b/gm)) {
        assert.ok(table in REGULATED_COLUMNS && (REGULATED_COLUMNS[table] === null || REGULATED_COLUMNS[table].includes(m[1])), `${table}.${m[1]} is marked regulated in the schema`);
      }
    }
  });
});
