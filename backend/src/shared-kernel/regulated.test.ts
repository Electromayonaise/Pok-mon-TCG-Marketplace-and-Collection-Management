import { describe, expect, it } from 'vitest';
import { REDACTED, createLogger, redact } from './regulated.js';

describe('redact (AD-SYS-8 rule 3)', () => {
  it('replaces each regulated family, top-level and nested, and keeps every key', () => {
    const input = {
      orderId: 'ord1',
      legalIdentity: { nit: '999001234', legalName: 'x' },
      documentKeys: ['k1', 'k2'], documentKey: 'k', comprobanteKey: 'k', proofKey: 'k', uploadKey: 'k', quarantineKey: 'k',
      signedUrl: 'u', signedUploadUrl: 'u', token: 't',
      contactPhoneE164: '+573009912345', phone: 'p', phoneE164: 'p',
      body: 'b', messageBody: 'b',
      nested: { deeper: { phone: '+573009912345', listingId: 'lst1' } },
    };
    const out = redact(input);
    expect(Object.keys(out)).toEqual(Object.keys(input));
    expect(out).toEqual({
      orderId: 'ord1',
      legalIdentity: REDACTED,
      documentKeys: REDACTED, documentKey: REDACTED, comprobanteKey: REDACTED, proofKey: REDACTED, uploadKey: REDACTED, quarantineKey: REDACTED,
      signedUrl: REDACTED, signedUploadUrl: REDACTED, token: REDACTED,
      contactPhoneE164: REDACTED, phone: REDACTED, phoneE164: REDACTED,
      body: REDACTED, messageBody: REDACTED,
      nested: { deeper: { phone: REDACTED, listingId: 'lst1' } },
    });
  });

  it('walks arrays, with the index as a path segment', () => {
    expect(redact([{ rule: 'FR-MSG-2', inputs: { phone: 'p', listingId: 'l' } }])).toEqual([{ rule: 'FR-MSG-2', inputs: { phone: REDACTED, listingId: 'l' } }]);
    expect(redact({ messages: [{ body: 'b', at: 1 }] })).toEqual({ messages: [{ body: REDACTED, at: 1 }] });
  });

  it('keeps look-alike keys that are not regulated (the patterns are anchored)', () => {
    const input = { tokenCount: 3, phoneVerified: true, bodyHash: 'h', orderId: 'o', legalIdentityVerified: false };
    expect(redact(input)).toEqual(input);
  });

  it('never mutates its input', () => {
    const input = { phone: 'p', nested: { body: 'b' }, list: [{ token: 't' }] };
    const before = structuredClone(input);
    const out = redact(input);
    expect(input).toEqual(before);
    expect(out.nested).not.toBe(input.nested);
    expect(out.list).not.toBe(input.list);
  });

  it('passes primitives, null, undefined and Dates through', () => {
    const at = new Date(0);
    expect(redact('x')).toBe('x');
    expect(redact(3)).toBe(3);
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
    expect(redact(at)).toBe(at);
    expect(redact({ at, gone: undefined, none: null })).toEqual({ at, gone: undefined, none: null });
  });

  it('redacts what JSON.stringify would emit for class instances and toJSON objects (review M1)', () => {
    class Snapshot { constructor(readonly orderId: string, readonly phone: string) {} }
    const wrapped = { toJSON: () => ({ listingId: 'lst1', body: 'b' }) };
    expect(redact({ order: new Snapshot('ord1', '+573009912345'), wrapped })).toEqual({ order: { orderId: 'ord1', phone: REDACTED }, wrapped: { listingId: 'lst1', body: REDACTED } });
  });

  it('drops an Error whole: its own fields (a driver detail) can quote a value', () => {
    const driver = Object.assign(new Error('m'), { code: '23505', detail: 'Key (phone)=(+573009912345)' });
    expect(redact({ cause: driver, at: 1 })).toEqual({ cause: REDACTED, at: 1 });
  });

  it('survives a cycle without walking it forever', () => {
    const input: Record<string, unknown> = { phone: 'p' };
    input.self = input;
    const out = redact(input) as Record<string, unknown>;
    expect(out.phone).toBe(REDACTED);
    expect(out.self).toBe(REDACTED);
  });
});

describe('createLogger', () => {
  const capture = () => {
    const lines: string[] = [];
    return { lines, log: createLogger((line) => lines.push(line)) };
  };

  it('writes one JSON line per call, with level, msg and redacted data', () => {
    const { lines, log } = capture();
    log.info('orders.comprobante.attached', { orderId: 'ord1', comprobanteKey: 'k' });
    log.error('verification.submit.failed', { nested: { legalIdentity: { nit: '9' } } });
    expect(lines.map((l) => JSON.parse(l))).toEqual([
      { level: 'info', msg: 'orders.comprobante.attached', data: { orderId: 'ord1', comprobanteKey: REDACTED } },
      { level: 'error', msg: 'verification.submit.failed', data: { nested: { legalIdentity: REDACTED } } },
    ]);
    expect(lines.every((l) => !l.includes('\n'))).toBe(true);
  });

  it('omits data when there is none', () => {
    const { lines, log } = capture();
    log.info('shared-kernel.probe.ran');
    expect(JSON.parse(lines[0]!)).toEqual({ level: 'info', msg: 'shared-kernel.probe.ran' });
  });
});
