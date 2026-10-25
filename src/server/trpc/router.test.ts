import { describe, expect, it, vi } from 'vitest';
import { raiserFor } from '../../shared-kernel/raise.js';
import { VirtualClock } from '../../../test-support/clock.js';
import { id } from '../../../test-support/ids.js';
import { T0 } from '../../../test-support/solu2/fixtures.js';
import { serveTrpc, UNWIRED_IDENTITY, type IdentityGate } from './init.js';
import { PROCEDURES } from './inputs.generated.js';
import { appRouter, describeProceduresV2 } from './router.v2.js';

const raise = raiserFor('identity');
const actor = id('camila');
const listingId = id('lst1');

const call = async (path: string, input: unknown, o: { method?: 'GET' | 'POST'; identity?: IdentityGate; query?: string } = {}) => {
  const method = o.method ?? (PROCEDURES.find((p) => p.procedure === path)?.kind === 'mutation' ? 'POST' : 'GET');
  const url = `http://localhost/api/trpc/${path}${method === 'GET' ? `?input=${encodeURIComponent(JSON.stringify(input))}${o.query ?? ''}` : (o.query ?? '')}`;
  const res = await serveTrpc(new Request(url, method === 'GET' ? {} : { method, body: JSON.stringify(input), headers: { 'content-type': 'application/json' } }), appRouter, new VirtualClock(), o.identity);
  return { status: res.status, json: (await res.json()) as { error: Record<string, unknown> } };
};

const gate = (over: Partial<IdentityGate>): IdentityGate => ({ ...UNWIRED_IDENTITY, resolveSession: vi.fn(async () => actor), ...over });

describe('registry routers (AD-SYS-8 rules 1–2)', () => {
  it('registers the 108 non-job ingress procedures, grouped per module, each on its builder', () => {
    const shapes = describeProceduresV2();
    expect(shapes).toHaveLength(108);
    const perModule: Record<string, number> = {};
    for (const s of shapes) perModule[s.procedure.split('.')[0]!] = (perModule[s.procedure.split('.')[0]!] ?? 0) + 1;
    expect(perModule).toEqual({ access: 2, verification: 11, catalog: 7, discovery: 2, inventory: 12, orders: 14, commission: 13, trading: 10, messaging: 5, collections: 17, valuation: 3, reputation: 8, admin: 4 });
    expect(shapes.filter((s) => s.builder === 'public').map((s) => s.procedure).sort()).toEqual(['catalog.browse', 'catalog.provenance', 'discovery.cardDetail', 'discovery.search', 'inventory.get', 'orders.supportContact.get', 'reputation.profile']);
    expect(shapes.find((s) => s.procedure === 'inventory.get')).toEqual({ procedure: 'inventory.get', kind: 'query', builder: 'public', inputKeys: ['listingId'] });
    expect(shapes.find((s) => s.procedure === 'orders.supportContact.get')?.inputKeys).toEqual([]);
  });
});

describe('the wire: every refusal is { error: ErrorBody } with its own HTTP status (R-9)', () => {
  it('an invalid input is RequestValidationFailed 400, stamped by the context clock, with nothing but the ErrorBody keys', async () => {
    const { status, json } = await call('inventory.get', { listingId: 'nope', role: 'admin' });
    expect(status).toBe(400);
    expect(json.error).toMatchObject({ code: 'RequestValidationFailed', httpStatus: 400, decision: { outcome: 'rejected', occurredAt: T0 } });
    expect(json.error.issues).toEqual([
      { field: 'listingId', issue: 'no tiene el formato esperado' },
      { field: 'role', issue: 'no es un campo permitido' },
    ]);
    expect(Object.keys(json.error).sort()).toEqual(['code', 'decision', 'httpStatus', 'issues']);
  });

  it('an unwired resolver is Unexpected 500 and the body never names the stub', async () => {
    const { status, json } = await call('inventory.get', { listingId });
    expect(status).toBe(500);
    expect(json.error).toMatchObject({ code: 'Unexpected', httpStatus: 500 });
    expect(JSON.stringify(json)).not.toMatch(/NotImplemented|inventory\.get|stack/);
  });

  it('a batched call, refused before any context exists, still gets an ErrorBody and a clock instant', async () => {
    const { status, json } = await call('inventory.get,catalog.browse', { 0: { listingId }, 1: {} }, { query: '&batch=1' });
    expect(status).toBe(500);
    expect(json.error).toMatchObject({ code: 'Unexpected', decision: { occurredAt: T0 } });
  });

  it('concurrent requests refused before their context each keep their own clock', async () => {
    const batched = (at: string) => serveTrpc(new Request(`http://localhost/api/trpc/inventory.get,catalog.browse?batch=1&input=${encodeURIComponent('{}')}`), appRouter, new VirtualClock(Date.parse(at)));
    const [a, b] = await Promise.all([batched('2026-10-01T15:00:00.000Z'), batched('2027-01-01T00:00:00.000Z')]);
    const [ja, jb] = (await Promise.all([a.json(), b.json()])) as { error: { decision: { occurredAt: string } } }[];
    expect([ja!.error.decision.occurredAt, jb!.error.decision.occurredAt]).toEqual(['2026-10-01T15:00:00.000Z', '2027-01-01T00:00:00.000Z']);
  });
});

describe('builders delegate every gate to identity (AD-11)', () => {
  it('authed: a missing session is identity\'s NotAuthenticated, unchanged', async () => {
    const identity = gate({ resolveSession: async () => raise('NotAuthenticated', [{ rule: 'AD-SYS-8 rule 1', inputs: {} }]) });
    const { status, json } = await call('collections.addEntry', {}, { identity });
    expect([status, json.error.code]).toEqual([401, 'NotAuthenticated']);
  });

  it('admin: requireAdmin gets the session actor, and its AdminOnly propagates', async () => {
    const requireAdmin = vi.fn(async () => raise('AdminOnly', [{ rule: 'AD-SYS-8 rule 1', inputs: {} }]));
    const { status, json } = await call('verification.reasons.list', {}, { identity: gate({ requireAdmin }) });
    expect(requireAdmin).toHaveBeenCalledWith(actor);
    expect([status, json.error.code]).toEqual([403, 'AdminOnly']);
  });

  it('canBuy: requireCanBuy gets the session actor before the input is used', async () => {
    const requireCanBuy = vi.fn(async () => raise('EmailNotVerified', [{ rule: 'AD-SYS-8 rule 1', inputs: {} }]));
    const { json } = await call('inventory.contact', { listingId }, { identity: gate({ requireCanBuy }) });
    expect(requireCanBuy).toHaveBeenCalledWith({ userId: actor });
    expect(json.error.code).toBe('EmailNotVerified');
  });

  it('until Epic 2 wires sessions, a gated procedure is Unexpected (NotImplemented), not a guessed identity code', async () => {
    const { status, json } = await call('collections.addEntry', {});
    expect([status, json.error.code]).toEqual([500, 'Unexpected']);
  });
});
