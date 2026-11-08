---
title: 'Story 8.6: Set commission rates and read the ledger'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: 'b011de3'
review_loop_iteration: 0
flow: 'Impl-2 Flow B, test-along (test-design.md §7.1): the 4 Solu-2 bound tests were already red; the domain unit tests and the integration tests are written with the code in one commit; one code review per epic batch (decision log Impl-2 #4)'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Impl-1 left S-FR-COM-7, S-FR-COM-7.list and S-FR-COM-8.ledger unbuilt (`deferred-work.md`, Epic 8 spec). An admin cannot schedule a commission rate, see which rate is in force, or read any account's ledger. The business's own page shows only its 50 newest lines.

**Approach:** `ComServiceV2.setCommissionRate`, `listCommissionRates` and `getAccountLedger`, pure rate and cursor rules in the domain, and the three admin procedures `commission.admin.setRate`, `commission.admin.rates` and `commission.admin.ledger`. Decision approved by Mateo (decision log Impl-2 #13):
- **Ledger page:** 50 lines per page, newest first by `seq DESC`, with an opaque keyset cursor, as on the business's own page (Impl-1 #33). A cursor this service did not issue is `RequestValidationFailed`.

Rates are never retroactive (AD-COM-2 rule 6): COM-1 already prices each deduction with `rateAt(commissionTriggeredAt)`, and a new setting starts at `max(effectiveFrom, now)`.

## Boundaries & Constraints

**Always:** the admin check first (AD-16); `rateBps` 0–10,000; an `effectiveFrom` earlier than `now − 60 s` is `CommissionRateNotFutureDated` (400) with zero writes; the setting is appended with its audit row in one transaction, and its decision is `CommissionRateScheduled`; the ledger and the rate list write nothing. **Ask First:** any change to `UNIQUE (effectiveFrom)` or to how a scheduled rate is corrected. **Never:** an update or delete of a `"CommissionRateSetting"` (append-only grants); a rate applied to a trigger already past.

</frozen-after-approval>

## Code Map

- `src/modules/commission/domain/com.ts` -- `isValidRateBps`, `RATE_BACKDATE_TOLERANCE_MS`, `scheduledEffectiveFrom` (the 60 s tolerance and the `max(effectiveFrom, now)` clamp), `rateInForce` (the greatest `effectiveFrom ≤ t`), `encodeLedgerCursor` / `decodeLedgerCursor`; unit tests in `src/modules/commission/com-domain.test.ts`
- `src/modules/commission/application/com.v2.ts` -- `setCommissionRate`, `listCommissionRates`, `getAccountLedger`; `com.v2.test.ts` -- the non-retroactive pricing through COM-1, the clamp, the list order and the rate in force as the Clock moves, every refusal with zero writes, ledger paging, the trigger filter, an unknown account, a foreign cursor, AdminOnly
- `src/modules/commission/ports/com.v2.ts` + `infra/pg.ts` -- `RateSettingRow`, `insertRateSetting` (`ON CONFLICT ("effectiveFrom") DO NOTHING`), `listRateSettings`; `newestLedgerLines` gains the `trigger` and `beforeSeq` filter and now sorts numerically
- `src/server/composition.ts` -- the three admin procedures; `src/server/composition.test.ts` -- all three over HTTP
- `contracts.md` -- S-FR-COM-7's decision and its same-instant refusal; §15.12's ledger page and the rate list's order
- `_bmad-output/test-artifacts/atdd/com_supporting.test.ts` -- the 4 bound tests

## Tasks & Acceptance

**Execution:**
- [x] domain rules and their unit tests (per-file branch coverage of `domain/com.ts` stays ≥ 90 %)
- [x] the service, the repository methods and the integration tests
- [x] the three procedures in the composition root, one HTTP test
- [x] `contracts.md`, `deferred-work.md`, `sprint-status.yaml` (8.6 and Epic 8 `done`), `traceability-matrix.md`
- [x] `npm run test:ci` green with 8.6 `done`

**Acceptance Criteria:**
- Given only the seed rate of 800 bps, when an admin schedules 1,000 bps from tomorrow, then an order triggered 1 ms before it is charged at 800 bps and one triggered at it at 1,000 bps, and the rate in force stays 800 until then.
- Given an `effectiveFrom` 61 s in the past, then `CommissionRateNotFutureDated` (400) with zero writes; 60 s in the past is stored from now.
- Given a second setting from the same instant, then `RequestValidationFailed` on `effectiveFrom`, with zero writes.
- Given 52 ledger lines, then the admin ledger reads 50 newest first and the cursor reads the last 2; filtered by `buyerClosed`, it shows only those deductions; an unknown account reads `balanceCop: null` and no lines; another account's cursor is `RequestValidationFailed`.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd com_supporting.test.ts` -- expected: 13 passed, the 4 bound tests among them
- `npx vitest run --project impl1-unit src/modules/commission` -- expected: the domain and integration tests pass
- `npm run test:ci` -- expected: exit 0

**Red phase (Flow B):** no new red commit. The 4 Solu-2 bound tests were red on `NotImplemented` since Solu-2 (the `gate:atdd-red` runs of Stories 8.5 and earlier).

**Green phase:** `evidence/impl2/16-story-8.6-green.log`: `test:ci` exit 0 on the first full run; `solu2-atdd:` 18 red for the right reason, 349 green, 0 not as expected; `solu2-nfr:` 24 green, 0 not as expected; `domain/com.ts` at 98.57 % branch coverage.

## Implementation Notes

- **Order of checks in `setCommissionRate`:** `AdminOnly`, then the rate's CHECK and the instant's parse (repeated for in-process callers; the tRPC parser already refuses both), then the 60 s rule, then the insert. The Clock is read once, inside the transaction.
- **Same instant:** the contract does not say what two settings from one instant do. The insert is `ON CONFLICT ("effectiveFrom") DO NOTHING`. When no row comes back, the service refuses with `RequestValidationFailed` on `effectiveFrom` ("ya hay una tarifa que rige desde ese instante; elige otro"), and the transaction rolls back, so no audit row is written. A concurrent pair resolves the same way, so no 500 is possible. No new code was added. Page 7.4's correction path conflicts with the `UNIQUE` (see `deferred-work.md`), and that question is reported as open.
- **Citations:** the refusal cites `{ effectiveFrom, now }` (the asked instant, normalised); the decision cites `{ rateBps, effectiveFrom }` (the stored instant); the audit row adds `requestedEffectiveFrom`.
- **Rate in force:** `rateInForce` in the domain picks from the listed settings, with the same rule as `rateAt` (the greatest `effectiveFrom ≤ now`). A missing seed row is `Unexpected`.
- **Ledger cursor:** `base64url("ledger|<businessId>|<seq>")`. The next page holds `seq < cursor`, with the trigger filter applied again. A cursor of another account, of another list, or with a malformed or out-of-range seq is refused.
- **Defect fixed (S-FR-COM-9):** `newestLedgerLines` selected `seq::text AS seq` and then ran `ORDER BY seq DESC`, which Postgres resolves to the text alias. Seq 9 therefore sorted before 52, and the business's account page showed the wrong 50 lines once a ledger passed 9 entries. It now orders by `"CommissionLedgerEntry".seq`. The admin ledger test pins both reads, and it fails on the old SQL.
- **Deferred** (`deferred-work.md`): page 7.4's correction path versus `UNIQUE (effectiveFrom)`; the 7.4 "Registrada" column and worked example are not in the DTO; the rate list has no page.
