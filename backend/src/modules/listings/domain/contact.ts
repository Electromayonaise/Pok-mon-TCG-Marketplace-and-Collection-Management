// Core domain — MSG-2's contact-message composer (AD-MSG-1 rules 4–5, FR-MSG-1, FR-MSG-2). Pure (AD-SYS-6):
// equal inputs give byte-identical outputs, and nothing here reads the clock, the network or a database.

/** FR-MSG-2: the longest `externalUrl` the composer emits. */
export const MAX_URL_LENGTH = 2000;
/** FR-MSG-2: a truncated name keeps at least this many graphemes. */
const MIN_GRAPHEMES = 20;

export interface ContactInput {
  kind: 'purchase' | 'trade';
  sellerName: string;
  /** E.164 with its `+`; it reaches only `externalUrl` (AD-SYS-8 rules 3–4). */
  phoneE164: string;
  productName: string;
  /** null for a bundle, whose components carry their own conditions. */
  condition: string | null;
  priceCop: bigint;
  trade: { offeredItems: { name: string; condition: string; qty: number }[]; cashCop: bigint } | null;
}

export interface ContactMessage {
  text: string;
  externalUrl: string;
  copyText: string;
  truncationSteps: ('productName' | 'offeredItems' | 'collapsedItems' | 'overflow')[];
}

/** ADD-§2.7: `$45.000 COP`, dot thousands, from the exact integer (no float, NFR-COM-4). */
export function formatCop(amount: bigint): string {
  const digits = (amount < 0n ? -amount : amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${amount < 0n ? '-' : ''}$${digits} COP`;
}

/** RFC 3986 percent-encoding of UTF-8: `encodeURIComponent` plus the sub-delimiters it leaves bare. */
export function encodeRfc3986(text: string): string {
  return encodeURIComponent(text).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** AD-MSG-1 rule 5: `https://wa.me/<E.164 without +>?text=<encoded>`. */
export function waMeUrl(phoneE164: string, text: string): string {
  return `https://wa.me/${phoneE164.replace(/^\+/, '')}?text=${encodeRfc3986(text)}`;
}

const segmenter = new Intl.Segmenter('es', { granularity: 'grapheme' });
const graphemes = (s: string): string[] => Array.from(segmenter.segment(s), (g) => g.segment);
/** The first `n` graphemes and "…", or the name itself when it already fits in `n`. */
const shorten = (name: string[], n: number): string => (name.length <= n ? name.join('') : `${name.slice(0, n).join('')}…`);

interface Parts { seller: string; product: string; condition: string | null; price: string; items: string[]; more: number; cash: string | null }

/** The es-CO template (FR-MSG-1), filled with typed values; URL-like text stays plain text. */
function render(kind: ContactInput['kind'], p: Parts): string {
  const item = p.condition === null ? p.product : `${p.product} (${p.condition})`;
  if (kind === 'purchase') return `¡Hola ${p.seller}! Vi tu ${item} en TEZG por ${p.price}. ¿Todavía está disponible?`;
  const offered = [...p.items, ...(p.more > 0 ? [`+${p.more} más`] : [])].join(', ');
  const offer = [offered, p.cash].filter((s) => s !== null && s !== '').join(' y ');
  return `¡Hola ${p.seller}! Te propongo un intercambio por tu ${item}, publicado en TEZG por ${p.price}. Ofrezco ${offer}. ¿Te interesa?`;
}

/** The largest n in [lo, hi] for which `fits(n)` holds, or null; `fits` is monotone in n. */
function largestFitting(lo: number, hi: number, fits: (n: number) => boolean): number | null {
  if (!fits(lo)) return null;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid)) lo = mid; else hi = mid - 1;
  }
  return lo;
}

/**
 * MSG-2 Q1: NFC every string, fill the template, encode, and truncate in the FR-MSG-2 order until
 * `externalUrl.length ≤ 2000`: the product name down to 20 graphemes, then offered item names longest first
 * down to 20, then trailing items collapse into "+N más" (at least the first stays). Prices, cash, conditions,
 * quantities and the seller name are never truncated, and neither is `copyText`. If the minimums still do not fit, a
 * last `overflow` step cuts the seller name and then every name below 20 graphemes (decision log Impl-1 #34).
 */
export function composeContactMessage(input: ContactInput): ContactMessage {
  const nfc = (s: string) => s.normalize('NFC');
  const product = graphemes(nfc(input.productName));
  const items = (input.trade?.offeredItems ?? []).map((i) => ({ name: graphemes(nfc(i.name)), prefix: `${i.qty}× `, suffix: ` (${nfc(i.condition)})` }));
  const cash = input.trade && input.trade.cashCop > 0n ? formatCop(input.trade.cashCop) : null;
  const seller = graphemes(nfc(input.sellerName));
  const productLen = { n: product.length };
  const sellerLen = { n: seller.length };
  const itemLens = items.map((i) => i.name.length);
  let kept = items.length;
  const parts = (): Parts => ({
    seller: shorten(seller, sellerLen.n), product: shorten(product, productLen.n), condition: input.condition === null ? null : nfc(input.condition),
    price: formatCop(input.priceCop), items: items.slice(0, kept).map((i, k) => `${i.prefix}${shorten(i.name, itemLens[k]!)}${i.suffix}`),
    more: items.length - kept, cash,
  });
  const url = () => waMeUrl(input.phoneE164, render(input.kind, parts()));
  const fits = () => url().length <= MAX_URL_LENGTH;
  const copyText = render(input.kind, parts());
  const steps: ContactMessage['truncationSteps'] = [];

  if (!fits() && product.length > MIN_GRAPHEMES) {
    steps.push('productName');
    const full = product.length;
    productLen.n = largestFitting(MIN_GRAPHEMES, full - 1, (n) => { productLen.n = n; return fits(); }) ?? MIN_GRAPHEMES;
  }
  if (!fits()) {
    const longestFirst = items.map((i, k) => ({ k, len: i.name.length })).sort((a, b) => b.len - a.len || a.k - b.k);
    for (const { k, len } of longestFirst) {
      if (fits()) break;
      if (len <= MIN_GRAPHEMES) continue;
      if (!steps.includes('offeredItems')) steps.push('offeredItems');
      itemLens[k] = largestFitting(MIN_GRAPHEMES, len - 1, (n) => { itemLens[k] = n; return fits(); }) ?? MIN_GRAPHEMES;
    }
  }
  if (!fits() && items.length > 1) {
    steps.push('collapsedItems');
    kept = largestFitting(1, items.length - 1, (m) => { kept = m; return fits(); }) ?? 1;
  }
  if (!fits()) {
    // Decision log Impl-1 #34: when the FR-MSG-2 minimums cannot fit (a 400-character seller name, heavy emoji
    // graphemes), the seller name drops to 20 graphemes, then every name below 20 together, until I2 holds.
    // Prices, cash, conditions and quantities are still never cut, and copyText stays whole.
    steps.push('overflow');
    sellerLen.n = Math.min(sellerLen.n, MIN_GRAPHEMES);
    for (let n = MIN_GRAPHEMES - 1; !fits() && n >= 1; n--) {
      sellerLen.n = Math.min(sellerLen.n, n);
      productLen.n = Math.min(productLen.n, n);
      for (let k = 0; k < itemLens.length; k++) itemLens[k] = Math.min(itemLens[k]!, n);
    }
  }
  const text = render(input.kind, parts());
  return { text, externalUrl: waMeUrl(input.phoneE164, text), copyText, truncationSteps: steps };
}
