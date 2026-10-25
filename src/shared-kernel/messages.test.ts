import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { DOMAIN_ERRORS, type DomainErrorCode } from './codes.js';
import { MESSAGES } from './messages.generated.js';
import { MISSING_INPUT, renderMessage } from './messages.js';

const PASCAL = /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/;
const codes = [...(Object.keys(DOMAIN_ERRORS) as DomainErrorCode[]), 'Unexpected' as const];

describe('es-CO message catalog (contracts.md §13, AD-SYS-1 rule 6)', () => {
  it('has a template for every registry code and for Unexpected', () => {
    expect(codes.filter((c) => !MESSAGES[c]?.length)).toEqual([]);
    expect(MESSAGES.Unexpected).toBe('Algo falló de nuestro lado; no se aplicó ningún cambio.');
  });

  it('no template carries a PascalCase token', () => {
    expect(Object.entries(MESSAGES).filter(([, t]) => PASCAL.test(t))).toEqual([]);
  });

  it('a placeholder is only ever an id, an instant, a number, a field name or an enum value, never free text (decision log Impl-1 #11)', () => {
    const allowed = new Set([
      ...['orderId', 'itemRef', 'catalogEntryId', 'decidedBy', 'openOrderIds'], // ids
      ...['acquiredAt', 'at', 'confirmedAt', 'decidedAt', 'effectiveFrom', 'reapplyNotBefore', 'resolvedAt', 'retryAt', 'startedAt', 'submittedAt', 'today'], // instants
      ...['available', 'requested', 'round', 'threshold'], // numbers
      ...['field', 'fields', 'issue'], // input keys, and the parser's own es-CO copy
      ...['cause', 'status', 'latestApplicationStatus', 'latestState', 'reasonCode', 'turn'], // enum values
    ]);
    const freeText = Object.entries(MESSAGES).flatMap(([code, t]) => [...t.matchAll(/\{(\w+)\}/g)].filter(([, p]) => !allowed.has(p!)).map(([m]) => `${code} ${m}`));
    expect(freeText).toEqual([]);
  });

  it('the generated catalog matches contracts.md (generator --check)', () => {
    const r = spawnSync(process.execPath, ['scripts/gen-solu2-api.mjs', '--check'], { encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });
});

describe('renderMessage', () => {
  it('fills placeholders from the citation inputs', () => {
    expect(renderMessage('InsufficientQuantity', { requested: 3, available: 1 })).toBe('Pediste 3; quedan 1.');
    expect(renderMessage('RequestValidationFailed', { field: 'priceCop', issue: 'debe ser un número' })).toBe('Revisa priceCop: debe ser un número.');
  });

  it('a missing or null input still reads as a sentence, with no placeholder and no PascalCase left', () => {
    for (const code of codes) {
      const text = renderMessage(code, { probe: 1 });
      expect([code, text]).not.toEqual([code, expect.stringMatching(/[{}]/)]);
      expect([code, text]).not.toEqual([code, expect.stringMatching(PASCAL)]);
    }
    expect(renderMessage('InsufficientQuantity', { requested: null })).toBe(`Pediste ${MISSING_INPUT}; quedan ${MISSING_INPUT}.`);
  });

  it('booleans read as sí/no', () => {
    expect(renderMessage('InsufficientQuantity', { requested: true, available: false })).toBe('Pediste sí; quedan no.');
  });
});
