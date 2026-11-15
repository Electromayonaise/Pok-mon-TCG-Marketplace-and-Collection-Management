// rejectRequest (AD-SYS-1): a module's field-level refusal raised as the kernel's code.
import { describe, expect, it } from 'vitest';
import { DomainError } from './errors.js';
import { rejectRequest } from './request.js';

describe('rejectRequest (AD-SYS-1)', () => {
  it('raises RequestValidationFailed with one AD-SYS-1 citation per issue, in order', () => {
    let thrown: unknown;
    try {
      rejectRequest([{ field: 'legalIdentity.number', issue: 'no es válido' }, { field: 'consentVersion', issue: 'no es la versión vigente' }]);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(DomainError);
    expect(thrown).toMatchObject({
      code: 'RequestValidationFailed',
      citations: [
        { rule: 'AD-SYS-1', inputs: { field: 'legalIdentity.number', issue: 'no es válido' } },
        { rule: 'AD-SYS-1', inputs: { field: 'consentVersion', issue: 'no es la versión vigente' } },
      ],
    });
  });
});
