// The production composition over HTTP, for the `src/server/composition-*.test.ts` files (decision log Impl-1 #24;
// split from one 1,038-line file by the Impl-2 test review, HIGH-1). A real Better Auth session on the test database,
// the identity gate and every resolver, all through serveTrpc as app/api/trpc/[trpc]/route.ts calls it.
//
// Isolation (test review HIGH-8): each test gets a freshly composed app with fresh feed, TRM and scanner adapters,
// the virtual clock back at T0 and an empty object store; the rows are truncated by `useTestDatabase`. No test can
// leak state into the next, whatever the order.
import { createHmac, randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { beforeEach } from 'vitest';
import { PrismaClient } from '../generated/prisma/client.js';
import { createAuth } from '../src/server/auth.js';
import { compose } from '../src/server/composition.js';
import { betterAuthSessions } from '../src/server/sessions.js';
import { serveTrpc } from '../src/server/trpc/init.js';
import { VirtualClock } from './clock.js';
import { useTestDatabase } from './db.js';
import { FixtureFeedSource, FixtureFxRateSource, InMemoryObjectStorage, SimulatedScanner } from './simulated/index.js';
import { id, ins, T0 } from './solu2/fixtures.js';

export const SECRET = 'composition-test-secret-0123456789abcdef';
export const IP_KEY = 'composition-test-ip-hmac-key-0123456789';

type Reply = { status: number; json: { result?: { data: Record<string, unknown> }; error?: Record<string, unknown> } };

/** The cookie Better Auth signs for a session token (HMAC-SHA256 of the token under `secret`). */
export const cookieFor = (token: string, secret: string) =>
  `better-auth.session_token=${encodeURIComponent(`${token}.${createHmac('sha256', secret).update(token).digest('base64')}`)}`;

/** Registers the per-file database and the per-test app; call it once at the top of a test file. */
export function useComposedApp() {
  const db = useTestDatabase();
  const clock = new VirtualClock();
  const storage = new InMemoryObjectStorage(clock);
  let app: ReturnType<typeof compose>;
  let sessions = 0;

  beforeEach(() => {
    clock.set(Date.parse(T0));
    storage.objects.clear();
    storage.signedReads.length = 0;
    storage.issuedTickets.length = 0;
    const feed = new FixtureFeedSource({
      current: [{ externalKey: 'sv1-025', setCode: 'SV1', number: '025', name: 'Pikachu', kind: 'card', eraCode: 'SV' }], previous: [], defects: [], renamed: [],
    });
    const auth = createAuth({ prisma: new PrismaClient({ adapter: new PrismaPg(db.pool) }), secret: SECRET, baseUrl: 'http://localhost:3000', clock });
    const ok = async () => undefined;
    app = compose({ pool: db.pool, clock, sessions: betterAuthSessions(auth), handlers: { commission: ok, collections: ok }, storage, scanner: new SimulatedScanner(), feed,
      fx: new FixtureFxRateSource([{ valor: '4130.00', validFrom: '2026-10-01', validTo: '2026-10-01' }]), ipHmacKey: IP_KEY });
  });

  /** A live `"Session"` row and the cookie Better Auth signs for it. */
  async function signIn(userId: string): Promise<string> {
    const token = randomBytes(24).toString('hex');
    // Better Auth checks expiry on the wall clock, not the test clock: the row must outlive the run.
    await ins(db, 'Session', { id: id(`ses${++sessions}`), userId, token, expiresAt: '2100-01-01T00:00:00.000Z' });
    return cookieFor(token, SECRET);
  }

  async function post(path: string, input: unknown, cookie?: string, extra: Record<string, string> = {}): Promise<Reply> {
    const headers: Record<string, string> = { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...extra };
    const res = await serveTrpc(new Request(`http://localhost/api/trpc/${path}`, { method: 'POST', headers, body: JSON.stringify(input) }), app.router, clock, { identity: app.identity, ipHmac: app.ipHmac });
    return { status: res.status, json: (await res.json()) as Reply['json'] };
  }

  async function get(path: string, input: unknown, cookie: string): Promise<Reply> {
    const url = `http://localhost/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`;
    const res = await serveTrpc(new Request(url, { headers: { cookie } }), app.router, clock, { identity: app.identity });
    return { status: res.status, json: (await res.json()) as Reply['json'] };
  }

  return { db, clock, storage, signIn, post, get };
}
