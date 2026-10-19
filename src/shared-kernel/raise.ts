import { NotImplementedError } from './errors.js';
import type { CodeOwner, DomainErrorCode } from './codes.js';
import type { Citation } from './decision.js';

// AD-11, AD-SYS-1 rule 2: a DomainError is constructed only through the raiser of its owning
// module. The lint rule `tezg/error-owner` checks the file path statically; this runtime
// guard makes a non-owner raise fail in tests too (sys › [SYS-1.R2]). Interface stub.

export type Raise = (code: DomainErrorCode, citations: [Citation, ...Citation[]]) => never;

/**
 * The raiser a module's application service uses. Raising a code whose registry `owner` is
 * not `module` throws a programming error ('Unexpected', HTTP 500); a code raised by its
 * owner and caught by a neighbour propagates unchanged (AD-11).
 */
export function raiserFor(_module: CodeOwner): Raise {
  throw new NotImplementedError('shared-kernel.raiserFor');
}
