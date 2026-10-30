// Driven adapters (persistence) — trading. The Solu-1 stub below is bound to the retired migration 007_create_trading.sql
// (git 853449c:docs/solu-1/planning/schemas/); the Solu-2 PgTrdRepository at the end is bound to
// _bmad-output/planning-artifacts/detailed-design/schemas.
import { NotImplementedError } from '../../../shared-kernel/errors.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { OfferRole, OfferStatus } from '../domain/trd.js';
import type { ReservationRefDTO } from '../../listings/index.js';
import type { TradeTermsDTO } from '../dto/trd.v2.dto.js';
import type { ITradeOfferRepository } from '../ports/trd.js';
import type { OfferRow, RoundRow, TrdRepository } from '../ports/trd.v2.js';

export class PgTradeOfferRepository implements ITradeOfferRepository {
  constructor(protected readonly sql: Sql) {}
  async lockSeller(): Promise<void> {
    throw new NotImplementedError('PgTradeOfferRepository.lockSeller');
  }
  async facts(): Promise<null> {
    throw new NotImplementedError('PgTradeOfferRepository.facts');
  }
  async acceptConditionally(): Promise<0 | 1> {
    throw new NotImplementedError('PgTradeOfferRepository.acceptConditionally');
  }
  async storeReservation(): Promise<void> {
    throw new NotImplementedError('PgTradeOfferRepository.storeReservation');
  }
  async markSiblingsUnfulfillable(): Promise<never> {
    throw new NotImplementedError('PgTradeOfferRepository.markSiblingsUnfulfillable');
  }
  async markOwnUnfulfillable(): Promise<void> {
    throw new NotImplementedError('PgTradeOfferRepository.markOwnUnfulfillable');
  }
  async findOpen(): Promise<null> {
    throw new NotImplementedError('PgTradeOfferRepository.findOpen');
  }
}

const OFFER_COLUMNS = `id, "listingId", "sellerId", "proposerId", status, turn, terms, "roundCount", version, "reservationRef",
  "proposerConfirmedAt", "sellerConfirmedAt", "cancelledBy", "expiresAt", "createdAt", "updatedAt"`;

/** AD-TRD-1 rule 5 in SQL: the status a reader sees at `$now`. */
const derivedStatus = (now: string) => `CASE WHEN status = 'Open' AND "expiresAt" <= ${now} THEN 'Expired' ELSE status END`;

/** TRD's own tables (AD-8): `"TradeOffer"`, `"TradeOfferRound"`. */
export class PgTrdRepository implements TrdRepository {
  async lockTradeSeller(tx: Tx, sellerId: CuidId): Promise<void> {
    await tx.query(`SELECT pg_advisory_xact_lock(hashtextextended('trd:seller:' || $1, 0))`, [sellerId]);
  }

  async readOffer(tx: Tx, offerId: CuidId): Promise<OfferRow | null> {
    const { rows } = await tx.query<OfferRow>(`SELECT ${OFFER_COLUMNS} FROM "TradeOffer" WHERE id = $1`, [offerId]);
    return rows[0] ?? null;
  }

  async readRounds(tx: Tx, offerIds: CuidId[]): Promise<RoundRow[]> {
    if (offerIds.length === 0) return [];
    const { rows } = await tx.query<RoundRow>(
      `SELECT "offerId", round, actor, action, terms, "createdAt" FROM "TradeOfferRound" WHERE "offerId" = ANY($1::text[]) ORDER BY "offerId", round`,
      [offerIds],
    );
    return rows;
  }

  async hasLiveOffer(tx: Tx, listingId: CuidId, proposerId: CuidId, now: IsoInstant): Promise<boolean> {
    const { rowCount } = await tx.query(
      `SELECT 1 FROM "TradeOffer" WHERE "listingId" = $1 AND "proposerId" = $2 AND status = 'Open' AND "expiresAt" > $3`,
      [listingId, proposerId, now],
    );
    return (rowCount ?? 0) > 0;
  }

  async expireDue(tx: Tx, scope: { listingId: CuidId; proposerId: CuidId } | { sellerId: CuidId }, now: IsoInstant): Promise<CuidId[]> {
    const [where, params] = 'sellerId' in scope
      ? [`"sellerId" = $2`, [scope.sellerId]]
      : [`"listingId" = $2 AND "proposerId" = $3`, [scope.listingId, scope.proposerId]];
    const { rows } = await tx.query<{ id: CuidId }>(
      `UPDATE "TradeOffer" SET status = 'Expired', "updatedAt" = $1
        WHERE ${where} AND status = 'Open' AND "expiresAt" <= $1 RETURNING id`,
      [now, ...params],
    );
    return rows.map((r) => r.id).sort();
  }

  async insertOffer(tx: Tx, o: { id: CuidId; listingId: CuidId; sellerId: CuidId; proposerId: CuidId; terms: TradeTermsDTO; expiresAt: IsoInstant; now: IsoInstant }): Promise<'inserted' | 'duplicate'> {
    await tx.query('SAVEPOINT offer_insert');
    try {
      await tx.query(
        `INSERT INTO "TradeOffer" (id, "listingId", "sellerId", "proposerId", status, turn, terms, "roundCount", version, "expiresAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'Open', 'seller', $5, 1, 0, $6, $7, $7)`,
        [o.id, o.listingId, o.sellerId, o.proposerId, JSON.stringify(o.terms), o.expiresAt, o.now],
      );
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code !== '23505' || pgError.constraint !== 'trade_offer_one_open_per_proposer') throw error;
      await tx.query('ROLLBACK TO SAVEPOINT offer_insert');
      return 'duplicate';
    }
    await tx.query('RELEASE SAVEPOINT offer_insert');
    return 'inserted';
  }

  async appendRound(tx: Tx, r: { offerId: CuidId; round?: number; actor: OfferRole; action: string; terms: TradeTermsDTO | null; now: IsoInstant }): Promise<void> {
    await tx.query(
      `INSERT INTO "TradeOfferRound" ("offerId", round, actor, action, terms, "createdAt")
       SELECT o.id, COALESCE($2::int, GREATEST(o."roundCount", (SELECT COALESCE(MAX(round), 0) FROM "TradeOfferRound" WHERE "offerId" = o.id)) + 1), $3, $4, $5, $6
         FROM "TradeOffer" o WHERE o.id = $1`,
      [r.offerId, r.round ?? null, r.actor, r.action, r.terms === null ? null : JSON.stringify(r.terms), r.now],
    );
  }

  async resolveOpenOffer(tx: Tx, c: { offerId: CuidId; expectedVersion: number; turn: OfferRole | null; to: 'Rejected' | 'Withdrawn'; now: IsoInstant }): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE "TradeOffer" SET status = $2, "updatedAt" = $3, version = version + 1
        WHERE id = $1 AND status = 'Open' AND version = $4 AND "expiresAt" > $3 AND ($5::text IS NULL OR turn = $5)`,
      [c.offerId, c.to, c.now, c.expectedVersion, c.turn],
    );
    return rowCount === 1;
  }

  async counterOffer(tx: Tx, c: { offerId: CuidId; role: OfferRole; expectedVersion: number; terms: TradeTermsDTO; now: IsoInstant }): Promise<{ version: number; turn: OfferRole; roundCount: number } | null> {
    const { rows } = await tx.query<{ version: number; turn: OfferRole; roundCount: number }>(
      `UPDATE "TradeOffer" SET terms = $5, turn = CASE WHEN $2 = 'seller' THEN 'proposer' ELSE 'seller' END, "roundCount" = "roundCount" + 1,
              "updatedAt" = $4, version = version + 1
        WHERE id = $1 AND status = 'Open' AND turn = $2 AND version = $3 AND "expiresAt" > $4 AND "roundCount" < 10
        RETURNING version, turn, "roundCount"`,
      [c.offerId, c.role, c.expectedVersion, c.now, JSON.stringify(c.terms)],
    );
    return rows[0] ?? null;
  }

  async acceptOffer(tx: Tx, c: { offerId: CuidId; expectedVersion: number; now: IsoInstant }): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE "TradeOffer" SET status = 'Accepted', "acceptedAt" = $3, "updatedAt" = $3, version = version + 1,
              "reservationRef" = jsonb_build_object('listingId', "listingId", 'units', '[]'::jsonb)
        WHERE id = $1 AND status = 'Open' AND turn = 'seller' AND version = $2 AND "expiresAt" > $3`,
      [c.offerId, c.expectedVersion, c.now],
    );
    return rowCount === 1;
  }

  async storeReservation(tx: Tx, offerId: CuidId, reservationRef: ReservationRefDTO): Promise<void> {
    await tx.query(`UPDATE "TradeOffer" SET "reservationRef" = $2 WHERE id = $1 AND status = 'Accepted'`, [offerId, JSON.stringify(reservationRef)]);
  }

  async markUnfulfillable(tx: Tx, scope: { listingIds: CuidId[]; exceptOfferId: CuidId } | { offerId: CuidId }, now: IsoInstant): Promise<CuidId[]> {
    const [where, params] = 'offerId' in scope
      ? [`id = $2`, [scope.offerId]]
      : [`"listingId" = ANY($2::text[]) AND id <> $3`, [scope.listingIds, scope.exceptOfferId]];
    const { rows } = await tx.query<{ id: CuidId }>(
      `UPDATE "TradeOffer" SET status = 'Unfulfillable', "unfulfillableReason" = 'ListingNoLongerAvailable', "updatedAt" = $1, version = version + 1
        WHERE ${where} AND status = 'Open' RETURNING id`,
      [now, ...params],
    );
    return rows.map((r) => r.id).sort();
  }

  async listOffers(tx: Tx, q: { actorId: CuidId; side: 'sent' | 'received' | 'any'; status: OfferStatus | null; after: { updatedAt: IsoInstant; id: CuidId } | null; limit: number; now: IsoInstant }): Promise<OfferRow[]> {
    const mine = q.side === 'sent' ? `"proposerId" = $1` : q.side === 'received' ? `"sellerId" = $1` : `("proposerId" = $1 OR "sellerId" = $1)`;
    const keyset = q.after ? `AND ("updatedAt" < $5 OR ("updatedAt" = $5 AND id COLLATE "C" < $6))` : '';
    const { rows } = await tx.query<OfferRow>(
      `SELECT ${OFFER_COLUMNS} FROM "TradeOffer"
        WHERE ${mine} AND ($4::text IS NULL OR ${derivedStatus('$3')} = $4) ${keyset}
        ORDER BY "updatedAt" DESC, id COLLATE "C" DESC LIMIT $2`,
      q.after ? [q.actorId, q.limit, q.now, q.status, q.after.updatedAt, q.after.id] : [q.actorId, q.limit, q.now, q.status],
    );
    return rows;
  }
}
