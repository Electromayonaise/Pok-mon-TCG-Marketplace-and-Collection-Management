// claimRefusal (IDN-1 Q-fail): the code a refused seller-track claim raises, for every fact set
// the re-read in `tx` can return after the conditional update changed 0 rows.
// throttleRefusal (AD-IDN-3 rule 3; Story 2.6): which limit refuses an auth attempt, and until when.
import { describe, expect, it } from 'vitest';
import { AUTH_THROTTLE_LIMITS, claimRefusal, throttleRefusal } from './domain/idn.js';

describe('claimRefusal (IDN-1 Q-fail)', () => {
  it('an individual claim on a business account is AlreadyVerifiedBusiness when the latest application is Approved', () => {
    expect(claimRefusal('individual', { sellerTrack: 'business', latestApplicationStatus: 'Approved' })).toBe('AlreadyVerifiedBusiness');
  });

  it.each(['Pending', 'Rejected', null] as const)('an individual claim on a business account with latest application %s is BusinessApplicationOnFile', (latestApplicationStatus) => {
    expect(claimRefusal('individual', { sellerTrack: 'business', latestApplicationStatus })).toBe('BusinessApplicationOnFile');
  });

  it('an individual claim on an individual account is IndividualSellerProfileAlreadyComplete', () => {
    expect(claimRefusal('individual', { sellerTrack: 'individual', latestApplicationStatus: null })).toBe('IndividualSellerProfileAlreadyComplete');
  });

  it('a business claim refused is always IndividualSellerProfileAlreadyComplete', () => {
    expect(claimRefusal('business', { sellerTrack: 'individual', latestApplicationStatus: null })).toBe('IndividualSellerProfileAlreadyComplete');
  });

  it.each(['individual', 'business'] as const)('a %s claim refused on an account with no track has no refusal code (P2 breach)', (track) => {
    expect(claimRefusal(track, { sellerTrack: null, latestApplicationStatus: null })).toBeNull();
  });
});

describe('throttleRefusal (AD-IDN-3 rule 3, Story 2.6)', () => {
  const [account, ip] = AUTH_THROTTLE_LIMITS.signInFail as readonly [(typeof AUTH_THROTTLE_LIMITS.signInFail)[number], (typeof AUTH_THROTTLE_LIMITS.signInFail)[number]];

  it('the limits are 10 failed sign-ins per account and 30 per IP in 15 minutes, and 5 sign-ups per IP in an hour', () => {
    expect(AUTH_THROTTLE_LIMITS).toEqual({
      signInFail: [{ key: 'account', limit: 10, windowMs: 900_000 }, { key: 'ip', limit: 30, windowMs: 900_000 }],
      signUp: [{ key: 'ip', limit: 5, windowMs: 3_600_000 }],
    });
  });

  it('no limit with a cutoff in its window refuses nothing; a tripped one retries once its cutoff row leaves the window', () => {
    expect(throttleRefusal([{ limit: account, cutoff: null }, { limit: ip, cutoff: null }])).toBeNull();
    expect(throttleRefusal([])).toBeNull();
    expect(throttleRefusal([{ limit: account, cutoff: '2026-10-01T14:50:00.000Z' }, { limit: ip, cutoff: null }]))
      .toEqual({ limit: account, retryAt: '2026-10-01T15:05:00.000Z' });
  });

  it('with both limits tripped the latest retryAt wins, whichever is listed first', () => {
    const checks = [{ limit: account, cutoff: '2026-10-01T14:50:00.000Z' }, { limit: ip, cutoff: '2026-10-01T14:55:00.000Z' }];
    expect(throttleRefusal(checks)).toEqual({ limit: ip, retryAt: '2026-10-01T15:10:00.000Z' });
    expect(throttleRefusal([...checks].reverse())).toEqual({ limit: ip, retryAt: '2026-10-01T15:10:00.000Z' });
  });
});
