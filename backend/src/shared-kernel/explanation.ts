import type { DomainErrorCode } from './codes.js';
import type { Decision } from './decision.js';

// Wire shapes of an explanation and a refusal (Solu-2 refinement R-9, review G-03).

/**
 * The AD-SYS-1 Decision as it crosses the wire: `occurredAt` is ISO 8601 UTC, and every
 * citation input is a primitive that passed the regulated-field redactor (AD-SYS-8 rule 4).
 */
export type ExplanationDTO = Decision;

/** One field-level issue of `RequestValidationFailed` (AD-SYS-1 rule 7). */
export interface ErrorIssue {
  field: string;
  issue: string;
}

/** The status tRPC 11 emits for each AD-SYS-1 family, plus 500 for 'Unexpected'. */
export type HttpStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500;

/**
 * The body of every refusal: `{ error: ErrorBody }` (R-9). For `*NotVisibleToCaller` and
 * `*NotFound` codes two bodies differ only in `decision.occurredAt` (S-2).
 */
export interface ErrorBody {
  code: DomainErrorCode | 'Unexpected';
  httpStatus: HttpStatus;
  decision: ExplanationDTO;
  /** Present only on `RequestValidationFailed`. */
  issues?: ErrorIssue[];
}
