// E2E seed for the public seller profile (Story 13.5, decision log Impl-2 #18): Lucía, an individual seller with a
// complete profile, two visible reviews (5 and 4 stars, the older one edited) and one hidden 1-star review, which the
// profile must neither show nor count. Nobody signs in: the profile is public.
import type pg from 'pg';
import { fixedId, insertUser, removeAccounts, T0, withDb } from './db.js';

export const SELLER = { id: fixedId('e2elucia'), name: 'Lucía Coleccionista' };
/** An id that is no seller at all: its profile is the Not-available page. */
export const NOBODY = fixedId('e2enadie');
const REVIEWERS = [fixedId('e2erev1'), fixedId('e2erev2'), fixedId('e2etroll')];
const days = (n: number) => new Date(Date.parse(T0) - n * 86_400_000).toISOString();

/** The visible reviews, newest first, as the profile lists them. */
export const VISIBLE = [
  { id: fixedId('e2erevnew'), reviewerId: REVIEWERS[0]!, rating: 5, text: 'Muy puntual en el encuentro y las cartas tal cual las fotos.', createdAt: days(1), editedAt: null },
  { id: fixedId('e2erevold'), reviewerId: REVIEWERS[1]!, rating: 4, text: 'Buen trato; una carta tenía un borde gastado.', createdAt: days(5), editedAt: days(4) },
] as const;
export const HIDDEN_TEXT = 'Texto ofensivo que un administrador ocultó.';

async function clean(db: pg.Client): Promise<void> {
  await db.query(`DELETE FROM "ReviewModerationLog" WHERE "reviewId" IN (SELECT id FROM "Review" WHERE "targetUserId" = $1)`, [SELLER.id]);
  await db.query(`DELETE FROM "Review" WHERE "targetUserId" = $1`, [SELLER.id]);
  await db.query(`DELETE FROM "IndividualSellerProfile" WHERE "userId" = $1`, [SELLER.id]);
  await removeAccounts(db, [SELLER.id, ...REVIEWERS]);
}

export async function seedProfile(): Promise<void> {
  await withDb(async (db) => {
    await clean(db);
    await insertUser(db, { id: SELLER.id, name: 'lucia', email: 'lucia.e2e@tezg.test', sellerTrack: 'individual' });
    await db.query(
      `INSERT INTO "IndividualSellerProfile" ("userId", "displayName", "contactPhoneE164", "phoneSharingConsentAt", "phoneSharingConsentVersion", "meetingLat", "meetingLng", "meetingCity", "completedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, '+573001234567', $3, 'phone-v1', 4.711, -74.0721, 'Bogotá', $3, $3, $3)`,
      [SELLER.id, SELLER.name, T0],
    );
    for (const [i, reviewer] of REVIEWERS.entries()) await insertUser(db, { id: reviewer, name: `revisor${i}`, email: `revisor${i}.e2e@tezg.test` });
    const insert = `INSERT INTO "Review" (id, "reviewerId", "targetUserId", "targetKind", "purchaseVerified", rating, text, "hiddenAt", "hiddenReason", "hiddenBy", "editedAt", "createdAt", "updatedAt")
                    VALUES ($1, $2, $3, 'individual', false, $4, $5, $6, $7, $8, $9, $10, $10)`;
    for (const r of VISIBLE) await db.query(insert, [r.id, r.reviewerId, SELLER.id, r.rating, r.text, null, null, null, r.editedAt, r.createdAt]);
    // The newest review of all, hidden by moderation: were it counted, the average would read 3,3 and the count 3.
    await db.query(insert, [fixedId('e2erevhidden'), REVIEWERS[2]!, SELLER.id, 1, HIDDEN_TEXT, T0, 'Harassment', fixedId('e2eadmin'), null, T0]);
  });
}
