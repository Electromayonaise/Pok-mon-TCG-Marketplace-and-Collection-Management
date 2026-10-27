# Deferred Work

Findings a code review chose not to fix now, with the reason. Each later review reads this file first.

## Deferred from: code review of 1-4-keep-time-sockets-and-module-boundaries-deterministic (2026-10-25)

- `regulated-select` false negatives on `RETURNING`, concatenated or interpolated SQL, schema-qualified and unquoted uppercase names. The rule guards the repo's literal style; the DB-backed fitness tests remain the proof. (Story 3.4 closes the gap for the legal identity: `legal-identity-confined` refuses any literal naming `"BusinessApplicationLegalIdentity"` outside `legalIdentityRepository.ts`, so a `RETURNING` or interpolated read of that table elsewhere fails lint.)
- `error-owner` misses an aliased `raiserFor` and member callees (`x.raiserFor`). No such call exists; revisit if one appears.
- The drift test reads column markers only; table-level `-- regulated` markers and `TRUNCATE a, b` lists are not parsed. The schema has neither today.

## Deferred from: code review of 1-5-show-admins-the-delivery-and-tick-health (2026-10-25)

- The `OR $1 IS NULL` keyset predicate may keep the planner off the partial index on large tables. Volumes are tiny; measure before splitting the statement. (Story 3.5's review queue uses two statements from the start; the deliveries list still has the predicate.)
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

## Deferred from: 3-1-submit-a-business-application-with-its-legal-identity (2026-10-26)

- The production `ObjectStorage` and `MalwareScanner` adapters need a provider and a dependency approval. Until they land, `compose()` binds `UNWIRED_STORAGE` and `UNWIRED_SCANNER`, so a production submit that reaches promotion fails as NotImplemented (500), never silently. Tests bind `InMemoryObjectStorage` and `SimulatedScanner`.
- The upload ticket for `business-document/<businessId>/<cuid2>`, the client step before VER-2, is not wired yet. It belongs to the story that wires the upload procedures.
- The payment QR (`paymentInstructions.qrUploadKey`) is refused until it has an upload ticket and a promotion like the documents' (owner prefix, size, magic bytes, scanner, server-generated key). `qrObjectKey` stays `null` until then. Both VER-2 and `updatePaymentInstructions` refuse it. When the QR lands, reapplication's profile upsert must stop overwriting `qrObjectKey` with `EXCLUDED."qrObjectKey"` (Epic 3 review).

## Deferred from: code review of Epic 3 (3.1–3.5) (2026-10-26)

- An ambiguous COMMIT outcome (the connection drops after COMMIT is sent) makes the submit delete promoted documents that a committed row may reference. Needs the production storage adapter and a reconciliation sweep.
- The scanner's sanitized output is stored without the magic-byte check running again. Belongs with the production scanner item.
- The 5 MB document size is checked after the whole object is read into memory. The upload ticket will cap the size at upload time.
- Length checks run on untrimmed input, so whitespace-only names pass the 2-character minimum. The contracts do not say whether to trim; decide it with the UI form.
- `bankName` has no length bound in the contract, zod or the schema. Add one with a contract change.
- The rejection reason's `textEsCo` is never shown to the business, and the status copy shows the reason code and a raw ISO date. Presentation belongs to the verification UI story.
- A non-admin can flood `"LegalIdentityAccessLog"` with denied rows. Needs the throttle tables (NFR-SYS-14).
- `legal-identity-confined` misses the table name built from concatenation or reached through an accessor. The same literal-style limit Story 1.4 recorded.
- `nfr-evidence.md` leaves every row at "Red — ATDD" after its story is done (NFR-VER-2, NFR-IDN-2). Refresh the whole table once.
