// Free-text fields a service stores (decision log Impl-1 #38, the cross-cutting trim item of Epics 3, 8, 9 and 11).
// Postgres TEXT refuses U+0000 (22021), so a NUL that passed a length check failed as 500; and a text of spaces
// passed a minimum of 1 or more. The value is stored as written: only the checks change.

/** The parser's es-CO issue for a text holding U+0000; it never repeats the value. */
export const NUL_ISSUE = 'no puede contener el carácter nulo';

/**
 * Why `value` cannot be stored in a field of `min`–`max` characters, or null when it can. Lengths count code
 * points, as the schema's `char_length` CHECKs do: the maximum as written, the minimum after trimming, so a
 * text of only spaces never reaches a minimum ≥ 1. A NUL is refused at any length.
 */
export function textIssue(value: string, min: number, max: number): 'nul' | 'length' | null {
  if (value.includes('\u0000')) return 'nul';
  const length = [...value].length;
  if (length > max) return 'length';
  if (min > 0 && [...value.trim()].length < min) return 'length';
  return null;
}
