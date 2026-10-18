// Solu-1 ATDD — IDN contracts (docs/solu-1/planning/contracts.md §1). RED until implemented.
import { beforeEach, describe, expect, it } from 'vitest';
import { createIdnModule } from '../../../../src/modules/identity/index.js';
import { codeOf, race } from '../../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../../test-support/db.js';
import { caught, citedInputs, httpOf } from '../../../../test-support/errors.js';
import { id } from '../../../../test-support/ids.js';
import * as seed from '../../../../test-support/seed.js';
import { wiring, type Wiring } from '../../../../test-support/wiring.js';

const db = useTestDatabase();
let w: Wiring;
beforeEach(() => {
  w = wiring(db);
});
const ALL = ['User', 'IndividualSellerProfile', 'BusinessApplication', 'OutboxEvent'] as const;

describe('Solu-1 ATDD: IDN — requireListingEligibility (guard, FR-IDN-3)', () => {
  it('RED: an individual seller is allowed with listingKind=individual, verified=false, and nothing is written', async () => {
    // Given Valentina completed the individual-seller profile
    const valentina = await seed.individualSeller(db, 'valentina');
    const before = await db.counts(ALL);
    // When listings asks for her eligibility
    const result = await createIdnModule(w).requireListingEligibility({ userId: valentina });
    // Then
    expect(result).toEqual({ listingKind: 'individual', verified: false });
    expect(await db.counts(ALL)).toEqual(before);
  });

  it('RED: a Pending business is allowed unverified; an Approved one verified', async () => {
    const pending = await seed.business(db, 'andres', 'Pending');
    const approved = await seed.business(db, 'tiendapaisa', 'Approved');
    const idn = createIdnModule(w);
    expect(await idn.requireListingEligibility({ userId: pending })).toEqual({ listingKind: 'business', verified: false });
    expect(await idn.requireListingEligibility({ userId: approved })).toEqual({ listingKind: 'business', verified: true });
  });

  it('RED: a Rejected business gets SellerNotVerified (409) citing the reapply date, never IndividualSellerProfileIncomplete', async () => {
    const andres = await seed.business(db, 'andres', 'Rejected');
    const error = await caught(() => createIdnModule(w).requireListingEligibility({ userId: andres }));
    expect(codeOf(error)).toBe('SellerNotVerified');
    expect(httpOf(error)).toBe(409);
    expect(citedInputs(error)).toMatchObject({ applicationId: id('appandres'), reapplyNotBefore: '2026-10-08T15:00:00.000Z' });
  });

  it('RED: an account with no seller track gets IndividualSellerProfileIncomplete (409)', async () => {
    const camila = await seed.user(db, { id: id('camila') });
    const error = await caught(() => createIdnModule(w).requireListingEligibility({ userId: camila }));
    expect(codeOf(error)).toBe('IndividualSellerProfileIncomplete');
    expect(httpOf(error)).toBe(409);
    expect(citedInputs(error)).toEqual({ sellerKind: 'none' });
  });
});

describe('Solu-1 ATDD: IDN — claimSellerTrack (contended mutation, AD-IDN-2, AD-18)', () => {
  it('RED: a fresh account claims the individual track exactly once', async () => {
    const camila = await seed.user(db, { id: id('camila') });
    const result = await db.transactions.run((tx) => createIdnModule(w).claimSellerTrack(tx, { userId: camila, track: 'individual' }));
    expect(result).toEqual({ claimed: 'individual' });
    expect(await db.query(`SELECT "sellerTrack" FROM "User" WHERE id = $1`, [camila])).toEqual([{ sellerTrack: 'individual' }]);
  });

  it('RED: completing the profile twice throws IndividualSellerProfileAlreadyComplete (409) and changes nothing', async () => {
    const valentina = await seed.individualSeller(db, 'valentina');
    const before = await db.query(`SELECT * FROM "User" WHERE id = $1`, [valentina]);
    const error = await caught(() => db.transactions.run((tx) => createIdnModule(w).claimSellerTrack(tx, { userId: valentina, track: 'individual' })));
    expect(codeOf(error)).toBe('IndividualSellerProfileAlreadyComplete');
    expect(httpOf(error)).toBe(409);
    expect(await db.query(`SELECT * FROM "User" WHERE id = $1`, [valentina])).toEqual(before);
  });

  it('RED: a business claim by an individual seller is refused — no silent graduation', async () => {
    const valentina = await seed.individualSeller(db, 'valentina');
    const error = await caught(() => db.transactions.run((tx) => createIdnModule(w).claimSellerTrack(tx, { userId: valentina, track: 'business' })));
    expect(codeOf(error)).toBe('IndividualSellerProfileAlreadyComplete');
    expect(await db.query(`SELECT "sellerTrack" FROM "User" WHERE id = $1`, [valentina])).toEqual([{ sellerTrack: 'individual' }]);
  });

  it('RED: an individual claim by a business with a Pending application gets BusinessApplicationOnFile (409)', async () => {
    const andres = await seed.business(db, 'andres', 'Pending');
    const error = await caught(() => db.transactions.run((tx) => createIdnModule(w).claimSellerTrack(tx, { userId: andres, track: 'individual' })));
    expect(codeOf(error)).toBe('BusinessApplicationOnFile');
    expect(httpOf(error)).toBe(409);
  });

  it('RED (mandatory edge case NFR-IDN-2): simultaneous individual and business claims — exactly one wins, 100 times', async () => {
    for (let i = 0; i < 100; i++) {
      // Given a fresh account and both claims fired behind a barrier on two connections
      const uid = await seed.user(db, { id: id(`dual${i}`) });
      const outcome = await race(2, (n) =>
        db.transactions.run((tx) => createIdnModule(w).claimSellerTrack(tx, { userId: uid, track: n === 0 ? 'individual' : 'business' })),
      );
      // Then exactly one claim committed and the loser got an explained refusal
      expect(outcome.rejected.map(codeOf)).toHaveLength(1);
      expect(['IndividualSellerProfileAlreadyComplete', 'BusinessApplicationOnFile']).toContain(codeOf(outcome.rejected[0]));
      expect(outcome.fulfilled).toHaveLength(1);
      const [row] = await db.query<{ sellerTrack: string }>(`SELECT "sellerTrack" FROM "User" WHERE id = $1`, [uid]);
      expect(row?.sellerTrack).toBe(outcome.fulfilled[0]?.claimed);
    }
  });
});

describe('Solu-1 ATDD: IDN — getSellerVerification (resolver, FR-IDN-6)', () => {
  it('RED: returns the status of the latest application', async () => {
    const andres = await seed.business(db, 'andres', 'Approved');
    expect(await createIdnModule(w).getSellerVerification({ sellerId: andres })).toEqual({ status: 'Approved' });
  });

  it("RED: the latest application wins: a reapplication after a rejection reads 'Pending'", async () => {
    const andres = await seed.business(db, 'andres', 'Rejected');
    await seed.businessApplication(db, { id: id('appandres2'), businessId: andres, status: 'Pending', submittedAt: '2026-10-09T15:00:00.000Z' });
    expect(await createIdnModule(w).getSellerVerification({ sellerId: andres })).toEqual({ status: 'Pending' });
  });

  it("RED: an unknown seller resolves silently to 'none' with zero writes", async () => {
    const before = await db.counts(ALL);
    expect(await createIdnModule(w).getSellerVerification({ sellerId: id('nobody') })).toEqual({ status: 'none' });
    expect(await db.counts(ALL)).toEqual(before);
  });
});
