import { NotImplementedError } from './errors.js';

// Regulated data (AD-SYS-8 rules 3–4, AD-17). The list is the design; the redactor and the
// logger are interface stubs (Solutioning stop-point) proven by sys › [SYS-8.R4].

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

/** Returns a deep copy of `value` with every regulated field replaced by `REDACTED`. */
export function redact<T>(_value: T): T {
  throw new NotImplementedError('shared-kernel.redact');
}

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/** A structured JSON logger: one line per call, `data` passed through `redact` first. */
export function createLogger(_sink: (line: string) => void): Logger {
  throw new NotImplementedError('shared-kernel.createLogger');
}
