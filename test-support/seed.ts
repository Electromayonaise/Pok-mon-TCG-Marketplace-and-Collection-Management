// `seed_marketplace` fixtures (Solu-2's `seed_fleet`, adapted to TEZG): data factories that
// insert rows satisfying every constraint of the Solu-1 migrations. They set up Given steps
// only; no factory asserts anything (test-quality.md example 3).
import { SEED_INSTANT } from './clock.js';
import { id } from './ids.js';

type Q = { query<Row = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<Row[]> };

const T0 = new Date(SEED_INSTANT).toISOString();
const iso = (ms: number) => new Date(ms).toISOString();

// ---------------------------------------------------------------- identity
export async function user(
  db: Q,
  o: { id: string; email?: string; sellerTrack?: 'individual' | 'business' | null; isAdmin?: boolean; emailVerified?: boolean },
): Promise<string> {
  await db.query(
    `INSERT INTO "User" (id, name, email, "emailVerified", "isAdmin", "sellerTrack", "signupConsentAt", "signupConsentVersion", "createdAt", "updatedAt")
     VALUES ($1, $1, $2, $3, $4, $5, $6, 'privacy-v1', $6, $6)`,
    [o.id, o.email ?? `${o.id}@tezg.test`, o.emailVerified ?? true, o.isAdmin ?? false, o.sellerTrack ?? null, T0],
  );
  return o.id;
}

export async function individualProfile(db: Q, userId: string): Promise<void> {
  await db.query(
    `INSERT INTO "IndividualSellerProfile" ("userId", "displayName", "contactPhoneE164", "phoneSharingConsentAt", "phoneSharingConsentVersion",
       "meetingLat", "meetingLng", "meetingCity", "completedAt", "createdAt")
     VALUES ($1, 'Valentina', '+573001234567', $2, 'phone-v1', 4.7110, -74.0721, 'Bogotá', $2, $2)`,
    [userId, T0],
  );
}

/** An individual seller: User(sellerTrack='individual') + profile. */
export async function individualSeller(db: Q, name: string): Promise<string> {
  const uid = await user(db, { id: id(name), sellerTrack: 'individual' });
  await individualProfile(db, uid);
  return uid;
}

export async function rejectionReason(db: Q, o: { code: string; barred?: boolean; cooldownDays?: number | null; active?: boolean }): Promise<void> {
  const barred = o.barred ?? false;
  await db.query(
    `INSERT INTO "RejectionReason" (code, "textEsCo", barred, "cooldownDays", active, "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
    [o.code, 'Los datos no coinciden con tus documentos.', barred, barred ? null : (o.cooldownDays ?? 7), o.active ?? true, T0],
  );
}

export async function businessApplication(
  db: Q,
  o: {
    id: string;
    businessId: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    submittedAt?: string;
    decidedAt?: string;
    decidedBy?: string;
    rejectionReasonCode?: string;
    reapplyNotBefore?: string | null;
    reapplyBarred?: boolean;
  },
): Promise<string> {
  const decided = o.status !== 'Pending';
  await db.query(
    `INSERT INTO "BusinessApplication" (id, "businessId", status, "businessName", city, "externalPresenceUrl", "submittedAt", "consentAt", "consentVersion",
       "decidedBy", "decidedAt", "rejectionReasonCode", "reapplyNotBefore", "reapplyBarred", "createdAt")
     VALUES ($1, $2, $3, 'Cartas Andrés', 'Medellín', 'https://instagram.com/cartasandres', $4, $4, 'privacy-v1', $5, $6, $7, $8, $9, $4)`,
    [
      o.id,
      o.businessId,
      o.status,
      o.submittedAt ?? T0,
      decided ? (o.decidedBy ?? id('sebastian')) : null,
      decided ? (o.decidedAt ?? T0) : null,
      o.status === 'Rejected' ? (o.rejectionReasonCode ?? 'DataMismatch') : null,
      o.status === 'Rejected' ? (o.reapplyNotBefore ?? null) : null,
      o.status === 'Rejected' ? (o.reapplyBarred ?? false) : false,
    ],
  );
  return o.id;
}

export async function businessProfile(db: Q, businessId: string): Promise<void> {
  await db.query(
    `INSERT INTO "BusinessProfile" ("businessId", "publicName", city, "externalPresenceUrl", "bankName", "accountType", "accountNumber", "holderName", "qrObjectKey", "createdAt", "updatedAt")
     VALUES ($1, 'Cartas Andrés', 'Medellín', 'https://instagram.com/cartasandres', 'Bancolombia', 'savings', '12345678901', 'Andrés Restrepo', NULL, $2, $2)`,
    [businessId, T0],
  );
}

/** A business: User(sellerTrack='business') + application in `status` + profile. */
export async function business(db: Q, name: string, status: 'Pending' | 'Approved' | 'Rejected' = 'Approved'): Promise<string> {
  const uid = await user(db, { id: id(name), sellerTrack: 'business' });
  if (status === 'Rejected') await rejectionReason(db, { code: 'DataMismatch' }).catch(() => undefined);
  await businessApplication(db, { id: id(`app${name}`), businessId: uid, status, ...(status === 'Rejected' ? { reapplyNotBefore: iso(SEED_INSTANT + 7 * 86_400_000) } : {}) });
  await businessProfile(db, uid);
  return uid;
}

// ---------------------------------------------------------------- catalog
export async function catalogSet(db: Q, o: { id?: string; code?: string } = {}): Promise<string> {
  const sid = o.id ?? id('setsv1');
  await db.query(
    `INSERT INTO "CatalogSet" (id, code, name, era, "releaseDate", "cardCount", "createdAt") VALUES ($1, $2, 'Scarlet & Violet', 'SV', '2023-03-31', 3, $3)`,
    [sid, o.code ?? 'SV1', T0],
  );
  return sid;
}

export async function catalogEntry(
  db: Q,
  o: { id: string; setId: string; externalKey?: string; kind?: 'card' | 'sealedProduct'; name?: string; number?: string; artist?: string | null },
): Promise<string> {
  await db.query(
    `INSERT INTO "CatalogEntry" (id, "externalKey", "setId", kind, name, number, "numberSort", pokemon, colour, style, artist, "imageUrl", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, 1, 'Pikachu', 'yellow', 'holo', $7, NULL, $8, $8)`,
    [o.id, o.externalKey ?? `ext-${o.id}`, o.setId, o.kind ?? 'card', o.name ?? 'Pikachu', o.number ?? '025/198', o.artist ?? 'Atsuko Nishida', T0],
  );
  return o.id;
}

export async function feedRun(db: Q, o: { id: string; status?: 'Running' | 'Completed' | 'Failed'; startedAt?: string; leaseUntil?: string | null }): Promise<string> {
  const status = o.status ?? 'Completed';
  const lease = o.leaseUntil ?? null;
  await db.query(
    `INSERT INTO "FeedIngestionRun" (id, status, "leaseUntil", "leaseToken", "startedAt", "endedAt") VALUES ($1, $2, $3, $4, $5, $6)`,
    [o.id, status, lease, lease ? 'token-1' : null, o.startedAt ?? T0, status === 'Running' ? null : (o.startedAt ?? T0)],
  );
  return o.id;
}

export async function observation(
  db: Q,
  o: { id: string; catalogEntryId: string; runId: string; observedAt: string; cop: number; source?: string; usdCents?: number | null; fxRateDate?: string | null },
): Promise<string> {
  const fx = o.fxRateDate ?? null;
  await db.query(
    `INSERT INTO "ReferencePriceObservation" (id, "catalogEntryId", source, "observedAt", "usdCents", cop, "copDerivation", "fxRateDate", "runId", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [o.id, o.catalogEntryId, o.source ?? 'fixture-feed', o.observedAt, o.usdCents ?? null, o.cop, fx ? 'fxDerived' : 'sourceNative', fx, o.runId, T0],
  );
  return o.id;
}

// ---------------------------------------------------------------- listings
export async function inventoryUnit(
  db: Q,
  o: { id: string; sellerId: string; catalogEntryId: string; condition?: string; quantity: number },
): Promise<string> {
  await db.query(
    `INSERT INTO "InventoryUnit" (id, "sellerId", "catalogEntryId", condition, quantity, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $6)`,
    [o.id, o.sellerId, o.catalogEntryId, o.condition ?? 'NM', o.quantity, T0],
  );
  return o.id;
}

export async function listing(
  db: Q,
  o: {
    id: string;
    sellerId: string;
    sellerKind: 'business' | 'individual';
    inventoryUnitId?: string | null;
    kind?: 'single' | 'bundle';
    title?: string | null;
    priceCop?: number;
    lat?: number | null;
    lng?: number | null;
    openToTrade?: boolean;
    pausedAt?: string | null;
    hiddenAt?: string | null;
    withdrawnAt?: string | null;
    deactivatedAt?: string | null;
  },
): Promise<string> {
  const hidden = o.hiddenAt ?? null;
  const withdrawn = o.withdrawnAt ?? null;
  await db.query(
    `INSERT INTO "Listing" (id, "sellerId", "sellerKindAtCreation", kind, "inventoryUnitId", title, "priceCop", lat, lng, description, "openToTrade",
       "pausedAt", "withdrawnAt", "withdrawnReason", "hiddenAt", "hiddenReason", "hiddenBy", "deactivatedAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '', $10, $11, $12, $13, $14, $15, $16, $17, $18, $18)`,
    [
      o.id, o.sellerId, o.sellerKind, o.kind ?? 'single', o.kind === 'bundle' ? null : (o.inventoryUnitId ?? null),
      o.kind === 'bundle' ? (o.title ?? 'Bundle') : (o.title ?? null), o.priceCop ?? 45_000,
      o.lat === undefined ? 6.2442 : o.lat, o.lng === undefined ? -75.5812 : o.lng, o.openToTrade ?? false,
      o.pausedAt ?? null, withdrawn, withdrawn ? 'ApplicationRejected' : null,
      hidden, hidden ? 'Counterfeit' : null, hidden ? id('sebastian') : null, o.deactivatedAt ?? null, T0,
    ],
  );
  return o.id;
}

export async function bundleComponent(
  db: Q,
  o: { listingId: string; inventoryUnitId: string; sellerId: string; catalogEntryId: string; condition?: string; perBundleQty?: number },
): Promise<void> {
  await db.query(
    `INSERT INTO "BundleComponent" ("listingId", "inventoryUnitId", "sellerId", "catalogEntryId", condition, "perBundleQty", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [o.listingId, o.inventoryUnitId, o.sellerId, o.catalogEntryId, o.condition ?? 'NM', o.perBundleQty ?? 1, T0],
  );
}

export async function sellerCommissionState(db: Q, o: { businessId: string; paused: boolean; lastAppliedSeq?: number }): Promise<void> {
  await db.query(
    `INSERT INTO "SellerCommissionState" ("businessId", "lastAppliedSeq", paused, "appliedAt", "createdAt") VALUES ($1, $2, $3, $4, $4)`,
    [o.businessId, o.lastAppliedSeq ?? 1, o.paused, T0],
  );
}

// ---------------------------------------------------------------- orders
export async function order(
  db: Q,
  o: {
    id: string;
    buyerId: string;
    businessId: string;
    listingId: string;
    unitId: string;
    qty?: number;
    unitPriceCop?: number;
    createdAt?: string;
    expiresAt?: string;
    comprobante?: boolean;
    paidAt?: string | null;
    sellerReceivedAt?: string | null;
    itemReceivedAt?: string | null;
    cancelledAt?: string | null;
    expiredAt?: string | null;
  },
): Promise<string> {
  const qty = o.qty ?? 1;
  const price = o.unitPriceCop ?? 45_000;
  const created = o.createdAt ?? T0;
  const comprobante = o.comprobante ?? (o.paidAt != null);
  await db.query(
    `INSERT INTO "Order" (id, "buyerId", "businessId", "listingId", "listingSnapshot", qty, "unitPriceCop", "totalCop", "paymentInstructionsSnapshot",
       "reservationRef", "reservedUnitIds", "comprobanteObjectKey", "comprobanteUploadedAt", "buyerPaidConfirmedAt", "sellerReceivedConfirmedAt",
       "buyerItemReceivedConfirmedAt", "cancelledAt", "cancelReason", "expiredAt", "expiresAt", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
    [
      o.id, o.buyerId, o.businessId, o.listingId,
      JSON.stringify({ title: 'Pikachu ex', unitPriceCop: price }), qty, price, price * qty,
      JSON.stringify({ bankName: 'Bancolombia', accountType: 'savings', accountNumber: '12345678901', holderName: 'Andrés Restrepo' }),
      JSON.stringify({ listingId: o.listingId, units: [{ inventoryUnitId: o.unitId, qty }] }), [o.unitId],
      comprobante ? `order-comprobantes/${o.id}` : null, comprobante ? created : null,
      o.paidAt ?? null, o.sellerReceivedAt ?? null, o.itemReceivedAt ?? null,
      o.cancelledAt ?? null, o.cancelledAt ? 'BuyerCancelled' : o.expiredAt ? 'Unpaid' : null, o.expiredAt ?? null,
      o.expiresAt ?? iso(Date.parse(created) + 48 * 3_600_000), created,
    ],
  );
  return o.id;
}

// ---------------------------------------------------------------- commission
export async function commissionAccount(db: Q, o: { businessId: string; balanceCop: number; ledgerSeq?: number }): Promise<void> {
  await db.query(
    `INSERT INTO "CommissionAccount" ("businessId", "balanceCop", state, "ledgerSeq", "openedAt") VALUES ($1, $2, $3, $4, $5)`,
    [o.businessId, o.balanceCop, o.balanceCop > 0 ? 'Funded' : 'Exhausted', o.ledgerSeq ?? 0, T0],
  );
}

export async function topUpRequest(db: Q, o: { id: string; businessId: string; amountCop?: number }): Promise<string> {
  await db.query(
    `INSERT INTO "TopUpRequest" (id, "businessId", "amountCop", "transferReference", "proofObjectKey", status, "submittedAt") VALUES ($1, $2, $3, 'TRX-0001', $4, 'Pending', $5)`,
    [o.id, o.businessId, o.amountCop ?? 50_000, `topup-proofs/${o.id}`, T0],
  );
  return o.id;
}

// ---------------------------------------------------------------- trading
export async function tradeOffer(
  db: Q,
  o: { id: string; listingId: string; sellerId: string; proposerId: string; status?: string; turn?: 'proposer' | 'seller'; roundCount?: number; version?: number; expiresAt?: string },
): Promise<string> {
  await db.query(
    `INSERT INTO "TradeOffer" (id, "listingId", "sellerId", "proposerId", status, turn, "roundCount", version, "expiresAt", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [o.id, o.listingId, o.sellerId, o.proposerId, o.status ?? 'Open', o.turn ?? 'seller', o.roundCount ?? 1, o.version ?? 0, o.expiresAt ?? iso(SEED_INSTANT + 7 * 86_400_000), T0],
  );
  await db.query(
    `INSERT INTO "TradeOfferRound" ("offerId", round, actor, action, terms, at) VALUES ($1, 1, 'proposer', 'offer', $2, $3)`,
    [o.id, JSON.stringify({ offeredItems: [], cashCop: 20_000, requestedQty: 1 }), T0],
  );
  return o.id;
}

// ---------------------------------------------------------------- messaging
export async function conversation(db: Q, o: { id: string; buyerId: string; businessId: string }): Promise<string> {
  await db.query(`INSERT INTO "Conversation" (id, "buyerId", "businessId", "lastSeq", "lastMessageAt", "createdAt") VALUES ($1, $2, $3, 0, NULL, $4)`, [o.id, o.buyerId, o.businessId, T0]);
  await db.query(
    `INSERT INTO "ConversationParticipant" ("conversationId", "userId", role, "createdAt") VALUES ($1, $2, 'buyer', $4), ($1, $3, 'business', $4)`,
    [o.id, o.buyerId, o.businessId, T0],
  );
  return o.id;
}

// ---------------------------------------------------------------- collections
export async function collection(db: Q, o: { id: string; ownerId: string; name?: string }): Promise<string> {
  await db.query(`INSERT INTO "Collection" (id, "ownerId", name, "createdAt") VALUES ($1, $2, $3, $4)`, [o.id, o.ownerId, o.name ?? 'General', T0]);
  return o.id;
}

export async function collectionEntry(
  db: Q,
  o: { id: string; collectionId: string; catalogEntryId?: string | null; external?: { url: string; title: string }; qty?: number; position?: number },
): Promise<string> {
  const ext = o.external;
  await db.query(
    `INSERT INTO "CollectionEntry" (id, "collectionId", "cardKind", "catalogEntryId", "externalUrl", "externalTitle", source, "orderId", qty, "acquiredAt", "acquiredPriceCop", "manualPosition", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, 'Manual', NULL, $7, '2026-09-30', NULL, $8, $9)`,
    [o.id, o.collectionId, ext ? 'external' : 'catalog', ext ? null : (o.catalogEntryId ?? null), ext?.url ?? null, ext?.title ?? null, o.qty ?? 1, o.position ?? 0, T0],
  );
  return o.id;
}

export async function postPurchasePrompt(
  db: Q,
  o: { id: string; orderId: string; buyerId: string; lines: { itemRef: string; title: string; qty: number; unitPriceCop?: number }[]; closedAt: string; status?: 'Pending' | 'Accepted' | 'Dismissed' },
): Promise<string> {
  const status = o.status ?? 'Pending';
  await db.query(
    `INSERT INTO "PostPurchasePrompt" (id, "orderId", "buyerId", lines, "buyerItemReceivedConfirmedAt", status, "resolvedAt", "acceptedIntoCollectionId", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [o.id, o.orderId, o.buyerId, JSON.stringify(o.lines), o.closedAt, status, status === 'Pending' ? null : T0, status === 'Accepted' ? id('colprev') : null, T0],
  );
  return o.id;
}

// ---------------------------------------------------------------- reviews
export async function review(
  db: Q,
  o: { id: string; reviewerId: string; targetUserId: string; targetKind: 'business' | 'individual'; rating: number; text?: string; hiddenAt?: string | null },
): Promise<string> {
  const hidden = o.hiddenAt ?? null;
  await db.query(
    `INSERT INTO "Review" (id, "reviewerId", "targetUserId", "targetKind", "purchaseVerified", rating, text, "hiddenAt", "hiddenReason", "hiddenBy", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [o.id, o.reviewerId, o.targetUserId, o.targetKind, o.targetKind === 'business', o.rating, o.text ?? 'Todo llegó perfecto.', hidden, hidden ? 'Spam' : null, hidden ? id('sebastian') : null, T0],
  );
  return o.id;
}
