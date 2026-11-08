// The shared Given steps of the ComServiceV2 integration tests (src/modules/commission/application/com.v2-*.test.ts),
// moved verbatim out of one 407-line file by the Impl-2 test review (HIGH-4). Call it once at the top of a test file.
import type { RequestTopUpRequest } from '../../src/modules/commission/index.js';
import { ComServiceV2 } from '../../src/modules/commission/index.js';
import { IdnServiceV2, VerServiceV2 } from '../../src/modules/identity/index.js';
import { useTestDatabase } from '../db.js';
import { business, commissionAccount, id, wiring } from '../solu2/fixtures.js';

export function useComSuite() {
  const db = useTestDatabase();

  /** COM composed as the composition root binds it: the real identity. */
  function commission() {
    const w = wiring(db);
    const idn = new IdnServiceV2(w);
    const ver = new VerServiceV2(w);
    return { w, com: new ComServiceV2({ ...w, identity: { getCapabilities: (i) => idn.getCapabilities(i), getBusinessName: (i) => ver.getBusinessName(i) } }) };
  }
  const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 1, 0xff, 0xd9]);
  const request = (o: Partial<RequestTopUpRequest> = {}): RequestTopUpRequest => ({ businessId: id('andres'), amountCop: 50_000, transferReference: 'REF-1', uploadKey: `topup-proof/${id('andres')}/p1`, ...o });
  async function shop(balance = 0): Promise<void> {
    await business(db, id('andres'), 'Approved');
    await commissionAccount(db, id('andres'), balance);
  }

  return { db, commission, JPEG, request, shop };
}
