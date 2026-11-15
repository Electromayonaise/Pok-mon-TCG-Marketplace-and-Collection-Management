// S-7 and decision log Impl-1 #34: which header names the caller, and one spelling per address.
import { describe, expect, it } from 'vitest';
import { callerIp, requestIpHmac } from './ip-hmac.js';

const h = (o: Record<string, string>) => new Headers(o);

describe('callerIp', () => {
  it('prefers x-real-ip, else the rightmost x-forwarded-for hop, never the client-supplied leftmost one', () => {
    expect(callerIp(h({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '1.1.1.1, 203.0.113.8' }))).toBe('203.0.113.7');
    expect(callerIp(h({ 'x-forwarded-for': 'spoofed, 1.1.1.1 , 203.0.113.8 ' }))).toBe('203.0.113.8');
    expect(callerIp(h({}))).toBeNull();
  });

  it('normalizes a port, brackets, IPv6 case and an IPv4-mapped address', () => {
    expect(callerIp(h({ 'x-real-ip': '203.0.113.7:5678' }))).toBe('203.0.113.7');
    expect(callerIp(h({ 'x-real-ip': '[2001:DB8::1]:443' }))).toBe('2001:db8::1');
    expect(callerIp(h({ 'x-real-ip': '::FFFF:203.0.113.7' }))).toBe('203.0.113.7');
  });
});

describe('requestIpHmac', () => {
  it('is a 64-hex HMAC, equal for two spellings of one address, and null with no IP', () => {
    const of = requestIpHmac('k'.repeat(32));
    expect(of(h({ 'x-real-ip': '203.0.113.7' }))).toMatch(/^[0-9a-f]{64}$/);
    expect(of(h({ 'x-real-ip': '203.0.113.7' }))).toBe(of(h({ 'x-forwarded-for': '::ffff:203.0.113.7' })));
    expect(of(h({}))).toBeNull();
  });
});
