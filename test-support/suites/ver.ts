// The shared Given steps of the VerServiceV2 integration tests (src/modules/identity/application/ver.v2-*.test.ts),
// moved verbatim out of one 559-line file by the Impl-2 test review (HIGH-2). Call it once at the top of a test file.
import type { SubmitApplicationRequest } from '../../src/modules/identity/index.js';
import { VerServiceV2 } from '../../src/modules/identity/index.js';
import { useTestDatabase } from '../db.js';
import { wiring } from '../solu2/fixtures.js';

export function useVerSuite() {
  const db = useTestDatabase();
  const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);

  function setup() {
    const w = wiring(db);
    return { w, ver: new VerServiceV2(w) };
  }
  const keyOf = (businessId: string, name = 'doc1') => `business-document/${businessId}/${name}`;
  function application(businessId: string, o: Partial<SubmitApplicationRequest> = {}): SubmitApplicationRequest {
    return {
      businessId, businessName: 'Cartas Andrés', legalIdentity: { type: 'NIT', number: '9001234568' }, documentUploadKeys: [keyOf(businessId)],
      externalPresenceUrl: 'https://instagram.com/cartasandres', city: 'Medellín',
      paymentInstructions: { bankName: 'Bancolombia', accountType: 'savings', accountNumber: '12345678901', holderName: 'Andrés', qrUploadKey: null },
      consentAccepted: true, consentVersion: 'privacy-v1', ...o,
    };
  }
  const bucketKeys = (w: ReturnType<typeof wiring>, bucket: string) => [...w.storage.objects.keys()].filter((k) => k.startsWith(`${bucket}/`));

  return { db, PDF, setup, keyOf, application, bucketKeys };
}
