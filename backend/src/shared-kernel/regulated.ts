// Regulated data (AD-SYS-8 rules 3–4, AD-17): the list, the redactor and the structured logger.
// Proven by sys › [SYS-8.R4] and nfr › [NFR-SYS-8.canary].

/**
 * Field-name patterns whose values never reach a log line, an error body, a citation or an
 * outbox payload. Matched against the dotted path of a value inside any object.
 */
export const REGULATED_FIELDS: readonly RegExp[] = [
  /(^|\.)legalIdentity(\.|$)/, // legalIdentity.*
  /(^|\.)(documentKeys?|comprobanteKey|proofKey|uploadKey|quarantineKey)$/, // object keys
  /(^|\.)(signedUrl|signedUploadUrl|token)$/, // signed URLs and their tokens
  /(^|\.)(contactPhoneE164|phone|phoneE164)$/, // phone numbers
  /(^|\.)(body|messageBody)$/, // message bodies
];

/** The value every regulated field is replaced with. */
export const REDACTED = '[redacted]';

/**
 * Returns a deep copy of `value` with every regulated field replaced by `REDACTED`. Objects and
 * arrays are walked as `JSON.stringify` would emit them (own enumerable keys, or `toJSON()`), an
 * array index being one path segment (`messages.0.body`), so a class instance comes back as its
 * JSON shape. A regulated path loses its whole value, object or array, so the keys around it keep
 * their shape. Primitives, `null` and Dates are copied as is; an `Error` is dropped whole, since a
 * driver's own fields (`detail`) can quote a value. Redaction is by key, never by content.
 */
export function redact<T>(value: T): T {
  return walk(value, [], new WeakSet()) as T;
}

/** Deeper than this, or back on an ancestor (a cycle), a value is dropped rather than walked. */
const MAX_DEPTH = 32;

function walk(value: unknown, path: readonly string[], ancestors: WeakSet<object>): unknown {
  const dotted = path.join('.');
  if (dotted && REGULATED_FIELDS.some((f) => f.test(dotted))) return REDACTED;
  if (typeof value !== 'object' || value === null || value instanceof Date) return value;
  if (value instanceof Error || ancestors.has(value) || path.length > MAX_DEPTH) return REDACTED;
  ancestors.add(value);
  const json = 'toJSON' in value && typeof value.toJSON === 'function' ? (value.toJSON as () => unknown)() : value;
  const copy = json !== value ? walk(json, path, ancestors)
    : Array.isArray(value) ? value.map((v, i) => walk(v, [...path, String(i)], ancestors))
    : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, [...path, k], ancestors)]));
  ancestors.delete(value);
  return copy;
}

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * A structured JSON logger: one `{ level, msg, data? }` line per call, `data` passed through
 * `redact` first. `msg` is an event name (`orders.comprobante.attached`), never a value, and is
 * not redacted. No timestamp: `src/` reads no wall clock (AD-SYS-6); the sink may add one.
 */
export function createLogger(sink: (line: string) => void): Logger {
  const write = (level: 'info' | 'error') => (msg: string, data?: Record<string, unknown>) =>
    sink(JSON.stringify(data === undefined ? { level, msg } : { level, msg, data: redact(data) }));
  return { info: write('info'), error: write('error') };
}
