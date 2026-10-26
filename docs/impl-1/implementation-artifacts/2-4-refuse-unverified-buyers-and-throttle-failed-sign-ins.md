---
title: 'Story 2.4: Refuse unverified buyers and throttle failed sign-ins'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: 'af976248ede65b30984e607b5a71b2da78b62532'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/docs/solu-2/planning/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `IdnServiceV2.requireCanBuy` and `checkAuthThrottle` throw `NotImplementedError`, so the bound tests `[S-FR-IDN-7.h]` and `[S-FR-IDN-7.f]` are red. Every `canBuy` procedure (orders, offers, messages, reviews, contact) refuses with a 500 instead of passing a verified buyer or refusing an unverified one, and nothing counts failed sign-ins (AD-IDN-3, S-8).

**Approach:** `requireCanBuy` is a projection of the one `deriveCapabilities` read (AD-IDN-1 rule 2). `checkAuthThrottle` counts `"AuthThrottleEvent"` rows per key in the window with one read per limit; the limits live in the domain as data. Both are read-only.

## Boundaries & Constraints

**Always:**
- **canBuy (AD-IDN-3 rule 2):**
  - Read the facts with the existing `factsOf` (ambient transaction or a read-only one).
  - `canBuy=false` raises `EmailNotVerified` (403) citing `FR-IDN-1` with the `derivedFrom` facts of the `canBuy` line (`emailVerified`, `signupConsentAt`).
  - `canBuy=true` returns `{ canBuy: true, decision }`: `outcome: 'allowed'`, a new stored-only §13 code `BuyerEligible`, the same citation, `occurredAt: clock.now()` (the rule of decision #16).
  - No `"User"` row for the session's id raises `NotAuthenticated` (401): the session points at no account.
- **Throttle (AD-IDN-3 rules 3–4):**
  - `signInFail`: at most 10 rows with `key = accountId` (skipped when `accountId` is null) and 30 with `key = ipHmac`, each within 15 min.
  - `signUp`: at most 5 rows with `key = ipHmac` within 1 h; `accountId` is ignored.
  - The window is `(now − window, now]`, both bound as parameters (AD-SYS-6).
  - A limit trips when its limit-th newest row lies in the window. Its `retryAt` is that row's `createdAt + window`: when it expires, the key is under the limit again. When several limits trip, the latest `retryAt` wins.
  - Refusal: `AuthRateLimited` (429) citing `FR-IDN-7` with `{ scope, limit, windowMinutes, retryAt }`. The citation never carries `accountId` or `ipHmac`.
  - Under the limits: `{ allowed: true }`.
- Zero writes in both methods.

**Ask First:** recording failed sign-ins and sign-ups, and the Better Auth `hooks.before` wiring that calls the throttle. Sign-in and sign-up are not configured yet (`src/server/auth.ts`), so this story delivers the check and the story that configures them adds the insert and the hook. Also ask before changing a DTO or a limit.

**Never:** storing or citing a raw IP; an advisory lock (the AD-IDN-3 trade-off); SQL `now()`; changing the bound tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Verified buyer | Camila, `emailVerified: true` | `{ canBuy: true }`, `BuyerEligible`, rule `FR-IDN-1` | N/A |
| Unverified buyer | Julián, `emailVerified: false` | — | `EmailNotVerified` 403 citing `emailVerified: false` |
| Ghost session | no `"User"` row | — | `NotAuthenticated` 401 |
| 11th failed sign-in | 10 `signInFail` rows for the account at T0, now T0 | — | `AuthRateLimited` 429, `retryAt` = T0 + 15 min |
| Under the limit | 9 rows | `{ allowed: true }` | N/A |
| Window passed | 10 rows at T0 − 15 min | `{ allowed: true }` (exclusive lower edge) | N/A |
| IP limit | 30 `signInFail` rows on the `ipHmac`, `accountId: null` | — | `AuthRateLimited` 429 |
| Sign-up | 5 `signUp` rows on the `ipHmac` within 1 h | — | `AuthRateLimited` 429, `windowMinutes: 60` |

</frozen-after-approval>

## Code Map

- `src/modules/identity/application/idn.v2.ts` -- `IdnServiceV2`; `factsOf`, the decision shape of `requireListingEligibility`
- `src/modules/identity/domain/idn.ts` -- `deriveCapabilities`; the throttle limits go here as data
- `src/modules/identity/ports/idn.v2.ts` + `infra/pg.ts` -- the repository port and its Postgres adapter
- `src/modules/identity/application/gate.ts` -- already forwards `requireCanBuy` to the service; no change
- `docs/solu-2/planning/detailed-design/contracts.md` §13 -- stored-only rows; `npm run gen:api:solu2` regenerates the messages
- `docs/solu-2/test/atdd/idn_contracts.test.ts` -- the 2 bound tests

## Tasks & Acceptance

**Execution:**
- [x] `contracts.md` §13 -- add `BuyerEligible` (stored only, identity) and regenerate -- one template source (AD-SYS-1 rule 6)
- [x] `domain/idn.ts` -- `AUTH_THROTTLE_LIMITS` per scope and a pure `throttleRetryAt` that picks the latest `retryAt` -- testable without a database
- [x] `ports/idn.v2.ts` + `infra/pg.ts` -- `readThrottleCutoff(tx, { scope, key, since, until, limit })`: the `createdAt` of the limit-th newest row in the window, or null; one statement on the `(scope, key, "createdAt")` index
- [x] `application/idn.v2.ts` -- `requireCanBuy` and `checkAuthThrottle`; the clock is read once per call
- [x] `application/idn.v2.test.ts` (or the domain test) -- the matrix rows the bound tests do not cover: unverified, ghost session, 9 rows, the window edge, the IP limit, sign-up, and two tripped limits
- [x] the messages test -- accept `retryAt` as an instant input if it is not already listed

**Acceptance Criteria:**
- Given the bound tests, when `npx vitest run --project solu2-atdd docs/solu-2/test/atdd/idn_contracts.test.ts -t "S-FR-IDN-7"` runs, then `[S-FR-IDN-7.h]` and `[S-FR-IDN-7.f]` pass.
- Given an unverified email, when a `canBuy` procedure runs, then it raises `EmailNotVerified` (403) and writes nothing.
- Given Story 2.4 marked `done`, when `npm run test:ci` runs, then every gate stays green.

## Verification

**Commands:**
- `npm run gen:api:solu2` then `git diff --stat` -- expected: only the generated messages change
- `npm run test:unit` -- expected: all pass
- `npm run test:ci` -- expected: exit 0

## Implementation Notes

- Code review is batched with Story 2.5 at the close of Epic 2 (decision #22).
- Scope: this story is listed under `impl2_scope` (Appendix B.2). It was built with the Epic 2 batch on Martín's approval of this spec (2026-10-25), so it is `done` early and does not count toward the 43 Impl-1 stories.
- The pure domain function is `throttleRefusal(checks)`: it returns the tripped limit together with the latest `retryAt`, because the citation needs both. The task named it `throttleRetryAt`.
- `factsOf` now sits on a private `reading(fn)` helper (ambient transaction, or a read-only one of its own), which `checkAuthThrottle` also uses for its reads.
- `requireCanBuy` reads the clock only on the allowed path, to date the decision; a refusal carries no instant.
- Unit tests: `src/modules/identity/application/idn.v2.test.ts` (10 cases). The messages test already lists `retryAt` as an instant, so no change was needed there.
- Recording `"AuthThrottleEvent"` rows and the Better Auth hook are logged in `deferred-work.md`.
