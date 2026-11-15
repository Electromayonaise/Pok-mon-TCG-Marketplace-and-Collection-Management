// MSG-2 Q1's pure composer (AD-MSG-1 rules 4–5, FR-MSG-2): price formatting, RFC 3986 encoding, the FR-MSG-2
// truncation order at grapheme boundaries, the maximal trade, and byte-identical output.
import { describe, expect, it } from 'vitest';
import { composeContactMessage, encodeRfc3986, formatCop, MAX_URL_LENGTH, waMeUrl, type ContactInput } from './domain/contact.js';

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
    // Decision log Impl-2 #9: this input fits without collapsing (the collapse has its own test below);
    // the former conditional assertion never ran.
    expect(m.truncationSteps).toEqual(['offeredItems']);
    expect(m.text).not.toMatch(/\+\d+ más/);
  });

  it('equal inputs give byte-identical outputs (AD-MSG-1 rule 4)', () => {
    const input = purchase({ productName: 'Pikachu ⚡️ '.repeat(80) });
    expect(new Set(Array.from({ length: 50 }, () => JSON.stringify(composeContactMessage(input)))).size).toBe(1);
  });

  it('NFC-normalizes every string, so a decomposed name renders composed', () => {
    expect(composeContactMessage(purchase({ productName: 'Pokémon'.normalize('NFD') })).text).toContain('Pokémon'.normalize('NFC'));
  });

  it('overflow: a 400-character seller name and heavy emoji graphemes still fit in 2,000, keeping the prices (decision log Impl-1 #34)', () => {
    const family = '👨‍👩‍👧‍👦';
    const m = composeContactMessage(purchase({ sellerName: 'ñ'.repeat(400), productName: family.repeat(40) }));
    expect(m.externalUrl.length).toBeLessThanOrEqual(MAX_URL_LENGTH);
    expect(m.truncationSteps).toEqual(['productName', 'overflow']);
    expect(decoded(m.externalUrl)).toBe(m.text);
    expect(m.text).toContain('$45.000 COP');
    expect(m.text).toContain('(NM)');
    expect(m.copyText).toContain('ñ'.repeat(400));
  });

  // Flow C backfill (decision log Impl-2 #8): the two truncation steps no earlier test forced.
  it('collapsedItems: 10 offered items that cannot fit even at 20 graphemes collapse into "+N más", keeping the first item, the cash and the price', () => {
    const family = '👨‍👩‍👧‍👦';
    const offeredItems = Array.from({ length: 10 }, (_, k) => ({ name: `${family.repeat(30)}${k}`, condition: 'NM', qty: 1 }));
    const m = composeContactMessage(purchase({ kind: 'trade', trade: { offeredItems, cashCop: 20_000n } }));
    expect(m.truncationSteps).toEqual(['offeredItems', 'collapsedItems']);
    expect(m.externalUrl.length).toBeLessThanOrEqual(MAX_URL_LENGTH);
    expect(m.text).toMatch(/1× (?:👨‍👩‍👧‍👦){20}… \(NM\), \+\d+ más y \$20\.000 COP/u);
    expect(m.text).toContain('$45.000 COP');
    expect(decoded(m.externalUrl)).toBe(m.text);
  });

  it('overflow with an offered item: the seller, product and item names shrink together below 20 until the URL fits; quantities and conditions stay', () => {
    const family = '👨‍👩‍👧‍👦';
    const m = composeContactMessage(purchase({
      kind: 'trade', sellerName: family.repeat(40), productName: family.repeat(40),
      trade: { offeredItems: [{ name: family.repeat(40), condition: 'LP', qty: 3 }], cashCop: 0n },
    }));
    expect(m.truncationSteps).toEqual(['productName', 'offeredItems', 'overflow']);
    expect(m.externalUrl.length).toBeLessThanOrEqual(MAX_URL_LENGTH);
    expect(m.text).toContain('3× ');
    expect(m.text).toContain('(LP)');
    expect(m.text).toContain('$45.000 COP');
    expect(m.copyText).toContain(family.repeat(40));
  });
});

describe('waMeUrl (MSG-2, AD-MSG-2)', () => {
  it('drops the + of the E.164 number and encodes the text as RFC 3986, so !, \', (, ) and * never pass raw', () => {
    expect(waMeUrl('+573001234567', "Hola! ¿(1)* 'x'")).toBe('https://wa.me/573001234567?text=Hola%21%20%C2%BF%281%29%2A%20%27x%27');
    expect(waMeUrl('573001234567', '')).toBe('https://wa.me/573001234567?text=');
  });
});
