// Driven adapters (persistence) — orders. The Solu-1 stub below is bound to the retired migration
// 005_create_orders.sql (git 853449c:docs/solu-1/planning/schemas/); the Solu-2 PgOrdRepository at
// the end is bound to _bmad-output/planning-artifacts/detailed-design/schemas.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { ReservationRefDTO } from '../../listings/index.js';
import type { IOrderRepository } from '../ports/ord.js';
import type { SupportContactDTO } from '../dto/ord.v2.dto.js';
import type { OrderFacts } from '../domain/ord.js';
import type { NewOrderRow, OrderLookupQuery, OrderRow, OrdTablesRepository } from '../ports/ord.v2.js';

export class PgOrderRepository implements IOrderRepository {
  constructor(protected readonly sql: Sql) {}
  async visibleTo(): Promise<null> {
    throw new NotImplementedError('PgOrderRepository.visibleTo');
  }
  async setPaidConditionally(): Promise<0 | 1> {
    throw new NotImplementedError('PgOrderRepository.setPaidConditionally');
  }
  async readFacts(): Promise<null> {
    throw new NotImplementedError('PgOrderRepository.readFacts');
  }
  async expireConditionally(): Promise<null> {
    throw new NotImplementedError('PgOrderRepository.expireConditionally');
  }
  async closedPurchase(): Promise<never> {
    throw new NotImplementedError('PgOrderRepository.closedPurchase');
  }
}

// ---------------------------------------------------------------- Solu-2 (AD-ORD-1, AD-ORD-2, AD-ORD-3)

/** AD-ORD-1 rule 2.2, AD-ORD-2 rule 1: an order that still counts as open at `$now`. */
const OPEN = `"buyerPaidConfirmedAt" IS NULL AND "cancelledAt" IS NULL AND "expiredAt" IS NULL`;
/** AD-ORD-2 rule 2: paid, and neither cancelled nor expired (ORD-2 I2 makes the latter defensive). */
const PAID_ACTIVE = `"buyerPaidConfirmedAt" IS NOT NULL AND "cancelledAt" IS NULL AND "expiredAt" IS NULL`;
/** AD-ORD-3 rule 1: the one visibility predicate, for actor `$2`. */
const VISIBLE_TO = `("buyerId" = $2 OR ("businessId" = $2 AND "buyerPaidConfirmedAt" IS NOT NULL))`;
/** Every column a command or a read needs; the comprobante key only as a flag (AD-17), `comprobanteKeyOf` reads it for storage calls. */
const ORDER_COLUMNS = `id, "buyerId", "businessId", "listingId", "listingSnapshot", qty, "unitPriceCop"::text AS "unitPriceCop", "totalCop"::text AS "totalCop",
  "reservationRef", "comprobanteObjectKey" IS NOT NULL AS "hasComprobante", "comprobanteUploadedAt", "buyerPaidConfirmedAt", "sellerReceivedConfirmedAt",
  "buyerItemReceivedConfirmedAt", "cancelledAt", "expiredAt", "expiresAt", "createdAt"`;
type RawOrder = Omit<OrderRow, 'unitPriceCop' | 'totalCop'> & { unitPriceCop: string; totalCop: string };
const order = (r: RawOrder): OrderRow => ({ ...r, unitPriceCop: Number(r.unitPriceCop), totalCop: Number(r.totalCop) });

/** ORD's repository port over `_bmad-output/planning-artifacts/detailed-design/schemas` (AD-8). */
export class PgOrdRepository implements OrdTablesRepository {
  async lockBuyer(tx: Tx, buyerId: CuidId): Promise<void> {
    await tx.query(`SELECT pg_advisory_xact_lock(hashtextextended('orders:buyer:' || $1, 0))`, [buyerId]);
  }

  async openOrders(tx: Tx, buyerId: CuidId, now: IsoInstant): Promise<{ id: CuidId; businessId: CuidId }[]> {
    const { rows } = await tx.query<{ id: CuidId; businessId: CuidId }>(
      `SELECT id, "businessId" FROM "Order" WHERE "buyerId" = $1 AND ${OPEN} AND "expiresAt" > $2 ORDER BY id COLLATE "C"`,
      [buyerId, now],
    );
    return rows;
  }

  async insertOrder(tx: Tx, o: NewOrderRow): Promise<void> {
    await tx.query(
      `INSERT INTO "Order" (id, "buyerId", "businessId", "listingId", "listingSnapshot", qty, "unitPriceCop", "totalCop", "paymentInstructionsSnapshot",
         "reservationRef", "reservedUnitIds", "expiresAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)`,
      [o.id, o.buyerId, o.businessId, o.listingId, JSON.stringify(o.listingSnapshot), o.qty, o.unitPriceCop, o.totalCop, JSON.stringify(o.paymentInstructions),
        JSON.stringify(o.reservationRef), o.reservationRef.units.map((u) => u.inventoryUnitId), o.expiresAt, o.now],
    );
  }

  async dueOrderIds(tx: Tx, unitIds: CuidId[] | null, now: IsoInstant, limit: number): Promise<CuidId[]> {
    const { rows } = await tx.query<{ id: CuidId }>(
      `SELECT id FROM "Order" WHERE ${OPEN} AND "expiresAt" <= $1 AND ($2::text[] IS NULL OR "reservedUnitIds" && $2::text[])
       ORDER BY "expiresAt", id COLLATE "C" LIMIT $3`,
      [now, unitIds, limit],
    );
    return rows.map((r) => r.id);
  }

  async expireOrder(tx: Tx, orderId: CuidId, now: IsoInstant): Promise<ReservationRefDTO | null> {
    const { rows } = await tx.query<{ reservationRef: ReservationRefDTO }>(
      `UPDATE "Order" SET "expiredAt" = $2, "cancelReason" = 'Unpaid', "updatedAt" = $2, version = version + 1
       WHERE id = $1 AND ${OPEN} AND "expiresAt" <= $2 RETURNING "reservationRef"`,
      [orderId, now],
    );
    return rows[0]?.reservationRef ?? null;
  }

  async readVisibleOrder(tx: Tx, orderId: CuidId, actorId: CuidId): Promise<OrderRow | null> {
    const { rows } = await tx.query<RawOrder>(`SELECT ${ORDER_COLUMNS} FROM "Order" WHERE id = $1 AND ${VISIBLE_TO}`, [orderId, actorId]);
    return rows[0] ? order(rows[0]) : null;
  }

  async comprobanteKeyOf(tx: Tx, orderId: CuidId): Promise<string | null> {
    const { rows } = await tx.query<{ key: string | null }>(`SELECT "comprobanteObjectKey" AS key FROM "Order" WHERE id = $1`, [orderId]);
    return rows[0]?.key ?? null;
  }

  async attachComprobante(tx: Tx, orderId: CuidId, buyerId: CuidId, key: string, now: IsoInstant): Promise<{ previousKey: string | null } | undefined> {
    const { rows } = await tx.query<{ previousKey: string | null }>(
      `UPDATE "Order" o SET "comprobanteObjectKey" = $3, "comprobanteUploadedAt" = $4, "updatedAt" = $4, version = o.version + 1
       FROM (SELECT id, "comprobanteObjectKey" AS prev FROM "Order" WHERE id = $1 FOR UPDATE) p
       WHERE o.id = p.id AND o."buyerId" = $2 AND o."buyerPaidConfirmedAt" IS NULL AND o."cancelledAt" IS NULL AND o."expiredAt" IS NULL AND o."expiresAt" > $4
       RETURNING p.prev AS "previousKey"`,
      [orderId, buyerId, key, now],
    );
    return rows[0];
  }

  async setBuyerPaid(tx: Tx, orderId: CuidId, buyerId: CuidId, now: IsoInstant): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE "Order" SET "buyerPaidConfirmedAt" = $3, "updatedAt" = $3, version = version + 1
       WHERE id = $1 AND "buyerId" = $2 AND "comprobanteObjectKey" IS NOT NULL AND ${OPEN} AND "expiresAt" > $3 RETURNING id`,
      [orderId, buyerId, now],
    );
    return rowCount === 1;
  }

  async setSellerReceived(tx: Tx, orderId: CuidId, businessId: CuidId, now: IsoInstant): Promise<OrderRow | null> {
    const { rows } = await tx.query<RawOrder>(
      `UPDATE "Order" SET "sellerReceivedConfirmedAt" = $3, "updatedAt" = $3, version = version + 1
       WHERE id = $1 AND "businessId" = $2 AND ${PAID_ACTIVE} AND "sellerReceivedConfirmedAt" IS NULL RETURNING ${ORDER_COLUMNS}`,
      [orderId, businessId, now],
    );
    return rows[0] ? order(rows[0]) : null;
  }

  async setItemReceived(tx: Tx, orderId: CuidId, buyerId: CuidId, now: IsoInstant): Promise<OrderRow | null> {
    const { rows } = await tx.query<RawOrder>(
      `UPDATE "Order" SET "buyerItemReceivedConfirmedAt" = $3, "updatedAt" = $3, version = version + 1
       WHERE id = $1 AND "buyerId" = $2 AND ${PAID_ACTIVE} AND "buyerItemReceivedConfirmedAt" IS NULL RETURNING ${ORDER_COLUMNS}`,
      [orderId, buyerId, now],
    );
    return rows[0] ? order(rows[0]) : null;
  }

  async cancelOrder(tx: Tx, orderId: CuidId, buyerId: CuidId, now: IsoInstant): Promise<ReservationRefDTO | null> {
    const { rows } = await tx.query<{ reservationRef: ReservationRefDTO }>(
      `UPDATE "Order" SET "cancelledAt" = $3, "cancelReason" = 'BuyerCancelled', "updatedAt" = $3, version = version + 1
       WHERE id = $1 AND "buyerId" = $2 AND ${OPEN} AND "expiresAt" > $3 RETURNING "reservationRef"`,
      [orderId, buyerId, now],
    );
    return rows[0]?.reservationRef ?? null;
  }

  async listOrders(tx: Tx, actorId: CuidId, side: 'purchases' | 'sales', after: { createdAt: IsoInstant; id: CuidId } | null, limit: number): Promise<OrderRow[]> {
    const mine = side === 'purchases' ? `"buyerId" = $1` : `"businessId" = $1 AND "buyerPaidConfirmedAt" IS NOT NULL`;
    const keyset = after ? `AND ("createdAt" < $3 OR ("createdAt" = $3 AND id COLLATE "C" < $4))` : '';
    const { rows } = await tx.query<RawOrder>(
      `SELECT ${ORDER_COLUMNS} FROM "Order" WHERE ${mine} ${keyset} ORDER BY "createdAt" DESC, id COLLATE "C" DESC LIMIT $2`,
      after ? [actorId, limit, after.createdAt, after.id] : [actorId, limit],
    );
    return rows.map(order);
  }

  async closedPurchase(tx: Tx, buyerId: CuidId, businessId: CuidId): Promise<{ closed: boolean; latest: OrderFacts | null }> {
    const { rows } = await tx.query<OrderFacts & { closed: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM "Order" WHERE "buyerId" = $1 AND "businessId" = $2 AND "buyerItemReceivedConfirmedAt" IS NOT NULL) AS closed,
         o."buyerPaidConfirmedAt", o."sellerReceivedConfirmedAt", o."buyerItemReceivedConfirmedAt", o."cancelledAt", o."expiredAt", o."expiresAt",
         o."comprobanteObjectKey" IS NOT NULL AS "hasComprobante"
       FROM (SELECT 1) one LEFT JOIN LATERAL (
         SELECT * FROM "Order" WHERE "buyerId" = $1 AND "businessId" = $2 ORDER BY "createdAt" DESC, id COLLATE "C" DESC LIMIT 1
       ) o ON TRUE`,
      [buyerId, businessId],
    );
    const { closed, ...latest } = rows[0]!;
    return { closed, latest: latest.expiresAt === null ? null : latest };
  }

  async lookupOrders(tx: Tx, query: OrderLookupQuery, limit: number): Promise<OrderRow[]> {
    const { rows } = await tx.query<RawOrder>(
      `SELECT ${ORDER_COLUMNS} FROM "Order"
       WHERE ($1::text IS NULL OR id = $1) AND ($2::text IS NULL OR "buyerId" = $2) AND ($3::text IS NULL OR "businessId" = $3)
       ORDER BY "createdAt" DESC, id COLLATE "C" DESC LIMIT $4`,
      [query.orderId ?? null, query.buyerId ?? null, query.businessId ?? null, limit],
    );
    return rows.map(order);
  }

  async insertLookupLog(tx: Tx, log: { id: CuidId; adminId: CuidId; query: OrderLookupQuery; resultOrderIds: CuidId[]; now: IsoInstant }): Promise<void> {
    await tx.query(
      `INSERT INTO "OrderLookupLog" (id, "adminId", query, "resultOrderIds", "createdAt") VALUES ($1, $2, $3, $4, $5)`,
      [log.id, log.adminId, JSON.stringify(log.query), log.resultOrderIds, log.now],
    );
  }

  async readSupportContact(tx: Tx, forUpdate: boolean): Promise<SupportContactDTO | null> {
    // A missing singleton has no row to lock, so two first changes serialize on a key instead.
    if (forUpdate) await tx.query(`SELECT pg_advisory_xact_lock(hashtextextended('orders:supportContact', 0))`);
    const { rows } = await tx.query<SupportContactDTO>(
      `SELECT email, "whatsappE164" FROM "SupportContactSetting" WHERE id = 'singleton'${forUpdate ? ' FOR UPDATE' : ''}`,
    );
    return rows[0] ?? null;
  }

  async writeSupportContact(tx: Tx, c: { id: CuidId; adminId: CuidId; before: SupportContactDTO | null; after: SupportContactDTO; now: IsoInstant }): Promise<void> {
    await tx.query(
      `INSERT INTO "SupportContactSetting" (id, email, "whatsappE164", "createdAt", "updatedAt") VALUES ('singleton', $1, $2, $3, $3)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, "whatsappE164" = EXCLUDED."whatsappE164", "updatedAt" = EXCLUDED."updatedAt"`,
      [c.after.email, c.after.whatsappE164, c.now],
    );
    await tx.query(
      `INSERT INTO "SupportContactChange" (id, "adminId", before, after, "createdAt") VALUES ($1, $2, $3, $4, $5)`,
      [c.id, c.adminId, c.before === null ? null : JSON.stringify(c.before), JSON.stringify(c.after), c.now],
    );
  }
}
