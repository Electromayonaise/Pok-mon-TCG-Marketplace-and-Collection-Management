---
title: 'Story 8.1: Open the commission account and request top-ups'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: '9f6844d'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `openCommissionAccount`, the top-up proof ticket, `requestTopUp`, `listMyTopUps`, `getTopUpProofUrl` and `getMyCommissionAccount` throw `NotImplementedError`. The 6 bound tests are red, no approved business gets a commission account, and the `commission` subscriber is unwired.

**Approach:** S-FR-COM-1, S-FR-COM-2 (ticket, request, mine, url) and S-FR-COM-9 as written in contracts.md §15 and §15.12, AD-COM-1 rule 5 and AD-COM-3 rules 1, 3 and 4. A new `PgComRepository` joins the one repository (R-14), in `wiring()` and `compose()`. `compose()` wires the `commission` subscriber (`BusinessApplicationApproved` → S-FR-COM-1 here; the two order events → COM-1 in Story 8.2) and the five `commission.*` business procedures.

## Boundaries & Constraints

**Always:**
- **S-FR-COM-1 (subscriber, handler `tx`):** `INSERT "CommissionAccount" (balance 0, state 'Exhausted', ledgerSeq 0, openedAt = approvedAt, createdAt = updatedAt = now) ON CONFLICT ("businessId") DO NOTHING RETURNING`. Only on insert: enqueue `CommissionBalanceExhausted { businessId, ledgerSeq: 0, balanceAfter: 0 }` and audit `commission.account.opened` (`system`). A redelivery returns `{ opened: false }` with zero writes.
- **The business check (S-FR-COM-2, S-FR-COM-9, the mine list):** `identity.getCapabilities({ userId })`, then identity's own guard raises `NotBusinessAccount` (409, identity) unless `sellerKind = 'business'` — the identity-owned guard chosen at spec approval (decision log Impl-1 #33). A Pending business passes; its missing account is then `CommissionAccountNotOpen`, never `NotBusinessAccount` (C-GAP-3).
- **S-FR-COM-2.ticket:** a business with an open account gets `storage.createUploadTicket('topup-proof/<businessId>/<cuid2>')`. With no account: `CommissionAccountNotOpen`.
- **S-FR-COM-2.request**, first-fail: the business check; the account exists, else `CommissionAccountNotOpen` citing `{ accountOpened: false }`; `amountCop` an integer in 20,000–10,000,000, else `TopUpAmountInvalid` (400); `transferReference` 4–40 chars, else `rejectRequest`; the proof pipeline (AD-SYS-8 rules 5.3 and 6, as ORD's comprobante): the key is exactly the business's prefix plus one `[a-z0-9]{1,64}` segment and exists in quarantine, ≤ 5 MiB, JPEG/PNG/PDF magic bytes, a clean scan, else `TopUpProofInvalidFile { cause }`; `put` the sanitized bytes to `topup-proofs/<cuid2>`. Then one transaction: `INSERT "TopUpRequest"` (Pending, `submittedAt = now`) and audit `commission.topUp.requested`. The balance is unchanged. A refusal after promotion deletes the promoted object; after the commit the quarantine object is deleted, best effort.
- **S-FR-COM-2.mine:** the business check, then its own requests, newest first by `("submittedAt", id)`, 25 per page, with a keyset cursor.
- **S-FR-COM-2.url:** visible to the owner or an admin (identity's admin facts, read by an identity-exported `isAdmin` beside `requireAdmin`); any other actor or an unknown id gets `TopUpNotVisibleToCaller` with one body (cites nothing about the request). `storage.sign('topup-proofs', key, 600)`.
- **S-FR-COM-9:** the business check; the account (balance, state, ledgerSeq, `lowBalance = 0 < balance < 20,000`, `neededToResumeCop = 1 − balance` when `balance ≤ 0`) and the 50 newest ledger lines; with no account `account: null`. Zero writes. The decision: `CommissionAccountNotYetOpen`, `CommissionBalanceNeedsTopUp`, `CommissionBalanceLow` (each `allowedWithNotice`) or `CommissionAccountShown` (`allowed`).
- **The seller advisory lock (Epic 5 deferral, closed at spec approval):** `pg_advisory_xact_lock(hashtextextended('listings:seller:' || businessId, 0))`, taken first by `createListing` and `createBundle` for a business and by `applyCommissionProjection`. A projection row that does not exist yet then still serializes a business listing's creation against its first commission event. AD-SYS-4 rule 4 gains the `listings:seller` namespace, and rule 5's exception note says why it cannot deadlock.
- Money in BigInt in the domain (AD-SYS-7); the DTO numbers are converted at the edge. The Clock is read once per call.
- **§13 stored-only rows:** `TopUpRequested`, `CommissionAccountNotYetOpen`, `CommissionBalanceNeedsTopUp`, `CommissionBalanceLow`, `CommissionAccountShown`. Then `node scripts/gen-solu2-api.mjs`.
- **src tests:** `com.v2.test.ts` covers the key shape, a refused file, the mine cursor and the admin read of a proof; `composition.test.ts` adds HTTP cases for the five procedures and the subscriber through a replay.

**Ask First:** a DTO or bound-test change.

**Never:** a read of an `identity` table outside identity's own adapter (AD-1, AD-8); a balance change on request; a regulated key in an error, citation or audit row.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Approval | no account | Exhausted at 0, one seq-0 event, audit | N/A |
| Redelivery | account exists | `{ opened: false }`, zero writes | N/A |
| Request | open account, valid proof | Pending, balance unchanged | N/A |
| No account | Approved, unopened | nothing written | `CommissionAccountNotOpen` 409 |
| Foreign proof | another business | same body as unknown | `TopUpNotVisibleToCaller` 403 |
| 15,000 | funded | `lowBalance`, `neededToResumeCop: null` | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/commission/domain/com.ts` -- `crossing`, the low-balance and needed-to-resume rules, the proof key shape
- `src/modules/commission/ports/com.v2.ts` + `infra/pg.ts` -- `ComRepository` / `PgComRepository`
- `src/modules/commission/application/com.v2.ts` -- the six operations
- `src/modules/identity/application/admin.ts` -- `isAdmin`, `requireBusinessAccount`
- `src/modules/listings/{ports,infra,application}/` -- `lockSellerProjection`; `ARCHITECTURE.md` AD-SYS-4 rules 4–5
- `test-support/solu2/fixtures.ts`, `src/server/composition.ts` (+ test) -- `PgComRepository`, `ComServiceV2`, the subscriber, five procedures
- `contracts.md` §13 -- five stored-only rows

## Tasks & Acceptance

**Execution:**
- [x] domain, repository, the subscriber and the account read; §13 rows and the generator
- [x] the proof ticket, request, mine list and URL
- [x] `wiring()`, `compose()`, the subscriber and procedures with HTTP cases; src tests
- [x] the seller advisory lock in `listings`, its src test, AD-SYS-4 rules 4–5
- [x] `sprint-status.yaml` -- 8.1 `done`, `epic-8: in-progress`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 8.1 `done`, when the 6 bound tests run, then they pass. Story 8.4's `[S-FR-COM-2.f]`, `[S-FR-COM-2.f2]` and `[S-FR-COM-9.f]` are early greens, restored by the 8.4 commit (decision #23).

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/com_supporting.test.ts` -- expected: the 8.1 tests pass
- `npx tsc --noEmit` -- expected: clean

## Implementation Notes

- Code review is batched with the rest of Epic 8 at its close (decision #22).
- Martín approved the four Epic 8 specs together, with these choices (decision log Impl-1 #33): the whole epic's Impl-1 cut plus 8.4 as a proof-only story; identity's own guard raises `NotBusinessAccount` from the capabilities it served; the Epic 5 seller-lock deferral is closed now; the NFR-COM-3 benchmark has two halves, bound to 8.2 and 8.3; the account page shows the 50 newest ledger lines; identity exports `isAdmin`; eight stored-only §13 rows.
- COM's identity port spans two identity services: `getCapabilities` is IDN's and `getBusinessName` is VER's, so `compose()` binds an object of both.
- The shared `composition.test.ts` app binds an inert `commission` handler, so the subscriber's HTTP case composes a second app with the real one and replays a failed `BusinessApplicationApproved` delivery.
- The "stays unwired" HTTP case moves from `commission.createTopUpProofUpload` (now wired) to `trading.cancel`.
- Over HTTP, an amount outside 20,000–10,000,000 is refused by the generated zod input as `RequestValidationFailed` before the service; `TopUpAmountInvalid` is the in-process callers' refusal, as the bound test calls it.
- The production `ObjectStorage` and `MalwareScanner` are still `UNWIRED_STORAGE` and `UNWIRED_SCANNER` (Story 3.1's item), so the ticket, the request and the URL fail as NotImplemented (500) in production.

### Review Findings

Epic 8 close review (2026-10-30, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `9f6844d..5913c75` (code paths). Totals for the epic: 3 decisions, 7 patches, 3 deferrals, 12 dismissed. Martín resolved the decisions (one deferral, one new refusal, one architecture amendment) and approved every patch (decision log Impl-1 #33).

- [x] [Review][Decision→Defer] One quarantined proof can back two top-up requests — two concurrent `requestTopUp` calls with one `uploadKey` both promote it (or a later one after a failed best-effort delete), and nothing makes the key or the proof unique — deferred: a single-use upload ticket closes it at the source (Epic 3's upload-ticket item); until then the admin sees both requests, with one reference, before crediting
- [x] [Review][Decision→Patch] An admin who is also a business can confirm or reject their own top-up — no separation-of-duties rule exists in the contracts — new refusal `TopUpSelfDecision` (409, commission): COM-2 P3a in contracts.md, §13, `codes.ts` and `operations.json`; the conditional update carries `"businessId" <> :adminId`, so it writes nothing
- [x] [Review][Patch] `requireBusinessAccount` always cites `FR-COM-9`, also on the S-FR-COM-2 paths [src/modules/identity/application/admin.ts] — take the caller's rule
- [x] [Review][Patch] `submittedAt` is read before the proof scan, so a slow scan commits a row older than queue pages an admin has already walked [src/modules/commission/application/com.v2.ts:requestTopUp] — read the Clock once, after promotion
- [x] [Review][Patch] The top-up amount reaches the repository as a JS `number`, not `bigint` (Always: money in BigInt) [src/modules/commission/infra/pg.ts:insertTopUp]
- [x] [Review][Patch] `cop()` throws a plain `RangeError` instead of `UnexpectedError` [src/modules/commission/application/com.v2.ts:cop]
- [x] [Review][Patch] The seller-lock test never releases its subscriber transaction when an assertion fails, which hangs the suite [src/modules/listings/application/inv.v2.test.ts]
- [x] [Review][Defer] Whitespace-only or NUL-bearing `transferReference` and rejection reason pass the length check (NUL then fails as 500) — deferred, pre-existing: Epic 3's trim item, decided with the UI forms
- [x] [Review][Defer] The proof is read whole before the 5 MiB check, and an ambiguous COMMIT deletes a proof a committed row may point to — deferred, pre-existing: Epic 3's upload-ticket and production-storage items
