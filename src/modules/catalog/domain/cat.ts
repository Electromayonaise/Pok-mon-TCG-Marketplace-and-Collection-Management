// Core domain — CAT. Pure (AD-SYS-6).

export type CatalogKind = 'card' | 'sealedProduct';
export type CopDerivation = 'sourceNative' | 'fxDerived';

/** ADD-§8.2 defect kinds plus KindChanged (GAP-4, decision log #12). */
export type QuarantineReason =
  | 'MissingRequiredField'
  | 'UnknownSet'
  | 'BadNumberFormat'
  | 'InvalidPrice'
  | 'CurrencyPairInconsistent'
  | 'KindChanged';

export interface RawFeedRow {
  [field: string]: string | number | null | undefined;
}

/** The catalog attributes of a valid row (CAT-2's `ValidFeedRow`). */
export interface FeedRowFields {
  externalKey: string;
  setCode: string;
  number: string;
  name: string;
  kind: CatalogKind;
  eraCode: string;
  pokemon: string | null;
  colour: string | null;
  style: string | null;
  artist: string | null;
  imageUrl: string | null;
}

/** A valid row's price, still in the source's units; the batch converts it once (AD-CAT-2 rule 1). */
export interface FeedRowPrice {
  usdCents: number | null;
  cop: number | null;
  /** ISO instant; the row's own, else the batch's `now`. */
  observedAt: string;
}

export type RowVerdict =
  | { ok: true; row: FeedRowFields; price: FeedRowPrice | null }
  | { ok: false; reason: Exclude<QuarantineReason, 'KindChanged'> };

const REQUIRED = ['externalKey', 'setCode', 'number', 'name', 'kind', 'eraCode'] as const;
const OPTIONAL = ['pokemon', 'colour', 'style', 'artist', 'imageUrl'] as const;
/** ADD-§8.1 rule 3: digits, optionally with a letter prefix or suffix, or a slash total ("025/165"). */
const NUMBER = /^[A-Za-z]{0,5}\d+[A-Za-z]{0,3}(?:\/\d+)?$/;
const MINOR_UNITS = /^\d+$/;

const text = (v: RawFeedRow[string]): string | null => (v === null || v === undefined || String(v).trim() === '' ? null : String(v));

/** ADD-§8.1 rule 4: absent, or a non-negative integer in its minor unit; `undefined` when invalid. */
function minorUnits(v: RawFeedRow[string]): number | null | undefined {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isSafeInteger(v) && v >= 0 ? v : undefined;
  return MINOR_UNITS.test(v) && Number.isSafeInteger(Number(v)) ? Number(v) : undefined;
}

/**
 * ADD-§8.1 rules 1–5. `copPerUsdCentavos` is the TRM covering the row's Bogotá date (or the latest
 * earlier one), null when none is stored; without it a two-currency row cannot be checked and is
 * kept as source-native. KindChanged is the upsert's, never this function's (CAT-2 Q-fail).
 */
export function validateRow(
  raw: RawFeedRow,
  context: { knownSetCodes: ReadonlySet<string>; now: string; copPerUsdCentavos: (observedAt: string) => number | null },
): RowVerdict {
  for (const field of REQUIRED) if (text(raw[field]) === null) return { ok: false, reason: 'MissingRequiredField' };
  const kind = String(raw.kind);
  if (kind !== 'card' && kind !== 'sealedProduct') return { ok: false, reason: 'MissingRequiredField' };
  const setCode = String(raw.setCode);
  if (!context.knownSetCodes.has(setCode)) return { ok: false, reason: 'UnknownSet' };
  const number = String(raw.number).trim();
  if (!NUMBER.test(number)) return { ok: false, reason: 'BadNumberFormat' };
  const usdCents = minorUnits(raw.usdCents);
  const cop = minorUnits(raw.cop);
  if (usdCents === undefined || cop === undefined) return { ok: false, reason: 'InvalidPrice' };
  const observedAt = observedAtOf(raw, context.now);
  if (observedAt === null) return { ok: false, reason: 'InvalidPrice' };
  if (usdCents !== null && cop !== null) {
    const rate = context.copPerUsdCentavos(observedAt);
    if (rate !== null && Math.abs(copFromUsd(usdCents, rate) - cop) > 1) return { ok: false, reason: 'CurrencyPairInconsistent' };
  }
  const row: FeedRowFields = {
    externalKey: String(raw.externalKey), setCode, number, name: String(raw.name), kind, eraCode: String(raw.eraCode),
    pokemon: null, colour: null, style: null, artist: null, imageUrl: null,
  };
  for (const field of OPTIONAL) row[field] = text(raw[field]);
  return { ok: true, row, price: usdCents === null && cop === null ? null : { usdCents, cop, observedAt } };
}

/** A row's observation instant: its own `observedAt`, else `now`; null when the field is no instant. */
export function observedAtOf(raw: RawFeedRow, now: string): string | null {
  const observed = text(raw.observedAt);
  if (observed === null) return now;
  const ms = Date.parse(observed);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** The sort value of a card number: its first run of digits ("025/165" → 25, "TG05" → 5). */
export function numberSort(number: string): number {
  const digits = /\d+/.exec(number);
  return digits ? Number.parseInt(digits[0], 10) : 0;
}

/** ADD-§2.1: `floor((usdCents × copPerUsdCentavos + 5 000) / 10 000)`, in BigInt, so it never rounds twice. */
export function copFromUsd(usdCents: number, copPerUsdCentavos: number): number {
  return Number((BigInt(usdCents) * BigInt(copPerUsdCentavos) + 5_000n) / 10_000n);
}

/** The calendar date in America/Bogota (UTC−5, no daylight saving) of an instant. */
export function bogotaDate(instant: string | Date): string {
  const ms = typeof instant === 'string' ? Date.parse(instant) : instant.getTime();
  return new Date(ms - 5 * 3_600_000).toISOString().slice(0, 10);
}

/** The nine attributes CAT-2 Q1 may update; never `id`, `externalKey`, `kind` or `createdAt`. */
export const UPSERT_ATTRIBUTES = ['setId', 'name', 'number', 'numberSort', 'pokemon', 'colour', 'style', 'artist', 'imageUrl'] as const;

/** Attribute names whose values differ between the stored entry and the row (AD-CAT-1 rule 3). */
export function diffAttributes(stored: Record<string, unknown>, incoming: Record<string, unknown>): string[] {
  return UPSERT_ATTRIBUTES.filter((name) => (stored[name] ?? null) !== (incoming[name] ?? null));
}

// ---------------------------------------------------------------- keyset cursors

const KEY_ID = /^[a-z][0-9a-z]{23}$/;

/** The opaque cursor of a page: base64url JSON of the list's tag and its last row's sort key. */
function encodeKeyset(tag: string, ...key: (string | number)[]): string {
  return Buffer.from(JSON.stringify([tag, ...key])).toString('base64url');
}

function decodeKeyset(tag: string, cursor: string, arity: number): unknown[] | null {
  let parts: unknown = null;
  try {
    parts = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!Array.isArray(parts) || parts.length !== arity + 1 || parts[0] !== tag) return null;
  return parts.slice(1);
}

/** CAT-1.runs: `("startedAt", id)` of a page's last row; the list runs newest first. */
export interface RunKey {
  startedAt: string;
  id: string;
}

export function encodeRunCursor(key: RunKey): string {
  return encodeKeyset('feed-runs', key.startedAt, key.id);
}

export function decodeRunCursor(cursor: string): RunKey | null {
  const key = decodeKeyset('feed-runs', cursor, 2);
  if (key === null) return null;
  const [startedAt, id] = key;
  if (typeof startedAt !== 'string' || !/^\d{4}-/.test(startedAt) || Number.isNaN(Date.parse(startedAt))) return null;
  if (new Date(startedAt).toISOString() !== startedAt || typeof id !== 'string' || !KEY_ID.test(id)) return null;
  return { startedAt, id };
}

/** CAT-2.quarantine: the run and the last `rowNumber` of a page, so a cursor never crosses runs. */
export interface QuarantineKey {
  runId: string;
  rowNumber: number;
}

export function encodeQuarantineCursor(key: QuarantineKey): string {
  return encodeKeyset('feed-quarantine', key.runId, key.rowNumber);
}

export function decodeQuarantineCursor(cursor: string): QuarantineKey | null {
  const key = decodeKeyset('feed-quarantine', cursor, 2);
  if (key === null) return null;
  const [runId, rowNumber] = key;
  if (typeof runId !== 'string' || !KEY_ID.test(runId) || !Number.isSafeInteger(rowNumber) || (rowNumber as number) < 1) return null;
  return { runId, rowNumber: rowNumber as number };
}
