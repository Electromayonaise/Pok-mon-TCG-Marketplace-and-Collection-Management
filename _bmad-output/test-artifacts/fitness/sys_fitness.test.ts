// Fitness — SYS (contracts.md §14): the static halves of the cross-cutting ADs. GREEN, and must
// stay green: they guard every later story. Each scanner is first proven against a planted
// violation, so a pass over today's stubs is never vacuous. The behavioural halves are red in
// _bmad-output/test-artifacts/atdd/sys_contracts.test.ts.
import fs from 'node:fs';
import net from 'node:net';
import { describe, expect, it } from 'vitest';
import { EVENT_SCHEMA_VERSIONS, EVENT_SUBSCRIBERS } from '../../../src/shared-kernel/events.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { importViolations, ownershipViolations, parseGeneratedYaml, sqlWrites, tableOwners, tsFiles, wallClockReads } from '../../../test-support/solu2/fitness.js';

const SCHEMAS = '_bmad-output/planning-artifacts/detailed-design/schemas';
const schemaSql = fs.readFileSync(`${SCHEMAS}/001_tezg_schema.sql`, 'utf8');
const source = tsFiles('src').map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));

describe('SYS-AD1 — import graph (AD-1)', () => {
  it('[SYS-AD1.probe] the scanner flags a forbidden edge and a deep import', () => {
    expect(importViolations([
      { file: 'src/modules/trading/ports/x.ts', text: `import type { A } from '../../catalog/index.js';` },
      { file: 'src/modules/orders/ports/x.ts', text: `import type { B } from '../../listings/dto/inv.v2.dto.js';` },
      { file: 'src/modules/reviews/ports/x.ts', text: `import type { C } from '../../orders/index.js';` },
    ])).toHaveLength(2);
    // The kernel and the modules never import the driving adapter in src/server (decision log Impl-1 #19).
    expect(importViolations([
      { file: 'src/shared-kernel/x.ts', text: `import { renderMessage } from '../server/trpc/messages.js';` },
      { file: 'src/modules/orders/application/x.ts', text: `import type { D } from '../../../server/trpc/init.js';` },
      { file: 'src/server/trpc/x.ts', text: `import { E } from './errors.js';` },
    ])).toHaveLength(2);
  });

  it('[SYS-AD1] import graph equals AD-1: every cross-module import is an AD-1 edge through index.ts; catalog and identity import no module', () => {
    expect(importViolations(source)).toEqual([]);
  });
});

describe('SYS-AD8 — table ownership (AD-8, R-2)', () => {
  const owners = tableOwners(schemaSql);

  it('[SYS-AD8.probe] every schema table has an owner, and the scanner flags a foreign write', () => {
    const tables = [...schemaSql.matchAll(/^CREATE TABLE IF NOT EXISTS "?(\w+)"?/gm)].map((m) => m[1]!);
    expect(tables.filter((t) => !owners.has(t))).toEqual([]);
    expect(owners.get('audit_events')).toBe('shared-kernel');
    expect(ownershipViolations([{ file: 'src/modules/listings/infra/pg.ts', text: 'await tx.query(`UPDATE "CommissionAccount" SET balance = 0`);' }], owners)).toHaveLength(1);
    // A row lock is a read: `SELECT … FOR UPDATE [SKIP LOCKED]` writes no table (AD-SYS-2 rule 4
    // step 2; decision log Impl-1 #18).
    expect(sqlWrites('`SELECT 1 FROM "EventDelivery" WHERE status = \'failed\' FOR UPDATE SKIP LOCKED`')).toEqual([]);
    // So are a FOR NO KEY UPDATE lock and an upsert's DO UPDATE, and prose is not SQL (Epic 1 review).
    expect(sqlWrites('`SELECT 1 FROM "EventDelivery" FOR NO KEY UPDATE` `INSERT INTO "User" (id) VALUES ($1) ON CONFLICT (id) DO UPDATE SET name = $2` \'could not update the row\'')).toEqual(['User']);
  });

  it('[SYS-AD8] no foreign-table writes: each module writes only its own tables; audit and outbox rows only through their ports', () => {
    expect(ownershipViolations(source, owners)).toEqual([]);
  });
});

describe('SYS-AD9 — event registry (AD-9, R-1)', () => {
  const eventsMd = fs.readFileSync(`${SCHEMAS}/events.md`, 'utf8');
  const sections = [...eventsMd.matchAll(/^### 3\.\d+ (.+) \(schemaVersion (\d+)\)\n([\s\S]*?)(?=^### |^## )/gm)];
  const documented = new Map<string, { version: number; subscribers: string[] }>();
  for (const [, names, version, body] of sections) {
    const subs = /\*\*Subscribers:\*\*([\s\S]*)/.exec(body!)?.[1] ?? '';
    const subscribers = /^\s*none\b/.test(subs) ? [] : [...new Set([...subs.matchAll(/(commission|listings|collections) →/g)].map((m) => m[1]!))];
    for (const n of names!.matchAll(/`(\w+)`/g)) documented.set(n[1]!, { version: Number(version), subscribers });
  }
  const checked = [...schemaSql.matchAll(/type\s+TEXT NOT NULL CHECK \(type IN \(([\s\S]*?)\)\)/g)][0]?.[1] ?? '';

  it('[SYS-AD9] payload schema per event: events.ts, events.md and the OutboxEvent CHECK name the same events, versions and subscribers', () => {
    const types = Object.keys(EVENT_SCHEMA_VERSIONS).sort();
    expect(types).toHaveLength(7);
    expect([...documented.keys()].sort()).toEqual(types);
    expect([...checked.matchAll(/'(\w+)'/g)].map((m) => m[1]).sort()).toEqual(types);
    for (const t of types as (keyof typeof EVENT_SCHEMA_VERSIONS)[]) {
      expect([t, documented.get(t)!.version]).toEqual([t, EVENT_SCHEMA_VERSIONS[t]]);
      expect([t, [...documented.get(t)!.subscribers].sort()]).toEqual([t, [...EVENT_SUBSCRIBERS[t]].sort()]);
    }
  });
});

describe('SYS-6.R1 — wall clock (AD-SYS-6 rules 1–2)', () => {
  it('[SYS-6.R1.probe] the scanner flags Date.now, new Date(), SQL now() and CURRENT_TIMESTAMP, and allows clock.now()', () => {
    expect(wallClockReads('const a = Date.now(); const b = new Date(); q(`SELECT now(), CURRENT_TIMESTAMP`); this.clock.now(); new Date(x); interface Clock { now(): Date }')).toEqual(['Date.now(', 'new Date()', 'now()', 'CURRENT_TIMESTAMP']);
  });

  it('[SYS-6.R1] no wall-clock reads in src/ nor in the schema (no DEFAULT now())', () => {
    expect(source.flatMap(({ file, text }) => wallClockReads(text).map((r) => `${file}: ${r}`))).toEqual([]);
    expect(wallClockReads(schemaSql)).toEqual([]);
  });
});

describe('SYS-6.R4 — socket guard (AD-SYS-6 rule 4, NFR-SYS-3)', () => {
  it('[SYS-6.R4] an outbound socket to any host but the test Postgres is refused', () => {
    expect(() => net.connect({ host: '203.0.113.7', port: 443 })).toThrow(/network guard/);
  });
});

describe('SYS-8.R2 — ingress inputs (AD-SYS-8 rules 1–2, AD-16, NFR-IDN-3)', () => {
  type Op = { 'x-actor-fields-from-session'?: string[]; requestBody?: { content: Record<string, { schema: { properties?: Record<string, unknown> } }> }; parameters?: { content: Record<string, { schema: { properties?: Record<string, unknown> } }> }[] };
  const openapi = parseGeneratedYaml(fs.readFileSync(`${SCHEMAS}/openapi.yaml`, 'utf8')) as { paths: Record<string, Record<string, Op>> };

  it('[SYS-8.R2.static] no OpenAPI input has a role-like key or a session actor field', () => {
    const problems: string[] = [];
    let procedures = 0;
    for (const [p, methods] of Object.entries(openapi.paths)) {
      for (const op of Object.values(methods)) {
        procedures++;
        const schema = (op.requestBody?.content ?? op.parameters?.[0]?.content)?.['application/json']?.schema;
        for (const key of Object.keys(schema?.properties ?? {})) {
          if (/^(role|roles|sellerKind|isAdmin|capabilities)$/.test(key) || (op['x-actor-fields-from-session'] ?? []).includes(key)) problems.push(`${p}: ${key}`);
        }
      }
    }
    expect(procedures).toBe(113); // 108 tRPC procedures + 3 job endpoints + 2 health probes (Impl-1 scaffold)
    expect(problems).toEqual([]);
  });
});

describe('SYS-R2 — grants (R-2, AD-12, AD-SYS-8 rule 10)', () => {
  const db = useTestDatabase();

  it('[SYS-R2.grants] append-only tables refuse UPDATE and DELETE to the app role; Review and Listing refuse DELETE', async () => {
    const appendOnly = ['audit_events', 'OutboxEvent', 'EventReplayLog', 'ReviewModerationLog', 'ListingModerationLog', 'CommissionLedgerEntry', 'Message', 'TradeOfferRound'];
    const rows = await db.query<{ t: string; u: boolean; d: boolean }>(
      `SELECT t, has_table_privilege('tezg_app', format('%I', t), 'UPDATE') AS u, has_table_privilege('tezg_app', format('%I', t), 'DELETE') AS d FROM unnest($1::text[]) AS t`,
      [[...appendOnly, 'Review', 'Listing']],
    );
    expect(rows.filter((r) => appendOnly.includes(r.t) && (r.u || r.d)).map((r) => r.t)).toEqual([]);
    expect(rows.filter((r) => ['Review', 'Listing'].includes(r.t)).map((r) => [r.t, r.u, r.d])).toEqual([['Review', true, false], ['Listing', true, false]]);
  });
});
