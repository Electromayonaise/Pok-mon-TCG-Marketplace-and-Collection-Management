---
title: 'Story 1.5: Show admins the delivery and tick health'
type: 'feature'
created: '2026-10-25'
status: 'in-review'
baseline_commit: '0e6481d'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/docs/solu-2/planning/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `AdminEventsServiceV2.getTickHealth`, `listDeliveries` and `getDeliveryHealth` throw `NotImplementedError`, so the 3 bound tests `[S-SYS.tick.h]`, `[S-SYS.deliveries.h]` and `[S-SYS.health.h]` are red. As a result, page 2.3 cannot show a silent tick, a failed delivery or a stuck delivery (AD-SYS-2 rule 9, ARCH §4).

**Approach:** Add three read methods to `AdminEventsRepository`, implemented in `PgAdminEventsRepository`. Each one runs in one read-only transaction. The service derives the tick silence from `clock.now()`; the time never comes from SQL `now()`. Wire the three procedures in `composition.ts`, as decision #24 does for the done procedures.

## Boundaries & Constraints

**Always:**
- **Tick (ARCH §4):**
  - `lastTickStartedAt` is the latest `"JobRun"."startedAt"` with `trigger = 'tick'` and `startedAt <= now`, in any outcome, or `null`.
  - `tickSilent` is true when both hold:
    - the read falls in the Bogotá window [10:17, 23:17], inclusive (UTC−5, no DST);
    - no tick started after `now − 3h`, meaning `lastTickStartedAt` is null or `lastTickStartedAt <= now − 3h`.
  - `decision` cites `AD-SYS-2` with `{ lastTickStartedAt, readAt }`. It uses one of two new stored-only §13 codes, `TickSilent` or `TickOnSchedule`, with `outcome: 'allowed'` (the rule of decision #16).
- **Deliveries (AD-SYS-2 rule 9):**
  - Each page holds 25 rows, joined with `"OutboxEvent".type` as `eventType`.
  - `failed` rows have `status = 'failed'` and are ordered by `("firstFailedAt", "eventId", subscriber)`.
  - `stuck` rows have `status = 'pending' AND "createdAt" < now − 24h` and are ordered by `("createdAt", "eventId", subscriber)`.
  - The cursor is an opaque base64url string over the last row's sort key, read with keyset `>`. `nextCursor` is set only when a 26th row exists.
  - A malformed cursor is `RequestValidationFailed` (400), citing `field: 'cursor'`.
- **Health:** returns the `failed` count and the oldest `firstFailedAt`, the stuck-pending count (same 24 h rule), and the latest `"FailedDeliveryDigest"` row by `date`, or `null`. The digest `date` is returned as `YYYY-MM-DD`.
- Every instant is an ISO string. `now` and `now − Δ` are bound as parameters.
- The admin check stays in the tRPC `admin` builder; the service does not repeat it.

**Ask First:** a third tick code for "never ran"; adding UI work (page 2.3 is Impl-2); changing any DTO.

**Never:** changing the bound tests or the DTOs; a write; reading a regulated column; SQL `now()`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tick on schedule | tick at T0 (10:00 Bogotá), read at 11:00 | `{ lastTickStartedAt: T0, tickSilent: false }`, `TickOnSchedule` | N/A |
| Tick silent | same, read at 13:01 | `tickSilent: true`, citation `{ lastTickStartedAt: T0 }`, `TickSilent` | N/A |
| Outside window | no tick, read at 08:00 Bogotá | `{ lastTickStartedAt: null, tickSilent: false }` | N/A |
| No tick in window | no `JobRun`, read at 12:00 Bogotá | `tickSilent: true` | N/A |
| Failed page | 27 failed rows | 25 rows starting at the oldest `firstFailedAt`; the cursor's page holds the other 2, `nextCursor: null` | N/A |
| Stuck | pending at 25 h and at 23 h | only the 25 h row | N/A |
| Bad cursor | `cursor: 'x'` | — | `RequestValidationFailed` 400 |
| Health | 2 failed, 1 delivered, 1 stuck, no digest | `{ failedCount: 2, oldestFirstFailedAt, stuckPendingCount: 1, latestDigest: null }` | N/A |

</frozen-after-approval>

## Code Map

- `src/shared-kernel/admin-events.ts` -- service and repository port; replay shows the Decision shape
- `src/shared-kernel/infra/pg-admin-events.ts` -- the Postgres adapter
- `docs/solu-2/planning/detailed-design/contracts.md` §13 -- stored-only rows; `npm run gen:api:solu2` regenerates `messages.generated.ts`
- `src/server/composition.ts` -- `resolvers()`; `composition.test.ts` proves wiring over HTTP
- `docs/solu-2/test/atdd/sys_contracts.test.ts` -- the 3 bound tests

## Tasks & Acceptance

**Execution:**
- [x] `contracts.md` §13 + generator comment -- add `TickSilent` and `TickOnSchedule`, both stored only, and regenerate -- one template source (AD-SYS-1 rule 6)
- [x] `src/shared-kernel/admin-events.ts` -- repository methods `readLastTickStartedAt`, `listDeliveries`, `readDeliveryHealth`; a pure `isTickSilent(now, last)` and the cursor codec; the three service methods -- the logic is testable without a database
- [x] `src/shared-kernel/infra/pg-admin-events.ts` -- the three SQL reads, each with bound instants -- AD-SYS-6
- [x] `src/shared-kernel/admin-events.test.ts` -- unit cases for the window edges (10:16, 10:17, 23:17, 23:18), the exact 3 h boundary, the cursor round-trip and the second page, the bad cursor, and the latest digest -- the matrix rows the bound tests do not cover
- [x] `src/server/composition.ts` + `composition.test.ts` -- wire `admin.jobs.tickHealth`, `admin.events.deliveries` and `admin.events.deliveryHealth`; add one HTTP case for an admin read -- decision #24

**Acceptance Criteria:**
- Given the bound tests, when `npx vitest run --project solu2-atdd docs/solu-2/test/atdd/sys_contracts.test.ts` runs, then `[S-SYS.tick.h]`, `[S-SYS.deliveries.h]` and `[S-SYS.health.h]` pass.
- Given a malformed cursor, when `listDeliveries` runs, then it raises `RequestValidationFailed` (400) and reads nothing.
- Given Story 1.5 marked `done`, when `npm run test:ci` runs, then every gate stays green.

## Verification

**Commands:**
- `npm run gen:api:solu2` then `git diff --stat` -- expected: only `messages.generated.ts` changes
- `npm run test:unit` -- expected: all pass
- `npm run test:ci` -- expected: exit 0

## Implementation Notes

- Two stored-only codes join contracts.md §13, `TickOnSchedule` and `TickSilent`, so the tick decision renders from the one template source. They follow the rule of decision #16 for allowed reads. `messages.test.ts` now accepts `lastTickStartedAt` as an instant input.
- `toErrorBody` (`src/server/trpc/errors.ts`) now gives a service-raised `RequestValidationFailed` the same `issues` array the parser's refusals carry. Before, only zod refusals had `issues`, so a bad cursor reached the client without one.
- Outside the 10:17–23:17 window no tick is not silence, even when none ever ran: the scheduler runs no tick then (ARCH §4). The HTTP case at T0 (10:00 Bogotá) proves it: `tickSilent: false`, `TickOnSchedule`.
- The deliveries keyset compares the whole sort key `(at, eventId, subscriber)`, so a page edge inside a tie on `firstFailedAt` neither skips nor repeats a row; the unit case builds 27 rows in pairs that share a time.
- Code review is batched with Story 1.4 at the close of Epic 1 (decision #22).
