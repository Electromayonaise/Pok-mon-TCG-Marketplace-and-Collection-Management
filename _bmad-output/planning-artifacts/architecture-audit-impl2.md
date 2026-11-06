---
title: "Architecture audit of Impl-2 (close phase, not shift-left)"
audited: "a7c5d81..0f54897 (branch impl-2): Stories 1.6, 2.6, 4.6, 8.5, 8.6, 9.6, 11.5, 11.6, 13.5, 13.6"
persona: "Winston (bmad-agent-architect)"
directed_by: "Mateo Rubio (decision log Impl-2 #31, #32)"
date: 2026-11-06
status: "findings open: they go to Mateo as menus"
inputs:
  - _bmad-output/planning-artifacts/ARCHITECTURE.md (AD-n, §4, §13)
  - _bmad-output/planning-artifacts/detailed-design/contracts.md (§14, §15)
  - _bmad-output/planning-artifacts/detailed-design/ports-and-adapters.md
  - _bmad-output/project-context.md
  - _bmad-output/implementation-artifacts/deferred-work.md and the ten Impl-2 story files
  - the Impl-2 code (git diff a7c5d81..HEAD)
---

# Architecture audit of Impl-2

## 0. What this audit is, and what it is not

The Impl-2 statement's Phase A names a "Winston & Murat audit". Murat's test design ran **before** the code (decision log Impl-2 #6). Winston was never invoked during Impl-2, and the re-audit of decision log #31 found that gap. This document is that missing review, **run at the close, after the code was written**. It is a **close-phase audit, not a shift-left review**: it did not shape the design of the ten stories, it only checks what they built.

**Scope.** Only what Impl-2 added or changed (`git diff a7c5d81..HEAD`):
- the job runner (`shared-kernel/jobs.ts`, `infra/pg-jobs.ts`, `server/jobs.ts`);
- authentication (`server/auth.ts`, `server/auth-routes.ts`);
- the composition root (`server/composition.ts`, `app/_server/runtime.ts`) and `server/moderation-log.ts`;
- the TRM circuit breaker (`catalog/domain/breaker.ts`, `application/cat.v2.ts`, `infra/pg.ts`, migration `002_fx_source_breaker.sql`);
- the commission reconcile and rates (8.5, 8.6);
- the messaging inbox and read marks (9.6);
- the collections binder and links (11.5, 11.6);
- the reputation reads and moderation (13.5, 13.6).

Impl-1 code is in scope only where an Impl-2 path depends on it.

**Method.** I read each AD-n that Impl-2 touched. I traced every Impl-2 write path to its SQL and to the test that proves it, and every outbound or failure path to its degraded outcome. Then I ran the gates (§7). The only change this audit makes is the one Mateo decided in #32: AD-CAT-3 rule 7 and its binding (§6). Every other item is a finding for Mateo.

**Verdict rule.** A rubric line is **PASS** when no finding against it is above LOW. It is **CONCERNS** when a finding is MEDIUM and none is HIGH, and **FAIL** when any finding is HIGH.

## 1. Verdict per rubric line

| Rubric line | Verdict | Why |
|---|---|---|
| R1 · "Pristine Ports & Adapters extension" | **PASS** | Every Impl-2 extension keeps the hexagon. Domain files are pure (`gate:purity`: 14 files, 0 problems). Services reach tables only through their repository port. Each infra adapter writes only its own module's tables (SYS-AD8 green; the diff touches no foreign table). One composition root wires everything, and the Next.js routes are one-line driving adapters. The findings against this line are LOW: F9 (documentation drift) and F10 (the admin-check intersection type, an accepted Impl-1 pattern). |
| R1 · "Flawless concurrency defense (atomic locks, row locks, idempotency)" | **CONCERNS** | Every Impl-2 write path has a named mechanism, and the risky ones have a 20–100-round race test (§3). Two MEDIUM findings remain. **F1:** the job single-flight and the reconcile job path need two pooled connections, while §4 and AD-SYS-4 fix the pool at `max: 1`, which the code does not apply. **F2:** the breaker's read-decide-write under `FOR UPDATE` is correct and mutation-proven, but it is the shape AD-SYS-5 rule 3 forbids, and the exception is not recorded. LOW: F8 (binder writes have no race test). |
| R1 · "Graceful degradation and circuit breakers under failure states" | **CONCERNS** | The breaker (4.6) is complete: closed, open and half-open, on one shared row, with a mutation-proven race test. Every other failure path also degrades with an explained outcome: the outbox's 3 attempts, failed state and replay; the stale carry-forward; the reconcile's 50 s bound; sign-up refused while mail is unwired; feed quarantine. One MEDIUM finding remains. **F3:** a failed job run is recorded but no admin surface shows it, so the tick health reads "on schedule" while every `trm-fetch` fails. LOW: F4 (§13 jobs neither built nor deferred) and F6 (no deadline on the source call against the 60 s lease). |
| R2 · "Strictly upholds all binding Architectural Invariants (AD-n)" | **CONCERNS** | Every AD row in contracts.md §14 is PASS (62 / 62 after rule 7), and no Impl-2 code breaks an AD's intent. "Strictly" fails on letter and record. **F1:** the connection budget and AD-SYS-4 rule 7's per-batch lock wording differ from the code. **F2:** the AD-SYS-5 exception is not recorded. LOW: F5 (AD-CAT-3 rule 6's wording), F7 (the Impl-2 race proofs are not bound in §14). The AD-CAT-3 rule 7 gap that #32 assigned to this audit is closed (§6). |

## 2. Check 1 — Ports and adapters

| Concern | Evidence (file:line) | Result |
|---|---|---|
| Domain purity | `src/modules/catalog/domain/breaker.ts:1-81`: pure `admit` / `record`, with instants as arguments; `Date.parse` and `new Date(ms)` only (`:48`). New pure rules in `commission/domain/com.ts`, `collections/domain/col.ts`, `messaging/domain/msg.ts`, `reviews/domain/rep.ts`. `npm run gate:purity`: 14 domain files, 0 problems | OK |
| Application depends only on ports | `catalog/ports/cat.v2.ts` (+`lockFxSourceBreaker`, `saveFxSourceBreaker`, `readFxSourceBreaker`); `collections/ports/col.v2.ts` (+51 lines); `messaging/ports/msg.v2.ts`; `reviews/ports/rep.v2.ts`; `commission/ports/com.v2.ts`. Every service gets `repo`, `transactions`, `clock`, `ids` and neighbour ports through its `*V2Deps` (`composition.ts:291-332`) | OK |
| Infra implements ports, own tables only (AD-8) | The tables in the Impl-2 diff of each `infra/pg.ts`: catalog `"FxSourceBreaker"`; commission `CommissionAccount`, `CommissionLedgerEntry`, `CommissionRateSetting`, `ReconciliationRun`; messaging `Conversation`, `ConversationParticipant`, `Message`; collections `Collection`, `CollectionEntry`, `WishlistEntry`, `PostPurchasePrompt`; reviews `Review`, `ReviewModerationLog`; listings `Listing`, `InventoryUnit`, `ListingModerationLog`; identity `User`, `AuthThrottleEvent`. Every table belongs to the module that touches it. `FxSourceBreaker` is tagged `@owner catalog`, and SYS-AD8 reads every migration (`fitness/sys_fitness.test.ts`) | OK |
| Cross-module reads through neighbour ports | Listing hide reads the title through `catalog.getEntries` (`listings/application/inv.v2.ts:640`). The binder reads cards through `catalog.getEntries` and `getSetSummaries` (`collections/application/col.v2.ts:332-372`). The wishlist reads prices through `listings.getAvailabilitySummary` (`col.v2.ts:451-463`). The moderation audit merges two module logs in `server/` and never joins them (`server/moderation-log.ts:23-29`) | OK |
| Admin checks | `requireAdmin(repo, …)` runs over identity's `AdminFactsReader` in the shared repo. Impl-2 extends the intersection type to listings (`listings/ports/inv.v2.ts:155`), following Impl-1 #32 | LOW, F10 |
| AD-11 error ownership | The Impl-2 codes are owned by the module that raises them: `FxRateCircuitOpen`, `FxSourceHealthy` and `FxSourceProbing` (catalog), `Reconciliation*` and `CommissionRateScheduled` (commission), `Listing*Hidden` (listings), `Conversation*` (messaging), `CollectionEntryMoved` and `CollectionEntryCopied` (collections). Identity raises `NotAuthenticated` for the job bearer (`server/jobs.ts:39`, through `identity.requireJobBearer`) and `AuthRateLimited` (`auth-routes.ts:60,72` → `idn.checkAuthThrottle`). The `server/` layer throws only `NotImplementedError`, `UnexpectedError` and `RequestValidationFailed` (`auth-routes.ts:48,53`; `jobs.ts:40,46`). `npm run lint` (with `tezg/error-owner`): 0 problems | OK |
| One composition root | `server/composition.ts:282-369` builds every adapter, service, subscriber, job and guard. `app/_server/runtime.ts:16-36` adds only what `src/` may not hold: the system clock (AD-SYS-6), the log sink and the Better Auth instance (decision log Impl-2 #2) | OK (the Impl-1 `create*Module` factories in the module `index.ts` files are a dormant second wiring path; outside scope, §8) |
| Thin Next.js driving adapters | `app/api/jobs/[job]/route.ts:7-9`, `app/api/auth/[...all]/route.ts:12-16`, `app/api/trpc/[trpc]/route.ts:5-9`: each is one call into `runtime.ts`. The pages call `callProcedure` (`runtime.ts:61-71`), so they pass through the same identity gate, parser and error formatter as the browser; they import module types only (`app/mensajes/page.tsx:6`, `app/perfil/[userId]/page.tsx:7`, `app/coleccion/[collectionId]/page.tsx:8`) | OK |
| Outbound ports with a simulated adapter | `EmailSender` (`shared-kernel/external.ts`) is bound to `UNWIRED_EMAIL` in production (`server/auth.ts:21-23`) and to `CapturingEmailSender` in tests. `FxRateSource` is bound to `UNWIRED_FX` (`composition.ts:122-124`) and to `FixtureFxRateSource` in tests | OK |

## 3. Check 2 — Concurrency defense, per Impl-2 write path

| Write path (story) | Mechanism | Code | Proving test |
|---|---|---|---|
| Job run single-flight (1.6) | `pg_try_advisory_xact_lock(hashtextextended('job:<name>',0))`, held on its own connection for the run. The `running` row is committed before the work starts | `shared-kernel/jobs.ts:56-66`; `infra/pg-jobs.ts:35-63` | `[S-SYS.jobs.single]` (`atdd/sys_jobs.test.ts:110`); `[S-SYS.jobs.C1]` 20 concurrent expiry runs, unit released once (`:129`) |
| `commission-reconcile` job (8.5) | The same advisory lock, taken inside COM-3 in an outer `lockTx`. Each account is read `FOR SHARE` in its own transaction. Reconcile never writes an account | `commission/application/com.v2.ts:273-276, 300-305`; `infra/pg.ts:191-192, 202` | `[COM-3.C1]` reconcile racing 50 deductions × 20 rounds: 0 discrepancies, no account write (`atdd/com_reconcile.test.ts:38`); `[COM-3.C2]` 10 concurrent runs (`:76`); `[COM-3.P2]` |
| Admin reconcile (8.5) | Read-only, `FOR SHARE` per account, one run row each. Overlapping admin runs are harmless (each writes its own row) | `com.v2.ts:279-280` | `[COM-3.Q1]`, `[COM-3.Q2]` |
| Set commission rate (8.6) | `UNIQUE ("effectiveFrom")`, insert-or-refuse, zero writes on conflict | `com.v2.ts:423-447` | `[S-FR-COM-7.h]`, `[S-FR-COM-7.f]`; no race test (F8) |
| TRM breaker transition (4.6) | One row: `INSERT … ON CONFLICT DO NOTHING`, then `SELECT … FOR UPDATE`, then a pure decision, then `UPDATE`. The source call runs between two transactions | `catalog/application/cat.v2.ts:421-430, 433, 449, 475-481`; `infra/pg.ts:360-375` | `[S-FR-CAT-8.breaker.C1]` 50 fetches, exactly 1 probe (`atdd/cat_breaker.test.ts:125`); `[S-FR-CAT-8.breaker.C2]` 3 concurrent failures × 20 rounds, all counted (`:165`). Mutation in #32: without `FOR UPDATE`, 42 probes |
| TRM rate insert (4.4, kept) | `EXCLUDE USING gist` on the validity range; an identical row is `alreadyCovered`, a different one `mismatchKept` | `cat.v2.ts:447-472` | `[S-FR-CAT-8.f]`, `[S-FR-CAT-8.h]` |
| Read mark (9.6) | Conditional `UPDATE … WHERE "lastReadSeq" < LEAST(:seq, c."lastSeq")`, monotonic under READ COMMITTED | `messaging/infra/pg.ts:153-168` | `[S-FR-MSG-7.C1]` 50 concurrent marks × 20 rounds, never decreases (`atdd/msg_inbox.test.ts:42`) |
| Mute and unmute (9.6) | Conditional `UPDATE … WHERE role='buyer' AND ("mutedAt" IS NULL) = (:mutedAt IS NOT NULL)` | `messaging/infra/pg.ts:170-175` | `[S-FR-MSG-8.h]`, `[S-FR-MSG-8.f]`; `msg.v2.test.ts:210` (mute twice keeps the first) |
| Add external entry, move, copy, reorder (11.5) | The `col:owner` advisory lock (`pg_advisory_xact_lock`), then the entry `FOR UPDATE OF e`, then the target collection `FOR SHARE`. `manualPosition` is assigned under the lock | `collections/application/col.v2.ts:289, 308-310, 399-401`; `infra/pg.ts:70-73, 152-153, 206-207` | Functional only: `[S-FR-COL-3.h]`, `[S-FR-COL-4.h]`, `[S-FR-COL-4.f]`, `[S-FR-COL-5.h]`. The `col:owner` lock itself is race-proven by Impl-1's `[S-FR-COL-1.f]`. No race test for positions (F8) |
| Binder layout (11.5) | A single `UPDATE … WHERE id AND "ownerId"`; last write wins, no state machine | `col.v2.ts:375-389`; `infra/pg.ts:110` | `col.v2-binder.test.ts` (refusals) |
| Wishlist add and remove (11.5) | `ON CONFLICT ("ownerId","catalogEntryId") DO NOTHING`; `DELETE … RETURNING` | `infra/pg.ts:127-141` | `col.v2-binder.test.ts:171` (a second add keeps the first); `[S-FR-COL-6.h]` |
| Listing hide and unhide (13.5) | Conditional flip `UPDATE "Listing" … WHERE "hiddenAt" IS NULL` (`version + 1`). On 0 rows, a re-read `FOR UPDATE` maps the loser to the explained no-op | `listings/application/inv.v2.ts:603-635`; `infra/pg.ts:282, 302` | `[S-FR-REP-5.C1]` 20 concurrent hides: one hide, one log row (`atdd/inv_supporting.test.ts:148`); `[S-FR-REP-5.f]` |
| Profile read (13.5) | `REPEATABLE READ READ ONLY`: the aggregate and the page come from one snapshot | `reviews/application/rep.v2.ts:304-321` | `[S-FR-REP-7.C1]` 100 rounds of reads racing hides (`atdd/rep_reads.test.ts:94`) |
| Sign-up and failed sign-in throttle rows (2.6) | Count-then-insert with no lock, by design: AD-IDN-3's trade-off accepts a few extra attempts under exact concurrency (abuse damping, not a correctness boundary) | `server/auth-routes.ts:60-64, 72-74`; `identity/infra/pg.ts:165-174` | `[S-FR-IDN-7.signup.throttle]`, `[S-FR-IDN-7.signin.throttle]` (sequential, as AD-IDN-3 intends) |
| Better Auth user, account and session writes (2.6) | Better Auth's unique `email`; the consent fields are set by the `user.create.before` hook in the same insert | `server/auth.ts:72-78` | `[S-FR-IDN-7.signup.h]` |
| JobRun rows (1.6) | Insert keyed by a fresh cuid; finish by `id`. One writer per row | `infra/pg-jobs.ts:10-24` | `[S-SYS.jobs.C1]` (every run writes its row) |

Every Impl-2 write path has a named mechanism. None runs without one. The isolation level is READ COMMITTED everywhere except the profile's `REPEATABLE READ` read (AD-SYS-4 rule 8, AD-REP-2).

## 4. Check 3 — Graceful degradation and circuit breakers

| Failure or outbound path | Degraded outcome | Evidence | Test |
|---|---|---|---|
| TRM source keeps failing (4.6) | After 3 failures in a row the breaker opens for 30 min. `circuitOpen` (`FxRateCircuitOpen`, `allowedWithNotice`) makes no source call and no write. `getFxRate` carries the last rate forward, stale. One probe with a 60 s lease follows the cool-down | `breaker.ts:23, 60-81`; `cat.v2.ts:421-449` | `[S-FR-CAT-8.breaker.open]`, `.halfOpen`, `.reset`, `.C1`, `.C2`; `breaker-domain.test.ts` |
| TRM source unwired in production | `NotImplementedError` is rethrown past the breaker by design (Story 4.6 notes), so the job run is `failed` with `NotImplemented` and the breaker never engages | `cat.v2.ts:440`; `composition.ts:122-124` | `[S-SYS.jobs.failed]`; see F3 |
| Outbox subscriber failure | Each attempt is counted before it runs. After 3 unrecorded attempts the delivery is `failed` with `DeliveryAttemptsExhausted` and never retried automatically. A human replays it. The sweeper now runs as a job (1.6) | `shared-kernel/dispatcher.ts` (Impl-1); `composition.ts:347` | `[SYS-2.R4]`, `[SYS-2.R6]` (`atdd/sys_contracts.test.ts:91,115`); `[S-SYS.replay.h]`; `[S-SYS.sweep.h]` (`atdd/sys_jobs.test.ts:98`) |
| Job work throws | The `JobRun` row becomes `failed` with the error code only. The answer is 500 `Unexpected` with no message, plus a log line. A lock whose release fails never replaces the outcome | `shared-kernel/jobs.ts:64-84`; `server/jobs.ts:48-51` | `[S-SYS.jobs.failed]` (`sys_jobs.test.ts:88`); `job-runner.test.ts`. No admin surface shows it (F3) |
| Job lock held | A `skipped` run with its row, and no work | `jobs.ts:57-63` | `[S-SYS.jobs.single]`, `[COM-3.C2]` |
| Reconcile runs long | The all-accounts run stops after 50 s of Clock time and answers `ReconciliationPartial` with `accountsChecked`. It never repairs | `com.v2.ts:297-299, 327`; `commission/domain/com.ts:114` | `com.v2-admin.test.ts:13`; `[COM-3.C1]` |
| Mail provider unwired | Sign-up is refused before Better Auth runs: 500 `Unexpected`, with no `User`, `Account` or throttle row. Sign-in keeps working | `auth-routes.ts:53`; `auth.ts:20-23, 89` | `[S-FR-IDN-7.signup.unwired]` (`atdd/idn_auth.test.ts:88`) |
| Credential stuffing | 429 `AuthRateLimited` citing `retryAt`, checked before the password | `auth-routes.ts:68-75` | `[S-FR-IDN-7.signin.throttle]`, `[S-FR-IDN-7.signup.throttle]` |
| Feed rows that are invalid or changed kind | Quarantined (`ON CONFLICT (runId,rowNumber) DO NOTHING`); the entry is untouched; the run converges on rerun | AD-CAT-1 (Impl-1, unchanged) | `[CAT-2.QF1]`, `[CAT-2.I1]`, `[CAT-1.I1]` |
| Feed, storage or scanner unwired | `NotImplemented`, never silent | `composition.ts:103-121` | (Impl-1) |
| Tick silent | The derived silence alert (3 h window, 10:17–23:17 Bogotá) | `admin-events.ts:97-101, 143-149` | Impl-1 S-SYS.tick tests |
| Neighbour read inside a transaction | Read on the ambient connection, never a second one | listing hide's title (`inv.v2.ts:640`) | `inv.v2-moderation.test.ts:21` (pool of 1) |

Every Impl-2 outbound or failure path ends in an explained outcome. The open gaps are about **visibility and liveness**, not about wrong answers: F3, F4 and F6.

## 5. Check 4 — AD invariants that Impl-2 touched

| AD | Upheld? | Enforced by | Note |
|---|---|---|---|
| AD-1 dependency graph | Yes | `[SYS-AD1]` (fitness); lint | The pages import module types only |
| AD-7 independent records | Yes | `[S-FR-COL-3.h]` (no `CatalogEntry` write) | The link entry is `cardKind='external'` |
| AD-8 table ownership | Yes | `[SYS-AD8]` (reads migration 002 too); `tezg/table-owner` | |
| AD-11 one owner per code | Yes | `[SYS-1.R2]`; `tezg/error-owner` | |
| AD-12 hide, never delete | Yes | `[S-FR-REP-5.h]`, `[S-FR-REP-7.h]`, `[REP-3.I1]` | |
| AD-16 roles derived server-side | Yes | `[SYS-8.R2]`; the admin checks in the service (`inv.v2.ts:609`) | |
| AD-SYS-1 Decision shape | Yes | `[SYS-1.R6]`; `gate:codes:solu2` | The F5 templates (raw instants) are deferred |
| AD-SYS-2 outbox, JobRun ownership | Yes | `[SYS-2.R4]`, `[SYS-2.R6]`, `[S-SYS.sweep.h]`; SYS-AD8 for `JobRun` | |
| AD-SYS-4 tx handles, locks, jobs | **Partly** | `[SYS-4.R9]`, `[S-SYS.jobs.single]`, `[S-SYS.jobs.C1]`, `[COM-3.C2]` | **F1:** the `max: 1` budget and the per-batch lock wording |
| AD-SYS-5 conditional UPDATE | **Partly** | `[S-FR-MSG-7.C1]`, `[S-FR-REP-5.C1]` | **F2:** the breaker's lock-based transition is an unrecorded exception |
| AD-SYS-6 determinism | Yes | `[SYS-6.R1]`, `[SYS-6.R4]` | The system clock lives in `app/_server/runtime.ts:16` (Impl-2 #2) |
| AD-SYS-8 auth, regulated data | Yes | `[SYS-8.R2]`, `[SYS-8.R4]`; the constant-time bearer | The IP is stored only as `ipHmac` |
| AD-IDN-3 consent, throttle | Yes | `[S-FR-IDN-7.signup.*]`, `[S-FR-IDN-7.signin.*]` | The §14 row binds only `[S-FR-IDN-7.f]` (F7) |
| AD-CAT-3 TRM | Yes, with rule 7 now written | `[S-FR-CAT-8.f]`; the new row `AD-CAT-3 rule 7` | F5 (rule 6's wording) |
| AD-COM-1 rule 4 reconcile | Yes | `[COM-3.I1]`, `[COM-3.C1]` | |
| AD-COM-2 rate by trigger time | Yes | `[S-FR-COM-7.h]`, `[COM-1.I1]` | |
| AD-MSG-3 monotonic read state | Yes | `[S-FR-MSG-7.f]`, `[S-FR-MSG-7.C1]` | |
| AD-COL-1 tagged union, owner lock | Yes | `[COL-3.I2]`, `[S-FR-COL-1.f]`, `[S-FR-COL-3.f2]` | F8 |
| AD-REP-2 aggregate from the list's snapshot | Yes | `[REP-3.MEC]`, `[S-FR-REP-7.C1]` | |
| AD-REP-3 conditional, logged hide | Yes | `[REP-2.I2]`, `[S-FR-REP-6.h]` | The merged log's per-source cursor is deferred (F6 of the code review) |

The §14 matrix in `traceability-matrix.md` §7: **62 / 62 AD rows PASS**, 0 problems (61 before rule 7).

## 6. AD-CAT-3 rule 7 (written by this audit, decision log Impl-2 #32)

- **`ARCHITECTURE.md` AD-CAT-3:**
  - **Status:** rule 7 is adopted at the Impl-2 close (decision log Impl-2 #31, #32).
  - **Binds:** gains `FxSourceBreaker`, `catalog.fx.breaker` and `catalog/domain/breaker.ts`.
  - **Prevents:** gains two items: a failing source called by every tick, retry and caller; two instances probing at once.
  - **Rule 2:** now routes the source call through the breaker, with the adapter's 3 transport retries inside one breaker call.
  - **Rule 7** states:
    - the three states;
    - N = 3 consecutive failures, a 30-minute cool-down on the Clock, and one half-open probe with a 60 s lease;
    - stale results move nothing;
    - one shared `"FxSourceBreaker"` row, changed under `FOR UPDATE`, with the source call outside any transaction;
    - `circuitOpen` keeps the last rate and makes no source call;
    - admin retries go through the breaker, with no bypass;
    - the tests that enforce the rule.
  - **Trade-off:** gains the admin-retry wait and the reason NFR-CAT-4's hourly attempt is kept.
- **contracts.md §14:** one new row, `AD-CAT-3 rule 7`, in the same form as the `AD-SYS-2 rule 10` row. It binds `[S-FR-CAT-8.breaker.h]`, `.open`, `.halfOpen`, `.reset`, `.C1` and `.C2` and names `breaker-domain.test.ts` in its enforcement point. The trace generator reads bracketed ids from `_bmad-output/test-artifacts/` only, so the unit file is cited by name.
- **Regenerated:** `epics.md` (the Story 4.6 binding-invariants line) and `traceability-matrix.md` (62 AD rows). `docs/impl-2/README.md` now reads 62 / 62.
- **Closed:** the Story 4.6 deferral "AD-CAT-3 does not name the breaker" in `deferred-work.md`.

## 7. Gates run after the change

```
npm run lint                 → exit 0 (0 problems)
npm run typecheck            → exit 0
npm run gate:purity          → 14 domain files checked, 0 problems
npm run gate:trace:solu2     → trace: 96 FRs, 56 NFRs, 62 AD rows, 32 risks, 115 clauses, 425 test ids (425 enforced green), 4 journeys, 1 k6 scripts; gate PASS; 0 problems
npm run gate:epics:solu2     → epics.md is current: 13 epics, 72 stories
npm run gate:ids:solu2       → 217 test ids cited by contracts.md; 425 defined; 37 core operations (0 problems)
npm run gate:codes:solu2     → 204 code citations checked, 0 problems
npm run test:fitness:solu2   → 2 files, 12 tests passed
```

## 8. Findings

Sizes: XS ≤ 1 h (a document or one line), S ≤ half a day, M ≤ 2 days.

| # | Severity | Finding | Evidence | Recommendation (recommended option first) | Size |
|---|---|---|---|---|---|
| F1 | MEDIUM | **The connection budget and the job lock differ from AD-SYS-4.** §4 and `ports-and-adapters.md` §1 fix the runtime pool at `max: 1` per instance, and AD-SYS-4 rule 7 says a job holds `job:<name>` "for each batch transaction". The code differs in two ways. First, `src/server/db.ts:14` builds the pool with pg's default `max` (10). Second, two Impl-2 paths need **two** connections at once. The runner holds the lock on a checked-out connection for the whole run while the work opens its own transactions (`shared-kernel/jobs.ts:56,66`; `infra/pg-jobs.ts:36-39`). The reconcile job holds `lockTx` while each account runs in its own transaction (`com.v2.ts:273-276, 302`). With the documented `max: 1` and pg's default `connectionTimeoutMillis: 0`, every runner-single-flight job and the nightly reconcile would wait forever. `[SYS-4.R9]` proves only neighbour queries on a pool of 1, and no test runs a job on a small pool. Story 1.6's frozen boundary approved "held on its own connection", so this is a recorded choice that the AD text never absorbed | `ARCHITECTURE.md:260, 397`; `ports-and-adapters.md:37`; `db.ts:14` | **(a)** Amend §4 and AD-SYS-4 rules 7 and 9 to `max: 2` (one connection for a job's lock), set `max: 2` explicitly in `db.ts`, and add a test that runs each job and the reconcile on a pool of 2. **(b)** Keep `max: 1`: take `job:<name>` inside each work transaction (the rule's letter), which changes expiry (one transaction per order) and reconcile (one per account) to re-check the lock per batch | a: S · b: M |
| F2 | MEDIUM | **The breaker is an unrecorded exception to AD-SYS-5.** AD-SYS-5 rules 1 and 3 make every transition one conditional `UPDATE … WHERE <from-state> [AND version]` and forbid a SELECT followed by an unconditional UPDATE of a state column. §6 requires a `version` column on every state-machine table. The breaker reads `FOR UPDATE`, decides in the domain and writes `UPDATE … WHERE port = $1` (`catalog/infra/pg.ts:367, 371-375`), and `"FxSourceBreaker"` has no `version` (`002_fx_source_breaker.sql`). This is correct under the row lock, mutation-proven (#32: 42 probes without `FOR UPDATE`) and approved by Mateo. But AD-SYS-5 does not name the exception. The lint `tezg/no-select-then-write` that AD-SYS-5 rule 3 names does not exist (`tools/lint/tezg-plugin.mjs:266` has 4 rules), so nothing would catch a future copy that forgets the lock | `ARCHITECTURE.md:411-414`; `breaker.ts:60-81` | **(a)** Record the breaker in AD-SYS-5 as its one named exception: a policy machine whose next state needs the read, on one row, under `FOR UPDATE`, citing AD-CAT-3 rule 7 and the C1/C2 tests. **(b)** Add a from-state predicate (`AND state = :from AND "updatedAt" = :readAt`) and a `version` column through a migration `003`, and map 0 rows to a retry | a: XS · b: S |
| F3 | MEDIUM | **A failed job is recorded but invisible to admins.** A failed run leaves a `JobRun` row with its error code, a log line and a 500 (`server/jobs.ts:48-51`). No admin read shows it. `admin.jobs.tickHealth` reads only the latest tick's `startedAt` (`infra/pg-admin-events.ts:46`), so a tick whose every job fails reads `TickOnSchedule`. A run that dies mid-way stays `running` forever. In production today `trm-fetch` fails every hour with `NotImplemented` (`UNWIRED_FX`; `cat.v2.ts:440` rethrows it past the breaker by design), and page 2.3 shows nothing but the stale rate. The breaker reads `closed` throughout | `admin-events.ts:143-149`; `composition.ts:122-124, 335` | **(a)** Extend `admin.jobs.tickHealth` (or add `admin.jobs.recent`) with the last outcome and error code per job, the count of failed runs in 24 h, and `running` rows older than 15 min, shown in page 2.3's header. **(b)** Accept it for V1 and add it to the launch checklist with the production adapters | a: S · b: XS |
| F4 | LOW | **Four §13 jobs are neither built nor deferred.** Of ARCHITECTURE §13's jobs, `failed-delivery-digest`, `contact-log-purge`, `auth-throttle-purge` and `orphan-upload-sweep` have no route (`server/jobs.ts:17` names 4 jobs) and no deferral; only `retention-purge` is deferred (Story 1.6). Story 2.6 now writes `AuthThrottleEvent` rows (ipHmac keys) on production paths, and their 24 h purge never runs. §13's "if it never runs" column keeps behaviour correct (AD-SYS-6 rule 5), so this is a retention and tracking gap, not a wrong answer | `ARCHITECTURE.md:2087, 2091-2093`; `deferred-work.md` (Story 1.6) | **(a)** Add the four jobs to `deferred-work.md` with the launch checklist as owner. **(b)** Build `auth-throttle-purge` and `contact-log-purge` now as two more `JobWork` entries (`daily-night`) | a: XS · b: S |
| F5 | LOW | **AD-CAT-3 rule 6's wording contradicts the admin retry.** "No request path calls `FxRateSource`", but `catalog.fx.retry` (§4's admin button, Story 4.4) is a request path that calls it. Its intent ("a request path waiting on the source", in Prevents) holds for every read path, and rule 7 now bounds the retry | `ARCHITECTURE.md:875`; `composition.ts:180` | Reword rule 6: "No read path calls `FxRateSource`. Only `trm-fetch` and the admin retry `catalog.fx.retry` call it, both through rule 7's breaker" | XS |
| F6 | LOW | **The source call has no deadline, against a 60 s probe lease.** The breaker assumes a probe reports back within its lease. The `FxRateSource` port has no deadline, so a hung call lets a second probe start after 60 s. `record` ignores the stale result, so the breaker stays correct, but the source is called twice | `breaker.ts:23, 64`; `cat.v2.ts:437-442` | Add to the Story 4.4 deferral (the production adapter) that its call, including the 3 transport retries, ends within 45 s, under the 60 s lease | XS |
| F7 | LOW | **The Impl-2 race proofs are not bound in §14.** Each §14 row binds its Solu-2 test. The Impl-2 tests that prove the same ADs under concurrency are bound to stories only: `[S-SYS.jobs.C1]` and `[COM-3.C2]` (AD-SYS-4 rule 7), `[S-FR-MSG-7.C1]` (AD-MSG-3), `[S-FR-REP-7.C1]` (AD-REP-2), `[S-FR-REP-5.C1]` (AD-12, AD-REP-3), `[COM-3.C1]` (AD-COM-1 rule 4) and `[S-FR-IDN-7.signup.*]` (AD-IDN-3) | `contracts.md:1480-1543` (the §14 table) | Add them to their AD rows, then `gen:epics:solu2` and `gen:trace:solu2` | XS |
| F8 | LOW | **The binder writes have no race test.** `addExternalEntry`, `moveOrCopyEntry` and `reorderEntries` assign `manualPosition` under `col:owner` (`col.v2.ts:289, 308, 399`). No test races them, and no unique index backs the lock (`collection_entry_binder_order` is a plain index, `001_tezg_schema.sql:961`). The same holds for `setCommissionRate`'s `UNIQUE ("effectiveFrom")` | `col.v2.ts:275-325, 394-410` | One race test: 20 concurrent `addExternalEntry` calls into one collection leave 20 distinct positions, plus a concurrent reorder. Optionally, a deferred unique `(collectionId, manualPosition)` | S |
| F9 | LOW | **`ports-and-adapters.md` was not updated for Impl-2.** It has no rows for the job runner (`JobRunner`, `JobLocks`, `JobRunRepository`), the `EmailSender` port, the `/api/auth` and `/api/jobs` driving adapters, the breaker in catalog's core domain, or `moderation-log.ts`. Its jobs diagram lacks `outbox-sweep` (`:152`). §1 still puts the system clock in `shared-kernel/clock/system.ts` (`:36`; it moved to `app/_server/runtime.ts`, Impl-2 #2) and the pool at `max 1` (`:37`). ARCHITECTURE §8.2 does not list `FxRateCircuitOpen`, `FxSourceHealthy` or `FxSourceProbing` | `ports-and-adapters.md:36-37, 69, 152` | Refresh the map with the Impl-2 rows. The §8.2 codes can point to contracts.md §13, which is the registry | S |
| F10 | LOW | **Admin checks go through identity's repository type.** Story 13.5 made `InvRepository = InvTablesRepository & AdminFactsReader` (`listings/ports/inv.v2.ts:155`). This follows Impl-1 #32 (commission, messaging, reviews). AD-8 holds, because identity's adapter reads its own `"User"` table, and lint passes. The hexagonal cost is that listings' port type depends on identity's repository shape, not on a neighbour port such as `IdentityForInv` | `inv.v2.ts:609`; `identity/application/admin.ts:11-24` | **(a)** Keep it: an accepted pattern, documented in Impl-1 #32. **(b)** In the next revision, move `isAdmin` onto each module's identity neighbour port | a: — · b: M |

**Outside scope, noted only.**
- The Impl-1 `create*Module` factories in the module `index.ts` files are a second, dormant wiring path for the v1 services.
- The lint rules that AD-SYS-4 to AD-SYS-7 name (`no-nested-tx`, `no-session-state`, `no-system-clock`, `no-direct-io`, `money`, `no-select-then-write`) are partly fitness functions and partly missing. That is an Impl-1 matter, except where F2 depends on it.

## 9. Trade-offs I would keep

- **Integration-first proofs over more unit tests for locks.** Each lock is proven by a real-Postgres race plus a mutation check. That is the right evidence for a lock, and no unit test could replace it.
- **The breaker's 30-minute cool-down below the hourly tick.** The hourly attempt of NFR-CAT-4 survives, and only admin retries and concurrent callers are stopped (#32).
- **`NotImplementedError` bypassing the breaker.** An unwired adapter is a deployment fact, not a source outage. Counting it would open the breaker and hide the real cause behind `circuitOpen`. F3, not the breaker, is where its visibility belongs.
