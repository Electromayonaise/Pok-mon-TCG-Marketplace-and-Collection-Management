// Core domain — CAT. Pure (AD-SYS-6).
import { NotImplementedError } from '../../../shared-kernel/errors.js';

export type CatalogKind = 'card' | 'sealedProduct';
export type CopDerivation = 'sourceNative' | 'fxDerived';

/** ADD-§8.2 defect kinds plus KindChanged (GAP-4, decision log #12). */
export type QuarantineReason =
  | 'MissingRequiredField'
  | 'UnknownSet'
  | 'BadNumberFormat'
  | 'InvalidPrice'
  | 'CurrencyPairInconsistent'
  | 'KindChanged';

export interface RawFeedRow {
  [field: string]: string | number | null | undefined;
}

/** ADD-§8.1 rules 1–5, plus KindChanged when `storedKind` differs from the row's kind. */
export function validateRow(
  _row: RawFeedRow,
  _context: { knownSetCodes: ReadonlySet<string>; storedKind: CatalogKind | null },
): { ok: true } | { ok: false; reason: QuarantineReason } {
  throw new NotImplementedError('catalog.domain.validateRow');
}

/** Attribute names whose values differ between the stored entry and the row (AD-CAT-1 rule 3). */
export function diffAttributes(_stored: Record<string, unknown>, _incoming: Record<string, unknown>): string[] {
  throw new NotImplementedError('catalog.domain.diffAttributes');
}
