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
- ~~`nfr-evidence.md` leaves every row at "Red — ATDD" after its story is done (NFR-VER-2, NFR-IDN-2). Refresh the whole table once.~~ Resolved by Story 4.4: the table was refreshed as a whole, with a new "Green — ATDD" status, and each later epic refreshes its own rows.

## Deferred from: 4-1-start-and-continue-a-catalog-feed-run (2026-10-27)

- No production `CatalogFeedSource` exists: OQ-9 names a fixture file, and no story builds its production reader. `compose()` binds `UNWIRED_FEED`, so a production `catalog.feed.continue` fails the run as NotImplemented, never silently. Tests bind `FixtureFeedSource`.
- The scheduled run of AD-CAT-1 rule 4 (`daily-night`, looping in-process for up to 240 s) has no jobs route to run from. It belongs with the jobs route, together with `jobs/trm-fetch` (Story 4.4).

## Deferred from: 4-4-never-fabricate-a-price (2026-10-27)

- The production `FxRateSource` (datos.gov.co dataset `32sa-8pi3`, ADD-§6) is not built. It needs an HTTP client behind `tezg/no-direct-io`, the three transport retries of NFR-CAT-4, and its fields checked against the live dataset (`unidad = 'COP'`, the floating `vigenciadesde`/`vigenciahasta`). `compose()` binds `UNWIRED_FX`, so `catalog.fx.retry` fails as NotImplemented in production.
- No jobs route exists, so the `jobs/trm-fetch` procedure (`daily-morning` plus the hourly tick, G-3) is not reachable. `fetchTrm` is ready for it. Its single-flight lock (`job:trm-fetch`) belongs with that route; until then, the exclusion constraint makes two concurrent fetches converge on one row.
- `getFxRate` raises `Unexpected` (500) when no TRM is stored on or before the date, because the DTO has no null. Only an empty `"FxRate"` table reaches it. Revisit if VAL needs an explained answer before the first fetch.

## Deferred from: code review of Epic 4 (4.1–4.5) (2026-10-27)

- `catalog.fx.retry` drops the admin's id: `FetchTrmRequest` carries no actor, so the `catalog.fxRate.*` audit rows are `actorKind: 'system'` with a null actor and `data.trigger = 'admin'`. Recording the admin needs a DTO change (`actorId` on the admin trigger), for the story that wires the jobs route.
- `getPriceHistory` bounds its ids (≤ 500) but not its window or row count, so a wide `[from, to]` returns every observation of those entries. The contract bounds only the ids; VAL-3 (Epic 12) sets the windows it asks for and should bound them.
- `catalog.browse` accepts any safe-integer `page`, and its filter strings have no length bound (the registry's zod input bounds only `pageSize`). A deep OFFSET is a slow but correct read. DSC-1 caps its own pages at 417; add the same cap to the registry with a contract change.

## Deferred from: spec of Epic 5 (5.1–5.6) (2026-10-27)

- A listing created with `location = null` stores no coordinates. FR-INV-1 says the location defaults to the individual seller's meeting point, but INV has no identity port that reads it (`IdentityForInv` offers `requireListingEligibility` and `getSellerVerification`), and the ATDD fakes provide only those two. DSC-1 (Epic 6) searches on `"Listing".lat/lng`, so until then such a listing counts as an unusable location. Epic 6 decides between copying the point at create (an optional `meetingPoint` on IDN-2) and resolving it at read through `getSellerKinds` (decision log Impl-1 #30).
- `getAvailabilitySummary` (P-INV.availability) throws `NotImplementedError` for a non-null `area`. The area check (`assertSearchArea`) and the geodesic filter are DSC-3 and DSC-1 (Stories 6.1–6.2). Its only consumer, the COL wishlist (Epic 11), calls it after Epic 6, and Epic 6 adds the filter with the same predicate DSC-1 uses.
