// GREEN suite: every physically enforced invariant of docs/solu-1/planning/schemas/README.md
// (P-1..P-25) is refused by PostgreSQL itself. Each test names the constraint it relies on,
// so removing that constraint from a migration turns exactly that test red.
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../../../../test-support/db.js';
import { id } from '../../../../test-support/ids.js';
import * as seed from '../../../../test-support/seed.js';

const db = useTestDatabase();
const T0 = '2026-10-01T15:00:00.000Z';

describe('P-1 seller-track exclusivity (AD-IDN-2, AD-18)', () => {
  it('refuses a business application for an individual-track user', async () => {
    const valentina = await seed.individualSeller(db, 'valentina');
    await expect(
      seed.businessApplication(db, { id: id('appvalentina'), businessId: valentina, status: 'Pending' }),
    ).rejects.toThrow(/business_application_user_track_fk/);
  });

  it('refuses moving the track away while the individual profile exists', async () => {
    const valentina = await seed.individualSeller(db, 'valentina');
    await expect(db.query(`UPDATE "User" SET "sellerTrack" = 'business' WHERE id = $1`, [valentina])).rejects.toThrow(
      /individual_profile_user_track_fk/,
    );
  });

  it('refuses a business profile for an individual-track user (review E-02)', async () => {
    const valentina = await seed.individualSeller(db, 'valentina');
    await expect(seed.businessProfile(db, valentina)).rejects.toThrow(/business_profile_user_track_fk/);
  });
});

describe('P-2 / P-3 business application states (AD-VER-1, AD-VER-3)', () => {
  it('refuses a second Pending application for one business', async () => {
    const andres = await seed.business(db, 'andres', 'Pending');
    await expect(seed.businessApplication(db, { id: id('appandres2'), businessId: andres, status: 'Pending' })).rejects.toThrow(
      /business_application_one_pending/,
    );
  });

  it('refuses a decided application without a decision instant', async () => {
    const andres = await seed.business(db, 'andres', 'Pending');
    await expect(db.query(`UPDATE "BusinessApplication" SET status = 'Approved', "decidedBy" = $2 WHERE "businessId" = $1`, [andres, id('sebastian')])).rejects.toThrow(
      /business_application_pending_iff_undecided/,
    );
  });

  it('refuses a rejection without its policy snapshot', async () => {
    const andres = await seed.business(db, 'andres', 'Pending');
    await seed.rejectionReason(db, { code: 'DataMismatch' });
    await expect(
      db.query(
        `UPDATE "BusinessApplication" SET status = 'Rejected', "decidedBy" = $2, "decidedAt" = $3, "rejectionReasonCode" = 'DataMismatch' WHERE "businessId" = $1`,
        [andres, id('sebastian'), T0],
      ),
    ).rejects.toThrow(/business_application_rejection_snapshot/);
  });
});

describe('P-4 / P-5 catalog (AD-CAT-1)', () => {
  it('refuses a second Running feed run', async () => {
    await seed.feedRun(db, { id: id('runone'), status: 'Running' });
    await expect(seed.feedRun(db, { id: id('runtwo'), status: 'Running' })).rejects.toThrow(/feed_run_single_running/);
  });

  it('refuses a second catalog entry with the same externalKey', async () => {
    const setId = await seed.catalogSet(db);
    await seed.catalogEntry(db, { id: id('pikachu'), setId, externalKey: 'sv1-025' });
    await expect(seed.catalogEntry(db, { id: id('pikachu2'), setId, externalKey: 'sv1-025' })).rejects.toThrow(/CatalogEntry_externalKey_key/);
  });
});

describe('P-6 / P-22 inventory (AD-6, AD-INV-1)', () => {
  it('refuses a stock decrement below zero', async () => {
    const andres = await seed.business(db, 'andres');
    const setId = await seed.catalogSet(db);
    const card = await seed.catalogEntry(db, { id: id('pikachu'), setId });
    const unit = await seed.inventoryUnit(db, { id: id('unitone'), sellerId: andres, catalogEntryId: card, quantity: 1 });
    await expect(db.query(`UPDATE "InventoryUnit" SET quantity = quantity - 2 WHERE id = $1`, [unit])).rejects.toThrow(/InventoryUnit_quantity_check/);
  });

  it("refuses a listing over another seller's unit (review E-05)", async () => {
    const andres = await seed.business(db, 'andres');
    const valentina = await seed.individualSeller(db, 'valentina');
    const setId = await seed.catalogSet(db);
    const card = await seed.catalogEntry(db, { id: id('pikachu'), setId });
    const unit = await seed.inventoryUnit(db, { id: id('unitandres'), sellerId: andres, catalogEntryId: card, quantity: 1 });
    await expect(
      seed.listing(db, { id: id('listingsteal'), sellerId: valentina, sellerKind: 'individual', inventoryUnitId: unit }),
    ).rejects.toThrow(/listing_unit_same_seller/);
  });

  it('refuses a bundle component whose copied attributes differ from its unit (review E-06)', async () => {
    const andres = await seed.business(db, 'andres');
    const setId = await seed.catalogSet(db);
    const card = await seed.catalogEntry(db, { id: id('pikachu'), setId });
    const unit = await seed.inventoryUnit(db, { id: id('unitandres'), sellerId: andres, catalogEntryId: card, condition: 'NM', quantity: 3 });
    const bundle = await seed.listing(db, { id: id('bundle'), sellerId: andres, sellerKind: 'business', kind: 'bundle' });
    await expect(
      seed.bundleComponent(db, { listingId: bundle, inventoryUnitId: unit, sellerId: andres, catalogEntryId: card, condition: 'LP' }),
    ).rejects.toThrow(/bundle_component_unit_matches/);
  });
});

describe('P-7 / P-8 listing rules (AD-4, AD-INV-1 r5, AD-INV-3 r6)', () => {
  it('refuses openToTrade on a business listing', async () => {
    const andres = await seed.business(db, 'andres');
    await expect(seed.listing(db, { id: id('bundle'), sellerId: andres, sellerKind: 'business', kind: 'bundle', openToTrade: true })).rejects.toThrow(
      /listing_trade_individual_only/,
    );
  });

  it('refuses pausing an individual-seller listing', async () => {
    const valentina = await seed.individualSeller(db, 'valentina');
    await expect(
      seed.listing(db, { id: id('bundle'), sellerId: valentina, sellerKind: 'individual', kind: 'bundle', pausedAt: T0 }),
    ).rejects.toThrow(/listing_individual_never_paused/);
  });

  it('refuses a sealed product as a bundle component', async () => {
    const andres = await seed.business(db, 'andres');
    const setId = await seed.catalogSet(db);
    const box = await seed.catalogEntry(db, { id: id('boosterbox'), setId, kind: 'sealedProduct' });
    const unit = await seed.inventoryUnit(db, { id: id('unitbox'), sellerId: andres, catalogEntryId: box, condition: 'Sealed', quantity: 2 });
    const bundle = await seed.listing(db, { id: id('bundle'), sellerId: andres, sellerKind: 'business', kind: 'bundle' });
    await expect(
      seed.bundleComponent(db, { listingId: bundle, inventoryUnitId: unit, sellerId: andres, catalogEntryId: box, condition: 'Sealed' }),
    ).rejects.toThrow(/BundleComponent_condition_check/);
  });
});

describe('P-9 / P-10 / P-23 order facts (AD-2, AD-ORD-2)', () => {
  async function orderScene() {
    const andres = await seed.business(db, 'andres');
    const camila = await seed.user(db, { id: id('camila') });
    const setId = await seed.catalogSet(db);
    const card = await seed.catalogEntry(db, { id: id('pikachu'), setId });
    const unit = await seed.inventoryUnit(db, { id: id('unitandres'), sellerId: andres, catalogEntryId: card, quantity: 1 });
    const listing = await seed.listing(db, { id: id('listing'), sellerId: andres, sellerKind: 'business', inventoryUnitId: unit });
    return { andres, camila, listing, unit };
  }

  it('refuses "paid" without a comprobante', async () => {
    const s = await orderScene();
    await seed.order(db, { id: id('order'), buyerId: s.camila, businessId: s.andres, listingId: s.listing, unitId: s.unit });
    await expect(db.query(`UPDATE "Order" SET "buyerPaidConfirmedAt" = $2 WHERE id = $1`, [id('order'), T0])).rejects.toThrow(
      /order_paid_requires_comprobante/,
    );
  });

  it('refuses expiring a paid order', async () => {
    const s = await orderScene();
    await seed.order(db, { id: id('order'), buyerId: s.camila, businessId: s.andres, listingId: s.listing, unitId: s.unit, paidAt: T0 });
    await expect(
      db.query(`UPDATE "Order" SET "expiredAt" = $2, "cancelReason" = 'Unpaid' WHERE id = $1`, [id('order'), '2026-10-03T16:00:00.000Z']),
    ).rejects.toThrow(/order_paid_never_terminated/);
  });

  it('refuses a business confirmation dated before the paid confirmation (review E-08)', async () => {
    const s = await orderScene();
    await seed.order(db, { id: id('order'), buyerId: s.camila, businessId: s.andres, listingId: s.listing, unitId: s.unit, paidAt: '2026-10-01T16:00:00.000Z' });
    await expect(
      db.query(`UPDATE "Order" SET "sellerReceivedConfirmedAt" = $2 WHERE id = $1`, [id('order'), '2026-10-01T15:30:00.000Z']),
    ).rejects.toThrow(/order_seller_not_before_paid/);
  });

  it('refuses a total that is not unitPrice × qty', async () => {
    const s = await orderScene();
    await seed.order(db, { id: id('order'), buyerId: s.camila, businessId: s.andres, listingId: s.listing, unitId: s.unit });
    await expect(db.query(`UPDATE "Order" SET "totalCop" = 1 WHERE id = $1`, [id('order')])).rejects.toThrow(/order_total_exact/);
  });
});

describe('P-11 / P-12 / P-13 commission ledger (AD-COM-1, AD-COM-2, ADD-§2.6)', () => {
  const entry = (seq: number, amount: number, base: number, orderId = id('order')) =>
    db.query(
      `INSERT INTO "CommissionLedgerEntry" (id, "businessId", seq, kind, "amountCop", "orderId", "rateBps", "baseCop", trigger, "commissionTriggeredAt", "balanceAfter", at)
       VALUES ($1, $2, $3, 'Deduction', $4, $5, 800, $6, 'businessConfirmed', $7, $8, $7)`,
      [id(`ledger${seq}`), id('andres'), seq, amount, orderId, base, T0, -amount * seq],
    );

  it('accepts the ADD-§2.6 vector 45,007 @ 800 bps = 3,601 and refuses 3,600', async () => {
    await seed.commissionAccount(db, { businessId: id('andres'), balanceCop: 0 });
    await expect(entry(1, 3600, 45_007)).rejects.toThrow(/ledger_deduction_rounding_rule/);
    await expect(entry(1, 3601, 45_007)).resolves.toBeDefined();
  });

  it('refuses a second deduction for the same order', async () => {
    await seed.commissionAccount(db, { businessId: id('andres'), balanceCop: 0 });
    await entry(1, 3601, 45_007);
    await expect(entry(2, 3601, 45_007)).rejects.toThrow(/ledger_one_deduction_per_order/);
  });

  it('refuses an account whose state disagrees with its balance', async () => {
    await expect(
      db.query(`INSERT INTO "CommissionAccount" ("businessId", "balanceCop", state, "ledgerSeq", "openedAt") VALUES ($1, 0, 'Funded', 0, $2)`, [id('andres'), T0]),
    ).rejects.toThrow(/commission_account_state_matches_balance/);
  });
});

describe('P-14 / P-15 trade offers (AD-TRD-1, AD-TRD-3)', () => {
  it('refuses a second Open offer by the same proposer on one listing', async () => {
    await seed.tradeOffer(db, { id: id('offerone'), listingId: id('listing'), sellerId: id('valentina'), proposerId: id('julian') });
    await expect(
      seed.tradeOffer(db, { id: id('offertwo'), listingId: id('listing'), sellerId: id('valentina'), proposerId: id('julian') }),
    ).rejects.toThrow(/trade_offer_one_open_per_proposer/);
  });

  it('refuses an Accepted offer without its reservation', async () => {
    await seed.tradeOffer(db, { id: id('offerone'), listingId: id('listing'), sellerId: id('valentina'), proposerId: id('julian') });
    await expect(db.query(`UPDATE "TradeOffer" SET status = 'Accepted', "acceptedAt" = $2 WHERE id = $1`, [id('offerone'), T0])).rejects.toThrow(
      /trade_offer_accepted_has_reservation/,
    );
  });
});

describe('P-16 / P-24 messaging (AD-MSG-2)', () => {
  const msg = (mid: string, seq: number, sender: string, client: string, body = 'Hola, ¿tienes el Pikachu?') =>
    db.query(
      `INSERT INTO "Message" (id, "conversationId", seq, "senderId", body, "clientMessageId", "recipientVerificationAtSend", at) VALUES ($1, $2, $3, $4, $5, $6, 'Approved', $7)`,
      [mid, id('conversation'), seq, sender, body, client, T0],
    );

  it('refuses a second conversation for the same pair', async () => {
    await seed.conversation(db, { id: id('conversation'), buyerId: id('camila'), businessId: id('andres') });
    await expect(seed.conversation(db, { id: id('conversation2'), buyerId: id('camila'), businessId: id('andres') })).rejects.toThrow(
      /conversation_one_per_pair/,
    );
  });

  it('refuses a duplicate clientMessageId and a message by a non-participant', async () => {
    await seed.conversation(db, { id: id('conversation'), buyerId: id('camila'), businessId: id('andres') });
    await msg(id('msgone'), 1, id('camila'), 'c1');
    await expect(msg(id('msgtwo'), 2, id('camila'), 'c1')).rejects.toThrow(/message_idempotent_send/);
    await expect(msg(id('msgthree'), 3, id('julian'), 'c3')).rejects.toThrow(/message_sender_is_participant/);
  });

  it('refuses a body that is not NFC-normalized (review E-13)', async () => {
    await seed.conversation(db, { id: id('conversation'), buyerId: id('camila'), businessId: id('andres') });
    const decomposed = 'Pokémon'.normalize('NFD');
    await expect(msg(id('msgone'), 1, id('camila'), 'c1', decomposed)).rejects.toThrow(/Message_body_check/);
  });
});

describe('P-17 / P-18 collections (AD-7, AD-COL-1, AD-COL-2)', () => {
  it('refuses an external entry that also names a catalog id', async () => {
    await seed.collection(db, { id: id('colvalentina'), ownerId: id('valentina') });
    await expect(
      db.query(
        `INSERT INTO "CollectionEntry" (id, "collectionId", "cardKind", "catalogEntryId", "externalUrl", "externalTitle", source, qty, "acquiredAt", "manualPosition", "createdAt")
         VALUES ($1, $2, 'external', $3, 'https://example.com/promo', 'Promo', 'Manual', 1, '2026-09-30', 0, $4)`,
        [id('entry'), id('colvalentina'), id('pikachu'), T0],
      ),
    ).rejects.toThrow(/collection_entry_catalog_tag/);
  });

  it('refuses a second prompt for one closed order', async () => {
    const line = [{ itemRef: id('pikachu'), title: 'Pikachu', qty: 1, unitPriceCop: 45_000 }];
    await seed.postPurchasePrompt(db, { id: id('promptone'), orderId: id('order'), buyerId: id('camila'), lines: line, closedAt: T0 });
    await expect(
      seed.postPurchasePrompt(db, { id: id('prompttwo'), orderId: id('order'), buyerId: id('camila'), lines: line, closedAt: T0 }),
    ).rejects.toThrow(/PostPurchasePrompt_orderId_key/);
  });
});

describe('P-19 / P-25 reviews (AD-REP-1, AD-12)', () => {
  it('refuses an unverified review of a business', async () => {
    await expect(
      db.query(
        `INSERT INTO "Review" (id, "reviewerId", "targetUserId", "targetKind", "purchaseVerified", rating, text, "createdAt") VALUES ($1, $2, $3, 'business', false, 5, '', $4)`,
        [id('review'), id('camila'), id('andres'), T0],
      ),
    ).rejects.toThrow(/review_business_iff_verified/);
  });

  it('refuses a hide reason outside the ADD-§9.2 review list (review E-17)', async () => {
    await seed.review(db, { id: id('review'), reviewerId: id('camila'), targetUserId: id('valentina'), targetKind: 'individual', rating: 4 });
    await expect(
      db.query(`UPDATE "Review" SET "hiddenAt" = $2, "hiddenReason" = 'Counterfeit', "hiddenBy" = $3 WHERE id = $1`, [id('review'), T0, id('sebastian')]),
    ).rejects.toThrow(/Review_hiddenReason_check/);
  });
});

describe('P-20 append-only and hide-never-delete grants (AD-SYS-8 r10, AD-12)', () => {
  it('the application role cannot delete a review or update a ledger entry', async () => {
    await seed.review(db, { id: id('review'), reviewerId: id('camila'), targetUserId: id('valentina'), targetKind: 'individual', rating: 4 });
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE tezg_app');
      await expect(client.query(`DELETE FROM "Review" WHERE id = $1`, [id('review')])).rejects.toThrow(/permission denied/);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
    const client2 = await db.pool.connect();
    try {
      await client2.query('BEGIN');
      await client2.query('SET LOCAL ROLE tezg_app');
      await expect(client2.query(`UPDATE "CommissionRateSetting" SET "rateBps" = 0`)).rejects.toThrow(/permission denied/);
    } finally {
      await client2.query('ROLLBACK');
      client2.release();
    }
  });
});

describe('P-21 one account per mailbox (review E-01)', () => {
  it('refuses a second account whose email differs only in letter case', async () => {
    await seed.user(db, { id: id('camila'), email: 'camila@tezg.test' });
    await expect(seed.user(db, { id: id('camila2'), email: 'Camila@TEZG.test' })).rejects.toThrow(/user_email_case_insensitive/);
  });
});
