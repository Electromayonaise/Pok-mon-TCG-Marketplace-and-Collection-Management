// Driven adapters (persistence) — commission. The Solu-1 stubs below are bound to the retired migration
// 006_create_commission.sql (git 853449c:docs/solu-1/planning/schemas/); the Solu-2 PgComRepository at
// the end is bound to _bmad-output/planning-artifacts/detailed-design/schemas.
import { NotImplementedError, UnexpectedError } from '../../../shared-kernel/errors.js';
import type { Sql, Tx } from '../../../shared-kernel/ports.js';
import type { CuidId, IsoInstant } from '../../../shared-kernel/types.js';
import type { CommissionAccountDTO } from '../dto/com.dto.js';
import type { ICommissionAccountRepository, ICommissionLedgerRepository, ITopUpRepository } from '../ports/com.js';
import type { CommissionTrigger } from '../domain/com.js';
import type { AccountRow, ComTablesRepository, LedgerLineRow, TopUpRow } from '../ports/com.v2.js';

export class PgCommissionLedgerRepository implements ICommissionLedgerRepository {
  constructor(protected readonly sql: Sql) {}
  async deductionExists(): Promise<boolean> {
    throw new NotImplementedError('PgCommissionLedgerRepository.deductionExists');
  }
  async rateAt(): Promise<bigint> {
    throw new NotImplementedError('PgCommissionLedgerRepository.rateAt');
  }
  async applyDeduction(): Promise<never> {
    throw new NotImplementedError('PgCommissionLedgerRepository.applyDeduction');
  }
}

export class PgCommissionAccountRepository implements ICommissionAccountRepository {
  constructor(protected readonly sql: Sql) {}
  async find(): Promise<CommissionAccountDTO | null> {
    throw new NotImplementedError('PgCommissionAccountRepository.find');
  }
}

export class PgTopUpRepository implements ITopUpRepository {
  constructor(protected readonly sql: Sql) {}
  async ownedBy(): Promise<boolean> {
    throw new NotImplementedError('PgTopUpRepository.ownedBy');
  }
}

// ---------------------------------------------------------------- Solu-2 (AD-COM-1, AD-COM-2, AD-COM-3)

type Raw<T, K extends keyof T> = Omit<T, K> & { [P in K]: string };
const ACCOUNT_COLUMNS = `"businessId", "balanceCop"::text AS "balanceCop", state, "ledgerSeq"::text AS "ledgerSeq"`;
const account = (r: Raw<AccountRow, 'balanceCop' | 'ledgerSeq'>): AccountRow => ({ ...r, balanceCop: BigInt(r.balanceCop), ledgerSeq: BigInt(r.ledgerSeq) });
const LINE_COLUMNS = `seq::text AS seq, kind, "amountCop"::text AS "amountCop", "balanceAfter"::text AS "balanceAfter", "orderId", trigger, "createdAt"`;
const line = (r: Raw<LedgerLineRow, 'seq' | 'amountCop' | 'balanceAfter'>): LedgerLineRow =>
  ({ ...r, seq: BigInt(r.seq), amountCop: BigInt(r.amountCop), balanceAfter: BigInt(r.balanceAfter) });
/** Every column a list or a decision reads; the proof key is read only by `topUpProofOf` (AD-17). */
const TOP_UP_COLUMNS = `id, "businessId", "amountCop"::text AS "amountCop", "transferReference", status, "rejectionReason", "decidedBy", "decidedAt", "submittedAt"`;
const topUp = (r: Raw<TopUpRow, 'amountCop'>): TopUpRow => ({ ...r, amountCop: BigInt(r.amountCop) });

/** COM's repository port over `_bmad-output/planning-artifacts/detailed-design/schemas` (AD-8). */
export class PgComRepository implements ComTablesRepository {
  async openAccount(tx: Tx, a: { businessId: CuidId; openedAt: IsoInstant; now: IsoInstant }): Promise<boolean> {
    const { rowCount } = await tx.query(
      `INSERT INTO "CommissionAccount" ("businessId", "balanceCop", state, "ledgerSeq", "openedAt", "createdAt", "updatedAt")
       VALUES ($1, 0, 'Exhausted', 0, $2, $3, $3) ON CONFLICT ("businessId") DO NOTHING`,
      [a.businessId, a.openedAt, a.now],
    );
    return rowCount === 1;
  }

  async readAccount(tx: Tx, businessId: CuidId): Promise<AccountRow | null> {
    const { rows } = await tx.query<Raw<AccountRow, 'balanceCop' | 'ledgerSeq'>>(`SELECT ${ACCOUNT_COLUMNS} FROM "CommissionAccount" WHERE "businessId" = $1`, [businessId]);
    return rows[0] ? account(rows[0]) : null;
  }

  async newestLedgerLines(tx: Tx, businessId: CuidId, limit: number): Promise<LedgerLineRow[]> {
    const { rows } = await tx.query<Raw<LedgerLineRow, 'seq' | 'amountCop' | 'balanceAfter'>>(
      `SELECT ${LINE_COLUMNS} FROM "CommissionLedgerEntry" WHERE "businessId" = $1 ORDER BY seq DESC LIMIT $2`, [businessId, limit]);
    return rows.map(line);
  }

  async rateAt(tx: Tx, at: IsoInstant): Promise<number> {
    const { rows } = await tx.query<{ rateBps: number }>(
      `SELECT "rateBps" FROM "CommissionRateSetting" WHERE "effectiveFrom" <= $1 ORDER BY "effectiveFrom" DESC LIMIT 1`, [at]);
    if (!rows[0]) throw new UnexpectedError(`Unexpected: no "CommissionRateSetting" is in force at ${at}; the seed row is missing (AD-COM-2 rule 6)`);
    return rows[0].rateBps;
  }

  async deductionExists(tx: Tx, orderId: CuidId): Promise<boolean> {
    const { rows } = await tx.query(`SELECT 1 FROM "CommissionLedgerEntry" WHERE "orderId" = $1 AND kind = 'Deduction'`, [orderId]);
    return rows.length > 0;
  }

  async savepoint(tx: Tx, name: string, action: 'set' | 'rollback' | 'release'): Promise<void> {
    if (!/^[a-z_]+$/.test(name)) throw new UnexpectedError(`Unexpected: savepoint name ${name}`);
    await tx.query(action === 'set' ? `SAVEPOINT ${name}` : action === 'rollback' ? `ROLLBACK TO SAVEPOINT ${name}` : `RELEASE SAVEPOINT ${name}`);
  }

  async applyBalanceChange(tx: Tx, businessId: CuidId, delta: bigint, now: IsoInstant): Promise<{ balanceAfter: bigint; ledgerSeq: bigint } | null> {
    const { rows } = await tx.query<{ balanceAfter: string; ledgerSeq: string }>(
      `UPDATE "CommissionAccount" SET "balanceCop" = "balanceCop" + $2::bigint, "ledgerSeq" = "ledgerSeq" + 1,
         state = CASE WHEN "balanceCop" + $2::bigint > 0 THEN 'Funded' ELSE 'Exhausted' END, "updatedAt" = $3, version = version + 1
       WHERE "businessId" = $1 RETURNING "balanceCop"::text AS "balanceAfter", "ledgerSeq"::text AS "ledgerSeq"`,
      [businessId, delta.toString(), now],
    );
    return rows[0] ? { balanceAfter: BigInt(rows[0].balanceAfter), ledgerSeq: BigInt(rows[0].ledgerSeq) } : null;
  }

  async insertDeduction(tx: Tx, e: {
    id: CuidId; businessId: CuidId; seq: bigint; amountCop: bigint; orderId: CuidId; rateBps: number; baseCop: bigint;
    trigger: CommissionTrigger; commissionTriggeredAt: IsoInstant; balanceAfter: bigint; now: IsoInstant;
  }): Promise<boolean> {
    const { rows } = await tx.query(
      `INSERT INTO "CommissionLedgerEntry" (id, "businessId", seq, kind, "amountCop", "orderId", "rateBps", "baseCop", trigger, "commissionTriggeredAt", "balanceAfter", "createdAt")
       VALUES ($1, $2, $3, 'Deduction', $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT ("orderId") WHERE kind = 'Deduction' DO NOTHING RETURNING id`,
      [e.id, e.businessId, e.seq.toString(), e.amountCop.toString(), e.orderId, e.rateBps, e.baseCop.toString(), e.trigger, e.commissionTriggeredAt, e.balanceAfter.toString(), e.now],
    );
    return rows.length === 1;
  }

  async insertTopUp(tx: Tx, r: { id: CuidId; businessId: CuidId; amountCop: number; transferReference: string; proofObjectKey: string; now: IsoInstant }): Promise<void> {
    await tx.query(
      `INSERT INTO "TopUpRequest" (id, "businessId", "amountCop", "transferReference", "proofObjectKey", status, "submittedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $6, $6)`,
      [r.id, r.businessId, r.amountCop, r.transferReference, r.proofObjectKey, r.now],
    );
  }

  async listTopUpsOf(tx: Tx, businessId: CuidId, after: { at: IsoInstant; id: CuidId } | null, limit: number): Promise<TopUpRow[]> {
    const { rows } = await tx.query<Raw<TopUpRow, 'amountCop'>>(
      after === null
        ? `SELECT ${TOP_UP_COLUMNS} FROM "TopUpRequest" WHERE "businessId" = $1 ORDER BY "submittedAt" DESC, id COLLATE "C" DESC LIMIT $2`
        : `SELECT ${TOP_UP_COLUMNS} FROM "TopUpRequest" WHERE "businessId" = $1 AND ("submittedAt", id COLLATE "C") < ($3, $4)
           ORDER BY "submittedAt" DESC, id COLLATE "C" DESC LIMIT $2`,
      after === null ? [businessId, limit] : [businessId, limit, after.at, after.id],
    );
    return rows.map(topUp);
  }

  async topUpProofOf(tx: Tx, topUpRequestId: CuidId): Promise<{ businessId: CuidId; proofObjectKey: string } | null> {
    const { rows } = await tx.query<{ businessId: CuidId; proofObjectKey: string }>(
      `SELECT "businessId", "proofObjectKey" FROM "TopUpRequest" WHERE id = $1`, [topUpRequestId]);
    return rows[0] ?? null;
  }
}
