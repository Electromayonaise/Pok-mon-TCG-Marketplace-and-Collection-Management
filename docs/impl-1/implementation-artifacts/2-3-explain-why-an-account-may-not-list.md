---
baseline_commit: 2189038
---

# Story 2.3: Explain why an account may not list

Status: done

<!-- Epic entry: docs/solu-2/planning/epics.md, "Story 2.3". Ceremony: compact (decision log Impl-1 #22, task-statement.md §3). -->

## Story

As Andrés, whose application was rejected,
I want the listing form to tell me why I cannot list and when I may reapply,
so that I never fill in a form I cannot submit.

- **Kind:** Failure-state. Contracts `IDN-2` requireListingEligibility, `P-IDN.capabilities` getCapabilities, `P-IDN.verification` getSellerVerification.
- **Depends on:** Story 2.1 (`done`).
- **Traceability:** FR-IDN-1, FR-IDN-3. UI 1.1 (dev), 1.2, 4.1.
- **Binding invariants:** AD-16 (roles derived server-side), AD-SYS-4 rule 9 (the ambient client; never a second connection), AD-IDN-1 (one pure `deriveCapabilities` over one fact read; no cache).

## Acceptance Criteria

**AC1 (happy, `[IDN-2.Q1]`, `[P-IDN.capabilities.h]`).**
- *Given* Andrés's application is Pending, and Julián's email is not verified,
- *when* `listings` asks `requireListingEligibility`, and `commission` asks `getCapabilities`,
- *then* Andrés may list as a business, unverified, with an `allowedWithNotice` decision `ListingUnverified` citing FR-IDN-3 `{sellerKind, latestApplicationStatus}`; Julián has `canBuy = false` and `derivedFrom` holds `{fact: 'emailVerified', value: false}`.

**AC2 (ambient client, `[P-IDN.verification.h]`, `[SYS-4.R9]`).**
- *Given* a caller with an open transaction, even on a pool of one connection,
- *when* it calls `getSellerVerification`,
- *then* the read runs on that transaction's connection and answers the latest status, or `'none'`, within 3 s.

**AC3 (failure, `[IDN-2.QF1]`, `[IDN-2.QF2]`, `[IDN-2.I1]`).**
- *Given* Andrés's latest application is Rejected with a reapply date, Camila has no track, and Valentina is an individual with `isAdmin = true`,
- *when* the eligibility check runs for each,
- *then* `SellerNotVerified` (409) citing `{applicationId, reapplyNotBefore, barred}`; `IndividualSellerProfileIncomplete` (409) citing FR-IDN-3 `{sellerKind: 'none'}`; and Valentina lists as an individual, unverified.

## Tasks / Subtasks

- [x] **Task 1: domain (AC1, AC3).** Reshape `CapabilityFacts` (consent instant and the latest application's id, status, decision, reapply date and bar) and implement `deriveCapabilities`: the six capabilities in fixed order, each with its source facts, `sellerKind`, the flat `derivedFrom`, the verification status and the FR-IDN-3 listing outcome. Table-driven unit test over every combination of `{emailVerified, consent, sellerTrack, latest status}` (AD-IDN-1 rule 6), outside `domain/` (gate:purity).
- [x] **Task 2: ambient client (AC2).** `src/shared-kernel/db.ts`: an `AsyncLocalStorage` that holds the open `Tx`; the test `PgTransactionRunner` runs `work` inside it. A unit test proves the scope is set inside and cleared after.
- [x] **Task 3: repository (AC1–AC3).** `IdnRepository.readCapabilityFacts(sql, userId)`: one statement for the `"User"` flags, the latest application (`"submittedAt" DESC, id DESC`) and profile presence.
- [x] **Task 4: service (AC1–AC3).** `requireListingEligibility`, `getCapabilities`, `getSellerVerification` read through the ambient `Tx` when one is open, else one read-only transaction. Zero writes, no audit.
- [x] **Task 5: copy.** Two stored-only §13 rows for the success decisions (`ListingEligible`, `ListingUnverified`), by the rule of decision log Impl-1 #16; regenerate `messages.generated.ts`.
- [x] **Task 6: verification.** The 7 bound tests pass; mark `done`; `test:ci` green.

## Dev Notes

- **One projection.** Every query is a projection of `deriveCapabilities` (AD-IDN-1 rule 2); no service method recomputes a rule.
- **`db()` name.** `src/server/db.ts` already exports a `db()` for the pool and Prisma, so the ambient scope is `ambientTx()` / `withAmbientTx()` in `src/shared-kernel/db.ts`; the semantics are AD-SYS-4 rule 9's.
- **Production runner.** No production `TransactionRunner` exists yet; the one that lands must also run `work` inside `withAmbientTx`.
- **Time.** Eligibility does not depend on time; the clock is read only for `decision.occurredAt`.

## Dev Agent Record

### Agent Model Used

claude-opus-5-5 (Claude Code), the compact ceremony (#22).

### Completion Notes List

- **Bound tests.** All 7 pass: `[IDN-2.Q1]`, `[IDN-2.QF1]`, `[IDN-2.QF2]`, `[IDN-2.I1]`, `[P-IDN.capabilities.h]`, `[P-IDN.verification.h]` and `[SYS-4.R9]`, at 19–34 ms each, far inside the 3 s bound. The MEC test of 2.2 still passes. `test:ci` is green: 135 unit tests, and 0 "not as expected" in both the ATDD and the NFR red gates.
- **Task 1.** `capabilities.test.ts` drives `deriveCapabilities` over email × consent × five account states (24 cases). It also covers the fixed order, the deduplicated `derivedFrom`, admin (AD-16), the listing outcome table and I2. The domain keeps no `CapabilityName` alias, because the generator rejects a second exported type with the DTO's name.
- **Task 2, honest note.** `db.ts` and its test were written together, not test-first.
- **Task 3, deviation.** `readCapabilityFacts` takes a `Tx`, not a `sql` as the task text says. Every `IdnRepository` statement runs on the caller's `Tx`, and that is what AD-SYS-4 rule 9 needs.
- **Task 5.** `ListingEligible` and `ListingUnverified` are stored-only §13 rows. The generator now emits both codes.
- **SYS-AD8 false positive.** The fitness scan pairs backticks across comments. The new spans made the old `claimRefusal` comment ("conditional update changed …") read as a write to a table `changed`. I reworded it to "conditional write".
- **Review (subagent, report-only).** High: none. Medium triage:
  - **M1, fixed in the contract.** Only the test runner registers the ambient `Tx`. No production `TransactionRunner` exists yet, so the obligation now sits in the port's JSDoc (`TransactionRunner` in `ports.ts`), where the runner that lands will read it.
  - **M2, fixed.** Async work started inside a scope, such as a timer, kept the `Tx` after commit and could query a released connection. The store is now a slot that `withAmbientTx` empties when the scope ends. A new unit test proves that late work sees `undefined`.
  - **M3, dismissed.** The ambient `Tx` is not tied to a pool. The system has one Postgres per deployment (AD-SYS-4), and every service is wired from one composition root, so there is no second database to confuse.
  - **Low findings, not triaged** under #22. Two worth keeping: the `SellerNotVerified` template reads oddly for a barred applicant whose `reapplyNotBefore` is NULL (a copy gap in §13), and `latestApplication.status` cites `decidedAt`, which is null while Pending.

### File List

- `src/modules/identity/domain/idn.ts` (modified)
- `src/modules/identity/capabilities.test.ts` (new)
- `src/modules/identity/ports/idn.v2.ts` (modified)
- `src/modules/identity/infra/pg.ts` (modified)
- `src/modules/identity/application/idn.v2.ts` (modified)
- `src/shared-kernel/db.ts` (new)
- `src/shared-kernel/db.test.ts` (new)
- `src/shared-kernel/ports.ts` (modified)
- `src/shared-kernel/messages.generated.ts` (regenerated)
- `test-support/db.ts` (modified)
- `docs/solu-2/planning/detailed-design/contracts.md` (modified, §13)
- `docs/impl-1/implementation-artifacts/sprint-status.yaml` (modified)

## Change Log

- 2026-10-25: story created (compact, #22).
- 2026-10-25: implemented. Review triaged (M1 fixed in the contract, M2 fixed, M3 dismissed). Status done.
