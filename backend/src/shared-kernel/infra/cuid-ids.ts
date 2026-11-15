// Driven adapter — the production IdGenerator: cuid2 at 24 characters, which always starts with
// a lowercase letter, so every id matches `CUID_PATTERN` and the schema's `tezg_is_cuid` check.
// Tests bind `SequentialIds` (test-support/ids.ts) instead.
import { init } from '@paralleldrive/cuid2';
import type { IdGenerator } from '../ports.js';
import type { CuidId } from '../types.js';

export class CuidIds implements IdGenerator {
  private readonly create = init({ length: 24 });

  next(): CuidId {
    return this.create();
  }
}
