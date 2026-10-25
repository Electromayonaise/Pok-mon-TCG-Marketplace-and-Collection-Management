---
baseline_commit: 792ac82
---

# Story 2.1: Complete the individual-seller profile and claim the track

Status: done

<!-- Epic entry: docs/solu-2/planning/epics.md, "Story 2.1" (line 441). Ceremony: compact (decision log Impl-1 #22, task-statement.md §3). -->

## Story

As Valentina, a new user,
I want to complete my individual-seller profile once,
so that my account becomes an individual seller and my phone is kept only in the profile.

- **Kind:** Core. Contracts `IDN-1` (`claimSellerTrack`) and `IDN-1.ingress` (`completeIndividualProfile`).
- **Depends on:** Stories 1.1 and 1.2 (`done`).
- **Traceability:** FR-IDN-2, FR-IDN-4, FR-VER-1 rule 1. NFR-IDN-2. UI 1.1 (dev), 1.2.
- **Binding invariants:** AD-18 and AD-IDN-2 (the conditional `UPDATE "User"."sellerTrack"`, plus the composite FK), AD-SYS-4 (`tx` first; the `"User"` row is lock position 2).

## Acceptance Criteria

**AC1 (happy, `[IDN-1.Q1]`).**
- *Given* a user with no track,
- *when* `claimSellerTrack(tx, { track: 'individual' })` runs,
- *then* it returns `{ claimed: 'individual' }`, `"User".sellerTrack = 'individual'`, and exactly one `identity.sellerTrack.claimed` audit row exists.

**AC2 (happy, `[IDN-1.ingress.h]`).**
- *Given* Valentina has no track,
- *when* she completes the profile with `+573001234567`, the sharing consent and a Bogotá meeting point,
- *then*:
  - she gets `sellerKind: 'individual'`, with `completedAt` set to the `Clock`'s instant;
  - one profile row holds the phone and the city;
  - no audit row contains the phone.

**AC3 (failure, `[IDN-1.ingress.f]`).**
- *Given* Valentina already completed her profile,
- *when* she submits it again,
- *then* she gets `IndividualSellerProfileAlreadyComplete` (409), and one profile row remains.

## Tasks / Subtasks

- [x] **Task 1: domain.** Add the pure Q-fail mapping `claimRefusal(track, facts)` to `domain/idn.ts`, unit-tested over every row of IDN-1 Q-fail.
- [x] **Task 2: port and adapter.**
  - Declare in `IdnRepository` the three methods IDN-1 needs: `claimSellerTrack`, `readTrackAndLatestStatus` and `insertIndividualProfile`.
  - Implement them as `PgIdnRepository` in `infra/pg.ts`, every statement on the caller's `tx`.
- [x] **Task 3: wiring.** `wiring().repo` becomes one object that binds both adapters, `PgAdminEventsRepository` and `PgIdnRepository`. A method name defined twice fails loudly at wiring time (the 1.3 review's L3 hazard).
- [x] **Task 4: `claimSellerTrack` (AC1).**
  - Q1: the conditional update, `"updatedAt" = now`.
  - Q3: one audit row in `tx`, with no event.
  - Q-fail: re-read the facts in `tx`, then throw the `DomainError` that `claimRefusal` names, citing `AD-IDN-2 rule 3` with `{ sellerTrack, latestApplicationStatus }` (Q4).
- [x] **Task 5: `completeIndividualProfile` (AC2, AC3).**
  - In one transaction, read the `Clock` once, claim `'individual'`, then insert the profile, with consent, completion and row timestamps set to that one instant.
  - Return `{ sellerKind, completedAt, decision }`, where `decision` cites the new stored-only row `IndividualSellerProfileCompleted` (Dev Notes).
- [x] **Task 6: verification.**
  - The 3 bound ATDD tests pass.
  - Mark the story `done`; then `gate:atdd-red:impl1` and `npm test` stay green.

## Dev Notes

- **Current state.**
  - `IdnServiceV2` has only stubs.
  - `IdnRepository` is empty.
  - `infra/pg.ts` holds only the Solu-1 stub classes, which stay untouched.
  - `wiring().repo` is `new PgAdminEventsRepository()`.
  - The hand-owned code follows `// </gen-solu2-api>` (#14).
- **Success decision.** Contracts §13 holds only refusal templates. Decision log #16 already settled how a success gets its text: a stored-only §13 row, which the generator emits without touching `codes.ts`. This story applies that rule: `IndividualSellerProfileCompleted` (identity), outcome `allowed`, citing `FR-IDN-2` with `{ sellerKind: 'individual' }`. No new decision is involved.
- **Regulated data.** The phone goes only into `"IndividualSellerProfile"`. The audit `data` is `{ track }`.
- **Time.** IDN-1 reads the `Clock` once per transaction. A private `claim(tx, input, now)` serves both entry points, so the ingress reads `now` once.
- **Isolation.** READ COMMITTED (the default). A losing concurrent claim waits on the row lock, then re-evaluates its `WHERE` and updates 0 rows. That is 2.2's MEC proof; this story only has to keep it possible.
- **Not in scope.**
  - No tRPC router: no `access.*` procedure exists yet, and the epic lists only service, port, domain and infra.
  - QF1, QF2, I1 and MEC belong to 2.2.

### Cross-story notes (for 2.2)

The `BusinessApplicationOnFile` template interpolated `{status}`, but Q4's citation inputs are `{ sellerTrack, latestApplicationStatus }`, so the message would have rendered "(sin dato)". This story's review fixed it in contracts.md §13: the template now reads `{latestApplicationStatus}`, the code path being this story's.

## Dev Agent Record

### Agent Model Used

claude-opus-5-5 (Claude Code), the compact ceremony (#22).

### Debug Log References

- Postgres on 55432 is refused by Windows (reserved range 55383–55482). Tests ran against `tezg-pg-alt` (postgres:16.6, same flags) on 15432 with `TEZG_PG_PORT=15432`.

### Completion Notes List

- AC1–AC3 green: `[IDN-1.Q1]`, `[IDN-1.ingress.h]`, `[IDN-1.ingress.f]`. Unit: `claimRefusal` (8), `oneRepository` (2). `test:ci` green with 2.1 and 2.2 `done`.
- **Red gate at this commit.** 2.2 is proof-only (Files: —) and its 4 tests prove this story's code. At this commit, QF1, QF2 and I1 already pass, which the gate flags as premature greens. MEC fails on a harness id collision, which 2.2 fixes. The gate is green again from 2.2's commit, which follows directly. The rule for proof-only stories in general is pending Martín's decision.
- **Review (subagent, compact ceremony).**
  - **H1 (fixed).** `gate:purity` scans every file in `domain/`, so the unit test moved to `src/modules/identity/idn-domain.test.ts`.
  - **Template fix.** The `{status}` placeholder became `{latestApplicationStatus}` (contracts.md §13 and the generated catalog). `latestApplicationStatus` joins the enum-value placeholders of the #11 test.
  - **L1 (deferred).** `PgIdnRepository` is exported from the identity index for the composition. A composition-only entry point or a deps rule can come later.
  - **L2 (deferred).** `oneRepository` copies prototype methods only; class-field methods would be dropped. No adapter uses them.
  - **L3 (for VER-2).** The public `claimSellerTrack(tx, …)` reads the `Clock` itself, so when `verification.submit` calls it inside its own `tx` it should pass its `now` instead.

### File List

- `src/modules/identity/domain/idn.ts` (modified: `claimRefusal`)
- `src/modules/identity/idn-domain.test.ts` (new)
- `src/modules/identity/ports/idn.v2.ts` (modified: `IdnRepository`, `IndividualProfileRow`)
- `src/modules/identity/infra/pg.ts` (modified: `PgIdnRepository`)
- `src/modules/identity/index.ts` (modified: exports `PgIdnRepository`)
- `src/modules/identity/application/idn.v2.ts` (modified: `claimSellerTrack`, `completeIndividualProfile`)
- `src/shared-kernel/repositories.ts`, `src/shared-kernel/repositories.test.ts` (new)
- `src/shared-kernel/messages.generated.ts` (regenerated), `src/shared-kernel/messages.test.ts` (modified)
- `scripts/gen-solu2-api.mjs` (comment), `docs/solu-2/planning/detailed-design/contracts.md` (§13 rows)
- `test-support/solu2/fixtures.ts` (modified: `oneRepository` wiring)
- `docs/impl-1/implementation-artifacts/sprint-status.yaml` (modified)

## Change Log

- 2026-10-25: story created (compact, #22); status ready-for-dev, then in-progress.
- 2026-10-25: implemented test-first; review H1 and the template fix applied; status done.
