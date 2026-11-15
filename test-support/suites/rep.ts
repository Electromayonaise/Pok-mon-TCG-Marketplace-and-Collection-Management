// The shared Given steps of the REP ATDD files (`atdd/rep_contracts.test.ts`, `atdd/rep_reads.test.ts`), moved verbatim
// out of one 324-line file by the Impl-2 test review (HIGH-6). Call it once at the top of a test file.
import type { OrderStatus } from '../../src/modules/orders/index.js';
import type { IdentityForRep, OrdersForRep, WriteReviewRequest } from '../../src/modules/reviews/index.js';
import { RepServiceV2 } from '../../src/modules/reviews/index.js';
import { useTestDatabase } from '../db.js';
import { admin, fake, id, user, wiring } from '../solu2/fixtures.js';

export type Kind = 'business' | 'individual' | 'none';

export function useRepSuite() {
  const db = useTestDatabase();

  /** Targets by user id; closed purchases keyed `${buyer}>${business}` with the latest order state. */
  function setup(o: { targets?: Readonly<Record<string, Kind>>; purchases?: Record<string, OrderStatus>; targetCalls?: string[] } = {}) {
    const identity = fake<IdentityForRep>('identity', {
      getReviewTarget: async ({ userId }) => { o.targetCalls?.push(userId); const kind = o.targets?.[userId] ?? 'none'; return { kind, verified: kind !== 'none' }; },
      getDisplayNames: async ({ userIds }) => ({ names: userIds.map((u) => ({ userId: u, displayName: `Usuario ${u.slice(0, 4)}` })) }),
    });
    const orders = fake<OrdersForRep>('orders', {
      hasClosedPurchase: async ({ buyerId, businessId }) => { const s = o.purchases?.[`${buyerId}>${businessId}`] ?? null; return { closed: s === 'Closed', latestState: s }; },
    });
    const w = wiring(db);
    return { w, rep: new RepServiceV2({ ...w, identity, orders }) };
  }
  async function people(): Promise<void> {
    await user(db, { id: id('valentina') });
    await user(db, { id: id('tienda'), sellerTrack: 'business' });
    await user(db, { id: id('julian'), sellerTrack: 'individual' });
    await admin(db);
  }
  /** Frozen: a test that needs more targets copies it (review R-6). */
  const targets: Readonly<Record<string, Kind>> = Object.freeze({ [id('tienda')]: 'business', [id('julian')]: 'individual' });
  /** A writeReview request: valentina rates the business 5 unless the test says otherwise. */
  const write = (o: Partial<WriteReviewRequest> = {}): WriteReviewRequest => ({ reviewerId: id('valentina'), targetUserId: id('tienda'), rating: 5, text: 'Excelente vendedor.', ...o });
  const hide = (reviewId: string, o: { reasonCode?: 'Spam' | 'Other' | 'Harassment'; note?: string | null; adminId?: string } = {}) =>
    ({ reviewId, reasonCode: o.reasonCode ?? 'Spam', note: o.note ?? null, adminId: o.adminId ?? id('admin') });

  return { db, setup, people, targets, write, hide };
}
