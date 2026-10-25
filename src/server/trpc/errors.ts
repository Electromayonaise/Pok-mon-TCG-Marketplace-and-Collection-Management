// Driving adapter — the tRPC error formatter (AD-SYS-1; refinement R-9, review G-03). Every
// refusal leaves the server as `{ error: ErrorBody }`. Proven by sys › [SYS-1.R6].
import { TRPCError } from '@trpc/server';
import { ZodError, type core } from 'zod';
import { DOMAIN_ERRORS, HTTP_STATUS } from '../../shared-kernel/codes.js';
import type { Citation } from '../../shared-kernel/decision.js';
import { DomainError } from '../../shared-kernel/errors.js';
import type { ErrorBody, ErrorIssue, HttpStatus } from '../../shared-kernel/explanation.js';
import { REGULATED_FIELDS, redact } from '../../shared-kernel/regulated.js';
import { renderMessage } from './messages.js';

/**
 * Maps a thrown value to the wire body:
 * - a DomainError, or one tRPC wrapped as a `cause` → its registry family's status, the es-CO
 *   `humanMessage`, the citations (through the redactor when an input key is regulated), and
 *   `occurredAt = now`;
 * - a ZodError, or a tRPC BAD_REQUEST caused by one → `RequestValidationFailed` with `issues`;
 * - a request tRPC itself refuses (unknown path, wrong method, batching, bad JSON…) →
 *   `RequestValidationFailed` with one issue on `la solicitud` (decision log Impl-1 #10);
 * - anything else → `'Unexpected'` (HTTP 500), whose body never carries the error's message.
 *
 * The body depends only on the code, the citations and `now` (S-2).
 */
export function toErrorBody(error: unknown, now: Date): ErrorBody {
  const occurredAt = now.toISOString();
  const domain = domainErrorIn(error);
  if (domain) {
    const regulated = domain.citations.some((c) => Object.keys(c.inputs).some((k) => REGULATED_FIELDS.some((f) => f.test(k))));
    const citations = regulated ? redact(domain.citations) : domain.citations;
    return {
      code: domain.code,
      httpStatus: HTTP_STATUS[DOMAIN_ERRORS[domain.code].trpc] as HttpStatus,
      decision: { outcome: 'rejected', reasonCode: domain.code, humanMessage: renderMessage(domain.code, citations[0].inputs), citations, occurredAt },
    };
  }
  const zod = error instanceof ZodError ? error : error instanceof TRPCError && error.code === 'BAD_REQUEST' && error.cause instanceof ZodError ? error.cause : null;
  const issues = zod ? zod.issues.flatMap(toIssues).slice(0, MAX_ISSUES)
    : error instanceof TRPCError && Object.hasOwn(REQUEST_REFUSALS, error.code) ? [{ field: ROOT_FIELD, issue: REQUEST_REFUSALS[error.code]! }]
    : null;
  if (issues) {
    const first = issues[0] ?? { field: ROOT_FIELD, issue: 'no es válido' };
    const citations: [Citation, ...Citation[]] = [{ rule: 'AD-SYS-1', inputs: { ...first } }];
    return {
      code: 'RequestValidationFailed',
      httpStatus: 400,
      decision: { outcome: 'rejected', reasonCode: 'RequestValidationFailed', humanMessage: (issues.length ? issues : [first]).map((i) => renderMessage('RequestValidationFailed', { ...i })).join('\n'), citations, occurredAt },
      issues,
    };
  }
  return {
    code: 'Unexpected',
    httpStatus: 500,
    decision: { outcome: 'rejected', reasonCode: 'Unexpected', humanMessage: renderMessage('Unexpected', {}), citations: [{ rule: 'AD-SYS-1', inputs: {} }], occurredAt },
  };
}

/** The DomainError itself, or the one tRPC wrapped as the `cause` of its own error. */
function domainErrorIn(error: unknown): DomainError | null {
  for (let e = error, depth = 0; e instanceof Error && depth < 5; e = e.cause, depth++) {
    if (e instanceof DomainError) return e;
  }
  return null;
}

/** How an issue on the whole input (an empty path) names its field. */
const ROOT_FIELD = 'la solicitud';

/**
 * The codes tRPC raises itself, before any procedure runs, for a request the client got wrong.
 * No procedure of ours throws a TRPCError (they raise DomainErrors), so these are never ours.
 */
const REQUEST_REFUSALS: Partial<Record<TRPCError['code'], string>> = {
  NOT_FOUND: 'no corresponde a ningún procedimiento',
  METHOD_NOT_SUPPORTED: 'usa un método HTTP que este procedimiento no acepta',
  BAD_REQUEST: 'no tiene la forma esperada',
  PARSE_ERROR: 'no es un JSON válido',
  UNSUPPORTED_MEDIA_TYPE: 'no tiene un tipo de contenido aceptado',
  PAYLOAD_TOO_LARGE: 'es demasiado grande',
};

const EXPECTED: Record<string, string> = {
  string: 'un texto', number: 'un número', int: 'un número entero', boolean: 'verdadero o falso',
  object: 'un objeto', array: 'una lista', null: 'vacío (null)', date: 'una fecha',
};
const FORMATS: Record<string, string> = {
  datetime: 'debe ser una fecha y hora ISO 8601 en UTC', date: 'debe ser una fecha AAAA-MM-DD', email: 'debe ser un correo válido', url: 'debe ser un enlace válido',
};
/** A client-chosen key is echoed only when it reads as a plain camelCase name (no PascalCase, no markup). */
const SAFE_SEGMENT = /^[a-z][A-Za-z0-9]{0,63}$/;
const UNKNOWN_FIELD = 'un campo desconocido';
/** Caps the issues (and humanMessage lines) one refusal carries. */
const MAX_ISSUES = 20;
const fieldOf = (path: readonly PropertyKey[]) =>
  path.some((s) => typeof s !== 'number' && !SAFE_SEGMENT.test(String(s))) ? UNKNOWN_FIELD : path.map(String).join('.') || ROOT_FIELD;

/** zod 4 issue → controlled es-CO copy (AD-SYS-1 rule 7). Never zod's English message. */
function toIssues(i: core.$ZodIssue): ErrorIssue[] {
  const field = fieldOf(i.path);
  switch (i.code) {
    case 'unrecognized_keys':
      return i.keys.map((k) => ({ field: fieldOf([...i.path, k]), issue: 'no es un campo permitido' }));
    case 'invalid_type':
      return [{ field, issue: EXPECTED[i.expected] ? `debe ser ${EXPECTED[i.expected]}` : 'tiene un tipo no válido' }];
    case 'too_small':
      return [{ field, issue: bound(i.origin, 'al menos', i.inclusive ? 'mayor o igual a' : 'mayor que', i.minimum) }];
    case 'too_big':
      return [{ field, issue: bound(i.origin, 'como máximo', i.inclusive ? 'menor o igual a' : 'menor que', i.maximum) }];
    case 'invalid_format':
      return [{ field, issue: FORMATS[i.format] ?? 'no tiene el formato esperado' }];
    case 'invalid_value':
      // The allowed values are registry codes or other PascalCase literals; they never reach the copy.
      return [{ field, issue: 'no es una de las opciones permitidas' }];
    default:
      return [{ field, issue: 'no es válido' }];
  }
}

function bound(origin: string, sizeWord: string, numberWords: string, limit: number | bigint): string {
  if (origin === 'string') return `debe tener ${sizeWord} ${limit} caracteres`;
  if (origin === 'array' || origin === 'set') return `debe tener ${sizeWord} ${limit} elementos`;
  return `debe ser ${numberWords} ${limit}`;
}
