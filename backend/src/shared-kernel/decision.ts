import type { IsoInstant } from './types.js';

// AD-SYS-1 rule 3: the one explainable-decision shape.

export type DecisionOutcome =
  | 'allowed'
  | 'allowedWithNotice'
  | 'rejected'
  | 'paused'
  | 'unverified'
  | 'withdrawn'
  | 'hidden'
  | 'stale'
  | 'excluded'
  | 'ranked'
  | 'notValued'
  | 'unfulfillable';

/** AD-SYS-1 rule 5: citation inputs are primitives that pass the regulated-field filter. */
export type CitationValue = string | number | boolean | null;

export interface Citation {
  /** An FR, AD or named policy clause, e.g. `FR-INV-3`, `AD-COM-2`. */
  rule: string;
  inputs: Record<string, CitationValue>;
}

export interface Decision {
  outcome: DecisionOutcome;
  /** A key of the code registry (`codes.ts`). */
  reasonCode: string;
  /** es-CO text rendered server-side from `messages/es-CO/<code>.ts`. */
  humanMessage: string;
  /** Length ≥ 1. */
  citations: [Citation, ...Citation[]];
  occurredAt: IsoInstant;
}
