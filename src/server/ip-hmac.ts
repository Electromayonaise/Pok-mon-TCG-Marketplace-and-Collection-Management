// S-7 (ARCHITECTURE §14): a caller IP is stored only as HMAC-SHA256 keyed by `IP_HMAC_KEY`, never raw.
import { createHmac } from 'node:crypto';

/**
 * The request's IP as a 64-hex HMAC: the first `x-forwarded-for` hop (the platform's proxy sets it), else
 * `x-real-ip`; null when the request names no IP, so a limit keyed by IP is skipped rather than shared.
 */
export function requestIpHmac(key: string): (headers: Headers) => string | null {
  return (headers) => {
    const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim() || '';
    return ip === '' ? null : createHmac('sha256', key).update(ip).digest('hex');
  };
}
