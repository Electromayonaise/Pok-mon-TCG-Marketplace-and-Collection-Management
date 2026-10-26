# Deferred Work

Findings a code review chose not to fix now, with the reason. Each later review reads this file first.

## Deferred from: code review of 1-4-keep-time-sockets-and-module-boundaries-deterministic (2026-10-25)

- `regulated-select` false negatives on `RETURNING`, concatenated or interpolated SQL, schema-qualified and unquoted uppercase names. The rule guards the repo's literal style; the DB-backed fitness tests remain the proof.
- `error-owner` misses an aliased `raiserFor` and member callees (`x.raiserFor`). No such call exists; revisit if one appears.
- The drift test reads column markers only; table-level `-- regulated` markers and `TRUNCATE a, b` lists are not parsed. The schema has neither today.

## Deferred from: code review of 1-5-show-admins-the-delivery-and-tick-health (2026-10-25)

- The `OR $1 IS NULL` keyset predicate may keep the planner off the partial index on large tables. Volumes are tiny; measure before splitting the statement.
- No test for the stuck list's second page, nor that a refused cursor reads nothing. The failed list covers the keyset; the decoder throws before the read.
- `TickSilent` renders "(sin dato)" when no tick ever ran. Wording polish for the admin UI story.

## Deferred from: spec of 2-4-refuse-unverified-buyers-and-throttle-failed-sign-ins (2026-10-25)

- `checkAuthThrottle` only counts. Inserting an `"AuthThrottleEvent"` row on each failed sign-in or sign-up, and the Better Auth `hooks.before` that calls the check, belong to the story that configures sign-in and sign-up (`src/server/auth.ts` has neither yet). Until then nothing writes the table. No story in `epics.md` configures them: decision log Impl-1 #26 gives the work to Story 2.4's completion in Impl-2.

## Deferred from: code review of 2-4-refuse-unverified-buyers-and-throttle-failed-sign-ins (2026-10-25)

- Throttle hardening for the story that wires the hook: the per-account limit lets anyone who knows an email lock that account out (AD-IDN-3 as designed; decide there whether the account key needs the IP too); the hook must pass a 64-hex `ipHmac` and `null`, never `''`, for an unknown account; the insert must write the clock's millisecond instants so `retryAt` frees the key on time.

## Deferred from: code review of 2-5-trace-capabilities-for-admins-and-answer-neighbours-identity-queries (2026-10-25)

- ~~`PgAuditLog.record` stamps `createdAt` with its own clock read, so an audited use case reads the clock twice (pre-existing, shared with Story 2.1). The fix passes the instant through the `AuditLog` port.~~ Resolved before Epic 3: `AuditEntry.at` carries the writer's `now`, and both identity call sites pass it.
- IDN-3 Q4's per-line es-CO text: `CapabilityTraceLine` has no text field; page 1.3 (Impl-2) renders each line from `derivedFrom`.
- The contact card's `IndividualSellerProfileIncomplete` carries the seller-facing text. Story 9.3 (the contact handoff) calls it only for an individual listing's seller and owns the buyer-facing refusal.
- A `"User"` row deleted mid-trace surfaces as an FK violation (500) instead of `AccountNotFound`. No flow deletes a `"User"` row today.
