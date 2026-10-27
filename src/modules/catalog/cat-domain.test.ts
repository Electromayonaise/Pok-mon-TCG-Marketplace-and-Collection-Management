// The pure CAT core: ADD-§8.1 row validation (rules 1–5), the number sort key, the ADD-§2.1 USD →
// COP conversion, the Bogotá date, the CAT-2 attribute diff and the runs cursor; the ADD-§2.2
// change percentage, the FR-CAT-7 staleness boundary and the ADD-§6 TRM parse.
import { describe, expect, it } from 'vitest';
import { bogotaDate, changePercent, copFromUsd, isStale, parseTrm, decodeQuarantineCursor, decodeRunCursor, encodeQuarantineCursor, diffAttributes, encodeRunCursor, numberSort, validateRow, type RawFeedRow } from './domain/cat.js';

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

describe('the quarantine cursor', () => {
  it('round-trips and carries its run', () => {
    const key = { runId: 'r00000000000000000000001', rowNumber: 50 };
    expect(decodeQuarantineCursor(encodeQuarantineCursor(key))).toEqual(key);
    expect(decodeQuarantineCursor(encodeRunCursor({ startedAt: NOW, id: key.runId }))).toBeNull();
  });
});

describe('changePercent (ADD-§2.2)', () => {
  it.each([[40_000, 45_000, 1250], [30_000, 29_999, 0], [3, 4, 3333], [3, 2, -3333], [8, 7, -1250], [0, 5, null], [null, 5, null]] as const)(
    'base %s, now %s → %s hundredths', (base, now, expected) => {
      expect(changePercent(base, now)).toBe(expected);
    });

  it('rounds half away from zero on both signs', () => {
    expect([changePercent(20_000, 20_001), changePercent(20_000, 19_999), changePercent(200_000, 200_001)]).toEqual([1, -1, 0]);
  });
});

describe('isStale (FR-CAT-7)', () => {
  it('is stale strictly past 36 h', () => {
    expect(isStale('2026-09-30T03:00:00.000Z', NOW, 36)).toBe(false);
    expect(isStale('2026-09-30T02:59:59.999Z', NOW, 36)).toBe(true);
  });
});

describe('parseTrm (ADD-§6)', () => {
  it.each([['4012.37', 401_237], ['4012.3', 401_230], ['4012', 401_200], ['4012.375', 401_238], ['4012.374', 401_237], [' 4123.37 ', 412_337]] as const)(
    '%s is %i centavos', (valor, centavos) => {
      expect(parseTrm(valor)).toBe(centavos);
    });

  it('refuses anything that is not a positive decimal', () => {
    for (const valor of ['', '4.012,37', '-4012', '0', 'abc', '4012.']) expect(parseTrm(valor)).toBeNull();
  });
});
