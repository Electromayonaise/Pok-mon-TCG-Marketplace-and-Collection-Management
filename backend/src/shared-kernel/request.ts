import type { Citation } from './decision.js';
import { raiserFor } from './raise.js';

// AD-SYS-1, contracts.md §0.3: `RequestValidationFailed` is the kernel's code. A module whose
// contract checks a field beyond the parser (VER-2 P2, the NIT check digit) refuses through this
// helper, so the `error-owner` rule and the runtime guard still see the kernel as the raiser.

const raise = raiserFor('shared-kernel');

/** One field-level issue; `issue` is the parser's own es-CO copy, never the field's value. */
export interface RequestIssue {
  field: string;
  issue: string;
}

/** Raises `RequestValidationFailed` (400) with one `AD-SYS-1` citation per issue, in order. */
export function rejectRequest(issues: [RequestIssue, ...RequestIssue[]]): never {
  const citations = issues.map(({ field, issue }): Citation => ({ rule: 'AD-SYS-1', inputs: { field, issue } }));
  return raise('RequestValidationFailed', citations as [Citation, ...Citation[]]);
}
