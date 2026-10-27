// The pure CAT core: ADD-§8.1 row validation (rules 1–5), the number sort key, the ADD-§2.1 USD →
// COP conversion, the Bogotá date, the CAT-2 attribute diff and the runs cursor.
import { describe, expect, it } from 'vitest';
import { bogotaDate, copFromUsd, decodeRunCursor, diffAttributes, encodeRunCursor, numberSort, validateRow, type RawFeedRow } from './domain/cat.js';

const NOW = '2026-10-01T15:00:00.000Z';
const row = (o: RawFeedRow = {}): RawFeedRow => ({ externalKey: 'sv1-025', setCode: 'SV1', number: '025', name: 'Pikachu', kind: 'card', eraCode: 'SV', ...o });
const check = (raw: RawFeedRow, rate: number | null = 400_000) => validateRow(raw, { knownSetCodes: new Set(['SV1']), now: NOW, copPerUsdCentavos: () => rate });

describe('validateRow (ADD-§8.1)', () => {
  it('accepts a complete row, with no price, and fills the optional fields with null', () => {
    expect(check(row())).toEqual({ ok: true, price: null, row: expect.objectContaining({ externalKey: 'sv1-025', pokemon: null, imageUrl: null }) });
  });

  it.each([
    ['MissingRequiredField', row({ name: '' })],
    ['MissingRequiredField', row({ kind: 'booster' })],
    ['UnknownSet', row({ setCode: 'XX9' })],
    ['BadNumberFormat', row({ number: 'twenty' })],
    ['InvalidPrice', row({ usdCents: -150 })],
    ['InvalidPrice', row({ usdCents: 12.5 })],
    ['InvalidPrice', row({ cop: '9.000' })],
    ['InvalidPrice', row({ cop: 9000, observedAt: 'ayer' })],
    ['CurrencyPairInconsistent', row({ usdCents: 1000, cop: 90_000 })],
  ] as const)('refuses %s', (reason, raw) => {
    expect(check(raw)).toEqual({ ok: false, reason });
  });

  it('accepts the numbering patterns of rule 3', () => {
    for (const number of ['025', '025/165', 'TG05', 'SWSH001', '12a']) expect(check(row({ number })).ok).toBe(true);
  });

  it('accepts a currency pair within ±1 peso, and keeps an unverifiable pair when no TRM is stored', () => {
    expect(check(row({ usdCents: 1000, cop: 40_001 }))).toMatchObject({ ok: true, price: { usdCents: 1000, cop: 40_001, observedAt: NOW } });
    expect(check(row({ usdCents: 1000, cop: 90_000 }), null).ok).toBe(true);
  });

  it("uses the row's own observedAt, normalized to ISO", () => {
    expect(check(row({ cop: 9000, observedAt: '2026-09-30T10:00:00Z' }))).toMatchObject({ price: { observedAt: '2026-09-30T10:00:00.000Z' } });
  });
});

describe('copFromUsd (ADD-§2.1)', () => {
  it('USD 12.34 at TRM 4,012.37 is COP 49,513', () => {
    expect(copFromUsd(1234, 401_237)).toBe(49_513);
  });
});

describe('numberSort, bogotaDate, diffAttributes', () => {
  it('reads the first run of digits', () => {
    expect([numberSort('025/165'), numberSort('TG05'), numberSort('SWSH001'), numberSort('promo')]).toEqual([25, 5, 1, 0]);
  });

  it('dates an instant in Bogotá (UTC−5)', () => {
    expect([bogotaDate('2026-10-01T04:59:59.000Z'), bogotaDate('2026-10-01T05:00:00.000Z')]).toEqual(['2026-09-30', '2026-10-01']);
  });

  it('names only the nine updatable attributes that differ', () => {
    expect(diffAttributes({ name: 'Pikachu', artist: null, kind: 'card' }, { name: 'Pikachu ex', artist: undefined, kind: 'sealedProduct' })).toEqual(['name']);
  });
});

describe('the runs cursor', () => {
  it('round-trips and refuses a foreign or malformed cursor', () => {
    const key = { startedAt: NOW, id: 'r00000000000000000000001' };
    expect(decodeRunCursor(encodeRunCursor(key))).toEqual(key);
    expect(decodeRunCursor(Buffer.from(JSON.stringify(['queue', NOW, key.id])).toString('base64url'))).toBeNull();
    expect(decodeRunCursor('not-a-cursor')).toBeNull();
  });
});
