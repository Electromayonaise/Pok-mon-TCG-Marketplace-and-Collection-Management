// claimRefusal (IDN-1 Q-fail): the code a refused seller-track claim raises, for every fact set
// the re-read in `tx` can return after the conditional update changed 0 rows.
import { describe, expect, it } from 'vitest';
import { claimRefusal } from './domain/idn.js';

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
