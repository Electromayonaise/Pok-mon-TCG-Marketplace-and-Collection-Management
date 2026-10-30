// S-7 (ARCHITECTURE §14): a caller IP is stored only as HMAC-SHA256 keyed by `IP_HMAC_KEY`, never raw.
import { createHmac } from 'node:crypto';

/**
 * The caller IP the platform vouches for (decision log Impl-1 #34): `x-real-ip`, which the hosting proxy sets and
 * overwrites, else the rightmost `x-forwarded-for` hop, the one our own proxy appended (the leftmost is whatever the
 * client sent). Null when the request names neither, so a limit keyed by IP is skipped rather than shared.
 */
export function callerIp(headers: Headers): string | null {
  const ip = headers.get('x-real-ip')?.trim() || headers.get('x-forwarded-for')?.split(',').map((hop) => hop.trim()).filter(Boolean).at(-1) || '';
  return ip === '' ? null : normalizeIp(ip);
}

/** One spelling per address: no port, no brackets, lower-case IPv6, and an IPv4-mapped IPv6 as its IPv4. */
function normalizeIp(raw: string): string {
  let ip = raw;
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(ip);
  if (bracketed) ip = bracketed[1]!;
  else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(':'));
  ip = ip.toLowerCase();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
  return mapped ? mapped[1]! : ip;
}

/** The request's caller IP as a 64-hex HMAC under `key`, or null. */
export function requestIpHmac(key: string): (headers: Headers) => string | null {
  return (headers) => {
    const ip = callerIp(headers);
    return ip === null ? null : createHmac('sha256', key).update(ip).digest('hex');
  };
}
