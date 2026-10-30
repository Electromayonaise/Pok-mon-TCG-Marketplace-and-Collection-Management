// MSG-2 Q1's pure composer (AD-MSG-1 rules 4–5, FR-MSG-2): price formatting, RFC 3986 encoding, the FR-MSG-2
// truncation order at grapheme boundaries, the maximal trade, and byte-identical output.
import { describe, expect, it } from 'vitest';
import { composeContactMessage, encodeRfc3986, formatCop, MAX_URL_LENGTH, type ContactInput } from './domain/contact.js';

const purchase = (o: Partial<ContactInput> = {}): ContactInput => ({
  kind: 'purchase', sellerName: 'Valentina', phoneE164: '+573001234567', productName: 'Charizard ex', condition: 'NM', priceCop: 45_000n, trade: null, ...o,
});
const decoded = (url: string) => decodeURIComponent(url.slice(url.indexOf('?text=') + 6));

describe('formatCop / encodeRfc3986', () => {
  it('formats exact integers with dot thousands', () => {
    expect(formatCop(1_000n)).toBe('$1.000 COP');
    expect(formatCop(100_000_000n)).toBe('$100.000.000 COP');
    expect(formatCop(999n)).toBe('$999 COP');
  });

  it('encodes the sub-delimiters encodeURIComponent leaves bare', () => {
    expect(encodeRfc3986("¡Hola! (NM) 'x' *")).toBe('%C2%A1Hola%21%20%28NM%29%20%27x%27%20%2A');
  });
});

describe('composeContactMessage (MSG-2 Q1)', () => {
  it('fills the es-CO purchase template; the URL decodes to the text, and copyText equals it when nothing is cut', () => {
    const m = composeContactMessage(purchase());
    expect(m.text).toBe('¡Hola Valentina! Vi tu Charizard ex (NM) en TEZG por $45.000 COP. ¿Todavía está disponible?');
    expect(m.externalUrl.startsWith('https://wa.me/573001234567?text=')).toBe(true);
    expect(decoded(m.externalUrl)).toBe(m.text);
    expect(m).toMatchObject({ copyText: m.text, truncationSteps: [] });
  });

  it('a bundle names its title with no condition', () => {
    expect(composeContactMessage(purchase({ productName: 'Lote Kanto', condition: null })).text).toContain('Vi tu Lote Kanto en TEZG por');
  });

  it('cuts the product name at a grapheme boundary, never below 20 graphemes, and keeps the full copyText', () => {
    const name = '🔥'.repeat(400);
    const m = composeContactMessage(purchase({ productName: name }));
    expect(m.externalUrl.length).toBeLessThanOrEqual(MAX_URL_LENGTH);
    expect(m.truncationSteps).toEqual(['productName']);
    expect(decoded(m.externalUrl)).toBe(m.text);
    expect(m.text).toMatch(/(🔥){20,}…/u);
    expect(m.copyText).toContain(name);
    expect(m.text).toContain('$45.000 COP');
  });

  it('the maximal trade (10 offered items of 200 characters, plus cash) fits, keeping the cash and every condition; copyText lists all 10 in full', () => {
    const offeredItems = Array.from({ length: 10 }, (_, k) => ({ name: `${'Ñ'.repeat(199)}${k}`, condition: k % 2 ? 'LP' : 'NM', qty: k + 1 }));
    const m = composeContactMessage(purchase({ kind: 'trade', trade: { offeredItems, cashCop: 20_000n } }));
    expect(m.externalUrl.length).toBeLessThanOrEqual(MAX_URL_LENGTH);
    expect(m.text).toContain('$20.000 COP');
    expect(m.text).toContain('$45.000 COP');
    expect(m.text).toMatch(/1× Ñ+… \(NM\)/u);
    expect(m.truncationSteps).toContain('offeredItems');
    for (const item of offeredItems) expect(m.copyText).toContain(`${item.qty}× ${item.name} (${item.condition})`);
    if (m.truncationSteps.includes('collapsedItems')) expect(m.text).toMatch(/\+\d+ más/);
  });

  it('equal inputs give byte-identical outputs (AD-MSG-1 rule 4)', () => {
    const input = purchase({ productName: 'Pikachu ⚡️ '.repeat(80) });
    expect(new Set(Array.from({ length: 50 }, () => JSON.stringify(composeContactMessage(input)))).size).toBe(1);
  });

  it('NFC-normalizes every string, so a decomposed name renders composed', () => {
    expect(composeContactMessage(purchase({ productName: 'Pokémon'.normalize('NFD') })).text).toContain('Pokémon'.normalize('NFC'));
  });
});
