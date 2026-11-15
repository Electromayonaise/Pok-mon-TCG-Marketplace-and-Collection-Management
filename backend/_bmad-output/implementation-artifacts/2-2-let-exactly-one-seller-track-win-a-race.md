---
baseline_commit: 7f903f2
---

# Story 2.2: Let exactly one seller track win a race

Status: done

<!-- Epic entry: _bmad-output/planning-artifacts/epics.md, "Story 2.2". Ceremony: compact (decision log Impl-1 #22, task-statement.md §3). -->

## Story

As the platform,
I want a profile completion and a business claim racing on one account to leave exactly one track,
so that no account is ever both seller kinds (Annex A MEC, R-01).

- **Kind:** MEC. No operation of its own; it proves `IDN-1`, which Story 2.1 owns.
- **Depends on:** Story 2.1 (`done`).
- **Traceability:** FR-IDN-2, FR-IDN-4, FR-VER-1. NFR-IDN-2. Risk R-01 (P0).
- **Binding invariants:** AD-18 and AD-IDN-2 (the conditional `UPDATE "User"."sellerTrack"`, plus the composite FKs), AD-SYS-4.

## Acceptance Criteria

**AC1 (MEC, `[IDN-1.MEC]`).**
- *Given* a fresh account, 100 times,
- *when* a profile completion and a business `claimSellerTrack` start together behind a barrier,
- *then* exactly one succeeds each time: the account is individual with one profile, or business with none.

**AC2 (failure, `[IDN-1.QF1]`, `[IDN-1.QF2]`, `[IDN-1.I1]`).**
- *Given* Andrés has a Pending business application, and Valentina is a complete individual seller,
- *when* an individual claim is made for him, and a business claim for her,
- *then* `BusinessApplicationOnFile` (409) and `IndividualSellerProfileAlreadyComplete` (409), with nothing changed; no application exists for an individual.

## Tasks / Subtasks

- [x] **Task 1: harness.** Two wirings in one test must not issue the same row id. `wiring(db)` now draws ids from one `SequentialIds` per database and prefix (`test-support/solu2/fixtures.ts`). Before this, each `idn()` call restarted the sequence at `n1`, so MEC's second repetition collided on `audit_events.id` (`23505`).
- [x] **Task 2: proof.** The 4 bound ATDD tests pass against Postgres with real pooled connections; MEC runs its full 100 repetitions.
- [x] **Task 3: TG-7.** The MEC runtime is recorded below.
- [x] **Task 4: verification.** Mark the story `done`; `gate:atdd-red:impl1` and `test:ci` stay green.

## Dev Notes

- **No production code.** Story 2.1's conditional update already serializes the two claims on the `"User"` row lock under READ COMMITTED; the loser re-evaluates its `WHERE`, updates 0 rows and raises its Q-fail code.
- **Harness safety.** No test asserts a generated id's value, and `useTestDatabase` truncates every table per test, so one sequence per database changes no expectation.
- **Message copy.** The `BusinessApplicationOnFile` placeholder was fixed in Story 2.1's review (it now reads `{latestApplicationStatus}`, the Q4 input).

## Dev Agent Record

### Agent Model Used

claude-opus-5-5 (Claude Code), the compact ceremony (#22).

### Completion Notes List

- **MEC runtime (TG-7):** 100 repetitions in 582–698 ms (three runs: 698, 582, 608 ms) against Postgres 16.6 in Docker (`tezg-pg-alt`, port 15432), two pooled connections per repetition. Both-succeeded = 0, neither-succeeded = 0.
- QF1, QF2 and I1 pass on Story 2.1's code alone.

### File List

- `test-support/solu2/fixtures.ts` (modified: one id sequence per database and prefix)
- `_bmad-output/implementation-artifacts/2-2-let-exactly-one-seller-track-win-a-race.md` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

## Change Log

- 2026-10-25: story created (compact, #22); harness id fix; 4 proof tests green; MEC runtime recorded; status done.
