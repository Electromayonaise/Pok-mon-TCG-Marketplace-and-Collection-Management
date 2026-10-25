import type { Citation } from './decision.js';
import type { DomainErrorCode } from './codes.js';

/**
 * Thrown by every interface stub until its story is implemented. A red ATDD test must fail
 * with this error and no other (Solu-2 §6 "red for the right reason").
 */
export class NotImplementedError extends Error {
  override readonly name = 'NotImplementedError';
  constructor(readonly operation: string) {
    super(`NotImplemented: ${operation}`);
  }
}

/**
 * The typed error every contract throws (AD-SYS-1). Only the owning module constructs a code
 * (lint `tezg/error-owner`); other modules let it propagate unchanged (AD-11).
 */
export class DomainError extends Error {
  override readonly name = 'DomainError';
  constructor(
    readonly code: DomainErrorCode,
    readonly citations: [Citation, ...Citation[]],
  ) {
    super(code);
  }
}

/**
 * A programming error: an invariant breach, such as a module raising a code it does not own
 * (AD-11). It formats as `'Unexpected'` (HTTP 500); its message is for logs and never reaches
 * a body.
 */
export class UnexpectedError extends Error {
  override readonly name = 'Unexpected';
  readonly code = 'Unexpected';
}
