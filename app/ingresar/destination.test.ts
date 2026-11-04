// The `?siguiente=` rule of the sign-in form (Story 11.5; Impl-2 code review F1): a path on this site, else the inbox.
import { describe, expect, it } from 'vitest';
import { destination } from './destination.js';

const ORIGIN = 'https://tezg.co';

describe('destination after sign-in (?siguiente=)', () => {
  it('keeps a path on this site, with its query and fragment', () => {
    expect(destination('/coleccion/abc?pagina=2#x', ORIGIN)).toBe('/coleccion/abc?pagina=2#x');
    expect(destination('/coleccion', ORIGIN)).toBe('/coleccion');
    expect(destination('/', ORIGIN)).toBe('/');
  });

  it('refuses a tab, newline or carriage return the URL parser would strip (/\\t/evil.com → https://evil.com/)', () => {
    expect(destination('/\t/evil.com', ORIGIN)).toBe('/mensajes');
    expect(destination('/\n/evil.com', ORIGIN)).toBe('/mensajes');
    expect(destination('/\r\\evil.com', ORIGIN)).toBe('/mensajes');
    expect(destination('/coleccion /x', ORIGIN)).toBe('/mensajes');
  });

  it('refuses %09 once decoded, and keeps it on this site while still encoded', () => {
    expect(destination(decodeURIComponent('/%09/evil.com'), ORIGIN)).toBe('/mensajes');
    expect(destination('/%09/evil.com', ORIGIN)).toBe('/%09/evil.com');
  });

  it('refuses another host, a protocol-relative or backslash path, a script URL and an empty or missing value', () => {
    expect(destination('//evil.com', ORIGIN)).toBe('/mensajes');
    expect(destination('/\\evil.com', ORIGIN)).toBe('/mensajes');
    expect(destination('https://evil.com', ORIGIN)).toBe('/mensajes');
    expect(destination('javascript:alert(1)', ORIGIN)).toBe('/mensajes');
    expect(destination('', ORIGIN)).toBe('/mensajes');
    expect(destination(undefined, ORIGIN)).toBe('/mensajes');
  });

  it('refuses a NUL, a DEL and a C1 control character, which the parser would percent-encode and keep on this site', () => {
    for (const control of ['\u0000', '\u007f', '\u0085', '\u009f']) {
      expect(destination(`/${control}/coleccion`, ORIGIN)).toBe('/mensajes');
    }
  });

  it('keeps the path on an origin with a port and refuses the same host on another port', () => {
    expect(destination('/coleccion', 'http://localhost:3000')).toBe('/coleccion');
    expect(destination('http://localhost:3001/coleccion', 'http://localhost:3000')).toBe('/mensajes');
  });
});
