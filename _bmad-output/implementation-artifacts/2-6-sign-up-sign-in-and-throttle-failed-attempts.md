---
title: 'Story 2.6: Sign up, sign in and throttle failed attempts'
type: 'feature'
created: '2026-11-03'
status: 'in-progress'
baseline_commit: '7ac39a2'
review_loop_iteration: 0
flow: 'Impl-2 Flow A, ATDD-first (test-design.md §7.1): red tests committed before any guard code; one code review per epic batch (decision log Impl-2 #4)'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 2.4 delivered `requireCanBuy` and a read-only `checkAuthThrottle`, but Better Auth has no sign-up or sign-in method configured, nothing writes `"AuthThrottleEvent"`, and no hook calls the check (Impl-1 #26). So no user can sign up or sign in, and the brute-force limit is not active. The Flow E journeys also need a real sign-in.

**Approach:** email-and-password in Better Auth, served behind a guard, `src/server/auth-routes.ts`, reached through `compose().auth`. Decisions approved by Mateo (decision log Impl-2 #11):
- **D3** an unverified user may sign in, and `requireCanBuy` keeps the money paths gated; verification goes through an `EmailSender` port, with `UNWIRED_EMAIL` in production and a capturing adapter in tests;
- **D4** the AD-IDN-3 limits as designed: 10 failed sign-ins per account and 30 per IP in 15 min, and 5 sign-ups per IP per hour.

## Boundaries & Constraints

**Always:** consent is checked before Better Auth runs, and recorded with the Clock's instant in the user insert (AD-IDN-3 rule 1); the throttle check runs before the password check, so the 11th attempt is refused even with the right password; one row per known key after a failure, with keys that are account ids or a 64-hex `ipHmac`, never a raw IP and never `''` (rule 4, S-7); refusals are `{ error: ErrorBody }`. **Ask First:** a change of the limits or of the consent version. **Never:** Better Auth's own rate limiter alongside this one; an email address or a token in a log.

</frozen-after-approval>

## Code Map

- `src/server/auth-routes.ts` -- the guard: the consent check, the throttle before, the throttle rows after
- `src/server/auth.ts` -- `createAuth`: email and password, the consent fields, the verification email, the Clock
- `src/modules/identity/application/idn.v2.ts` + `infra/pg.ts` -- `recordAuthThrottleEvent`, `accountIdForEmail`
- `src/shared-kernel/external.ts` -- `EmailSender`; `test-support/simulated` -- `CapturingEmailSender`
- `src/server/composition.ts` -- `auth` and the guard; `app/api/auth/[...all]/route.ts`, `app/_server/runtime.ts`
- `_bmad-output/test-artifacts/atdd/idn_auth.test.ts` -- the 6 bound tests (red first)

## Tasks & Acceptance

**Execution:**
- [x] red: the 6 bound tests, the Story 2.6 clauses of `S-FR-IDN-7`, the stubs; R-22 in `test-design.md` §2; red run in `evidence/impl2/12-story-2.6-red.log`
- [ ] green: the guard, `createAuth`, the identity methods, the composition and the route
- [ ] `npm run test:ci` green with 2.6 `done`

**Acceptance Criteria:**
- Given the current consent, when Camila signs up, then an unverified user with its consent instant, a hashed password, one verification link and one ipHmac-keyed throttle row.
- Given 10 failed sign-ins, when the 11th arrives, then 429 `AuthRateLimited` citing `retryAt`; 15 min later she signs in.
- Given an unknown email, or no caller IP, then only the keys that exist are recorded.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/idn_auth.test.ts` -- expected: 6 passed
- `npm run test:ci` -- expected: exit 0

**Red phase (Flow A):** `evidence/impl2/12-story-2.6-red.log`: 6 failed on `NotImplemented: auth.serveAuth`; `gate:atdd-red:impl1`: 34 red for the right reason, 0 not as expected.
