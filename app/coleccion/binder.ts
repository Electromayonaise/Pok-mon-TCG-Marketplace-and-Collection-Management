// What the binder pages share (page 9.1, Story 11.5): the sort keys of S-FR-COL-5 and their es-CO labels, the URL
// parameters (`?orden=`, `?pagina=`), the source badges (microcopy-es-CO.md §8) and the images' https-only rule (S-12).
import type { BinderEntryDTO, BinderSortKey } from '../../src/modules/collections/index.js';

export const SORT_OPTIONS: readonly { key: BinderSortKey; label: string }[] = [
  { key: 'manual', label: 'Manual' },
  { key: 'name', label: 'Nombre' },
  { key: 'setNumber', label: 'Set y número' },
  { key: 'acquiredAt', label: 'Fecha de adquisición' },
  { key: 'acquiredPriceCop', label: 'Precio pagado' },
];

const KNOWN = new Set<string>(SORT_OPTIONS.map((o) => o.key));

/** `?orden=name,acquiredAt`: up to 3 distinct known keys, in order; anything else falls back to the manual order. */
export function sortFromQuery(raw: string | string[] | undefined): BinderSortKey[] {
  const keys = [...new Set(((Array.isArray(raw) ? raw[0] : raw) ?? '').split(',').filter((k) => KNOWN.has(k)))].slice(0, 3) as BinderSortKey[];
  return keys.length > 0 ? keys : ['manual'];
}

/** `?pagina=2`: a whole page number of at least 1. */
export function pageFromQuery(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

/** The link's host, for the "Agregado por enlace · {dominio}" badge; the page never opens the link. */
function domainOf(url: string | null): string {
  if (url === null) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/** The source badge of a pocket (microcopy-es-CO.md §8): how the card got there, in words. */
export function sourceBadge(e: BinderEntryDTO): string {
  if (e.source === 'PlatformPurchase') return 'Comprado en TEZG';
  return e.cardKind === 'external' ? `Agregado por enlace · ${domainOf(e.externalUrl)}` : 'Agregado a mano';
}

/** S-12: only an https image is ever put in the page; the browser loads it, the server never fetches it. */
export const safeImage = (url: string | null): string | null => (url !== null && url.startsWith('https://') ? url : null);
