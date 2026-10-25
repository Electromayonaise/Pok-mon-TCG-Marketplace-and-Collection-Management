import { DomainError, UnexpectedError } from './errors.js';
import { DOMAIN_ERRORS, type CodeOwner, type DomainErrorCode } from './codes.js';
import type { Citation } from './decision.js';

// AD-11, AD-SYS-1 rule 2: a DomainError is constructed only through the raiser of its owning
// module. The lint rule `tezg/error-owner` checks the file path statically; this runtime
// guard makes a non-owner raise fail in tests too (sys › [SYS-1.R2]).

export type Raise = (code: DomainErrorCode, citations: [Citation, ...Citation[]]) => never;

/**
 * The raiser a module's application service uses. Raising a code whose registry `owner` is
 * not `module` throws a programming error ('Unexpected', HTTP 500); a code raised by its
 * owner and caught by a neighbour propagates unchanged (AD-11).
 */
export function raiserFor(module: CodeOwner): Raise {
  return (code, citations) => {
    const owner = DOMAIN_ERRORS[code].owner;
    if (owner !== module) throw new UnexpectedError(`${module} raised ${code}, which ${owner} owns`);
    throw new DomainError(code, citations);
  };
}
