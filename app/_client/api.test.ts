// The browser side of the public API (Story 9.6, decision log Impl-2 #15): one procedure per request, the answer as an
// ApiResult, and the es-CO times in Bogotá. `fetch` is the external port, stubbed per test; nothing else is faked.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hora, mutate, query } from './api.js';

const calls: { url: string; init: RequestInit | undefined }[] = [];
function answer(respond: () => Response | Promise<Response>) {
  calls.length = 0;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => { calls.push({ url, init }); return respond(); });
}
afterEach(() => { vi.unstubAllGlobals(); });

describe('query and mutate (R-9: no batching)', () => {
  it('a query is a GET of its input as URL JSON with no cache; a mutation a POST of JSON; a result is ok with its data', async () => {
    answer(() => Response.json({ result: { data: { rows: [] } } }));
    expect(await query('messaging.inbox', { cursor: null })).toEqual({ ok: true, data: { rows: [] } });
    expect(calls).toEqual([{ url: `/api/trpc/messaging.inbox?input=${encodeURIComponent('{"cursor":null}')}`, init: { cache: 'no-store' } }]);
    expect(await mutate('messaging.markRead', { conversationId: 'c1', seq: 2 })).toEqual({ ok: true, data: { rows: [] } });
    expect(calls.slice(1)).toEqual([{ url: '/api/trpc/messaging.markRead', init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"conversationId":"c1","seq":2}' } }]);
  });

  it('a refusal keeps its status and ErrorBody; a body that is not JSON keeps the status with no error; a lost connection is status 0', async () => {
    const error = { code: 'ConversationNotVisibleToCaller', httpStatus: 403 };
    answer(() => Response.json({ error }, { status: 403 }));
    expect(await query('messaging.thread', { conversationId: 'c1', afterSeq: 0 })).toEqual({ ok: false, status: 403, error });
    answer(() => new Response('<html>Bad gateway</html>', { status: 502 }));
    expect(await mutate('messaging.send', {})).toEqual({ ok: false, status: 502, error: null });
    answer(() => Response.json({}, { status: 200 }));
    expect(await query('messaging.inbox', {})).toEqual({ ok: false, status: 200, error: null });
    answer(() => { throw new TypeError('fetch failed'); });
    expect([await query('messaging.inbox', {}), await mutate('messaging.send', {})]).toEqual([{ ok: false, status: 0, error: null }, { ok: false, status: 0, error: null }]);
  });
});

describe('the times the pages show (ADD-§2.7)', () => {
  it('{hora} is the time in Bogotá (UTC−5), whatever the machine\'s zone', () => {
    expect(hora('2026-10-01T14:40:00.000Z').replace(/\s/g, ' ')).toBe('9:40 a. m.');
    expect(hora('2026-10-02T03:05:00.000Z').replace(/\s/g, ' ')).toBe('10:05 p. m.');
  });
});
