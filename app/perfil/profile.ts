// The seller profile's display rules (page 11.2, microcopy-es-CO.md §9; Story 13.5). The server returns the average as
// integer tenths (ADD-§2.9): the page only inserts the decimal comma, and never sums or divides a rating.

/** "4,3" from 43 tenths. */
export function averageLabel(tenths: number): string {
  return `${Math.trunc(tenths / 10)},${tenths % 10}`;
}

/** Five glyphs, `round(average)` of them filled; the text beside them is the accessible name. */
export function stars(filled: number): string {
  const n = Math.min(5, Math.max(0, filled));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

/** The filled stars of an average in tenths: half up, as the average itself. */
export const starsOfTenths = (tenths: number): string => stars(Math.floor((tenths + 5) / 10));

/** "1 reseña" / "12 reseñas". */
export const countLabel = (count: number): string => `${count} ${count === 1 ? 'reseña' : 'reseñas'}`;

/** The provenance label beside the average (FR-REP-3): business reviews come from verified purchases. */
export const provenanceLabel = (kind: 'business' | 'individual'): string =>
  kind === 'business' ? 'De compras verificadas' : 'Las reseñas no están ligadas a compras';

const DAY = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' });

/** A review's date in Bogotá, "9 oct 2026" (the page spec's form, without the "de" of the locale's long form). */
export function reviewDate(iso: string): string {
  const parts = DAY.formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')} ${part('month').replace(/\./g, '')} ${part('year')}`;
}

/** `?pagina=` as a page number of 1–1,000; anything else is the first page. */
export function profilePage(value: string | string[] | undefined): number {
  const n = typeof value === 'string' && /^\d{1,4}$/.test(value) ? Number(value) : 1;
  return n >= 1 && n <= 1_000 ? n : 1;
}
