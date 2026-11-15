/// <reference lib="dom" />
// The browser side of the public API (Story 9.6, decision log Impl-2 #15): one tRPC procedure per request, no batching
// (R-9) — a query is `GET /api/trpc/<procedure>?input=`, a mutation a `POST` of JSON — and the es-CO formatting the
// pages share. A refusal comes back as the platform's ErrorBody; a lost connection as `error: null`.
import type { ErrorBody } from '../../src/shared-kernel/explanation.js';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ErrorBody | null };

async function read<T>(res: Response): Promise<ApiResult<T>> {
  const body = (await res.json().catch(() => null)) as { result?: { data: T }; error?: ErrorBody } | null;
  if (res.ok && body?.result) return { ok: true, data: body.result.data };
  return { ok: false, status: res.status, error: body?.error ?? null };
}

export async function query<T>(procedure: string, input: unknown): Promise<ApiResult<T>> {
  try {
    return await read<T>(await fetch(`/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`, { cache: 'no-store' }));
  } catch {
    return { ok: false, status: 0, error: null };
  }
}

export async function mutate<T>(procedure: string, input: unknown): Promise<ApiResult<T>> {
  try {
    return await read<T>(await fetch(`/api/trpc/${procedure}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }));
  } catch {
    return { ok: false, status: 0, error: null };
  }
}

const BOGOTA = 'America/Bogota';
const HORA = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: BOGOTA });
const FECHA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: BOGOTA });

/** `{hora}` (ADD-§2.7): "9:40 a. m.", in Bogotá time. */
export const hora = (iso: string): string => HORA.format(Date.parse(iso));
/** `{fecha}` (ADD-§2.7): "1 oct 2026, 10:00 a. m.", in Bogotá time. */
export const fecha = (iso: string): string => FECHA.format(Date.parse(iso));
