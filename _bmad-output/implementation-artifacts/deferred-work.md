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
- ~~The contact card's `IndividualSellerProfileIncomplete` carries the seller-facing text. Story 9.3 (the contact handoff) calls it only for an individual listing's seller and owns the buyer-facing refusal.~~ Resolved by Story 9.3 (decision log Impl-1 #34): the buyer gets `ListingNotFound` citing `{ sellerContact: false }`, and the counted row rolls back.
- A `"User"` row deleted mid-trace surfaces as an FK violation (500) instead of `AccountNotFound`. No flow deletes a `"User"` row today.

## Deferred from: 3-1-submit-a-business-application-with-its-legal-identity (2026-10-26)

- The production `ObjectStorage` and `MalwareScanner` adapters need a provider and a dependency approval. Until they land, `compose()` binds `UNWIRED_STORAGE` and `UNWIRED_SCANNER`, so a production submit that reaches promotion fails as NotImplemented (500), never silently. Tests bind `InMemoryObjectStorage` and `SimulatedScanner`.
- The upload ticket for `business-document/<businessId>/<cuid2>`, the client step before VER-2, is not wired yet. It belongs to the story that wires the upload procedures.
- The payment QR (`paymentInstructions.qrUploadKey`) is refused until it has an upload ticket and a promotion like the documents' (owner prefix, size, magic bytes, scanner, server-generated key). `qrObjectKey` stays `null` until then. Both VER-2 and `updatePaymentInstructions` refuse it. When the QR lands, reapplication's profile upsert must stop overwriting `qrObjectKey` with `EXCLUDED."qrObjectKey"` (Epic 3 review).

## Deferred from: code review of Epic 3 (3.1–3.5) (2026-10-26)

- An ambiguous COMMIT outcome (the connection drops after COMMIT is sent) makes the submit delete promoted documents that a committed row may reference. Needs the production storage adapter and a reconciliation sweep.
- The scanner's sanitized output is stored without the magic-byte check running again. Belongs with the production scanner item.
- The 5 MB document size is checked after the whole object is read into memory. The upload ticket will cap the size at upload time.
- ~~Length checks run on untrimmed input, so whitespace-only names pass the 2-character minimum. The contracts do not say whether to trim; decide it with the UI form.~~ Resolved before Epic 13 (decision log Impl-1 #38): the kernel's `textIssue` counts the minimum after trim and refuses a NUL, in VER's names, city, holder name, reason text and decision note.
- `bankName` has no length bound in the contract, zod or the schema. Add one with a contract change.
- The rejection reason's `textEsCo` is never shown to the business, and the status copy shows the reason code and a raw ISO date. Presentation belongs to the verification UI story.
- A non-admin can flood `"LegalIdentityAccessLog"` with denied rows. Needs the throttle tables (NFR-SYS-14). Epic 9 does not close it: Story 9.5's limiter counts `"ContactRequestLog"` only, which is the contact handoff's own table, not a general throttle. Owner: Story 2.4's Impl-2 completion, which wires `"AuthThrottleEvent"` and the sign-in hook (decision log Impl-1 #34).
- `legal-identity-confined` misses the table name built from concatenation or reached through an accessor. The same literal-style limit Story 1.4 recorded.
- ~~`nfr-evidence.md` leaves every row at "Red — ATDD" after its story is done (NFR-VER-2, NFR-IDN-2). Refresh the whole table once.~~ Resolved by Story 4.4: the table was refreshed as a whole, with a new "Green — ATDD" status, and each later epic refreshes its own rows.

## Deferred from: 4-1-start-and-continue-a-catalog-feed-run (2026-10-27)

- No production `CatalogFeedSource` exists: OQ-9 names a fixture file, and no story builds its production reader. `compose()` binds `UNWIRED_FEED`, so a production `catalog.feed.continue` fails the run as NotImplemented, never silently. Tests bind `FixtureFeedSource`.
- The scheduled run of AD-CAT-1 rule 4 (`daily-night`, looping in-process for up to 240 s) has no jobs route to run from. It belongs with the jobs route, together with `jobs/trm-fetch` (Story 4.4).

## Deferred from: 4-4-never-fabricate-a-price (2026-10-27)

- The production `FxRateSource` (datos.gov.co dataset `32sa-8pi3`, ADD-§6) is not built. It needs an HTTP client behind `tezg/no-direct-io`, the three transport retries of NFR-CAT-4, and its fields checked against the live dataset (`unidad = 'COP'`, the floating `vigenciadesde`/`vigenciahasta`). `compose()` binds `UNWIRED_FX`, so `catalog.fx.retry` fails as NotImplemented in production.
- No jobs route exists, so the `jobs/trm-fetch` procedure (`daily-morning` plus the hourly tick, G-3) is not reachable. `fetchTrm` is ready for it. Its single-flight lock (`job:trm-fetch`) belongs with that route; until then, the exclusion constraint makes two concurrent fetches converge on one row.
- `getFxRate` raises `Unexpected` (500) when no TRM is stored on or before the date, because the DTO has no null. Only an empty `"FxRate"` table reaches it. Revisit if VAL needs an explained answer before the first fetch. VAL does not need one: it never calls `getFxRate`, because an FX-derived observation already carries its COP (decision log Impl-1 #37, D3). Owner: the jobs route (the first `trm-fetch` run).

## Deferred from: code review of Epic 4 (4.1–4.5) (2026-10-27)

- `catalog.fx.retry` drops the admin's id: `FetchTrmRequest` carries no actor, so the `catalog.fxRate.*` audit rows are `actorKind: 'system'` with a null actor and `data.trigger = 'admin'`. Recording the admin needs a DTO change (`actorId` on the admin trigger), for the story that wires the jobs route.
- ~~`getPriceHistory` bounds its ids (≤ 500) but not its window or row count, so a wide `[from, to]` returns every observation of those entries. The contract bounds only the ids; VAL-3 (Epic 12) sets the windows it asks for and should bound them.~~ Resolved by Epic 12 (decision log Impl-1 #37, D3): VAL-3, its only caller, asks from the Bogotá start of `today − days + 1` to `now`, with `days` ≤ 365 (contracts.md VAL-3 Q2), so a call covers at most 365 days of at most 500 cards.
- `catalog.browse` accepts any safe-integer `page`, and its filter strings have no length bound (the registry's zod input bounds only `pageSize`). A deep OFFSET is a slow but correct read. DSC-1 caps its own pages at 417; add the same cap to the registry with a contract change.

## Deferred from: spec of Epic 5 (5.1–5.6) (2026-10-27)

- A listing created with `location = null` stores no coordinates. FR-INV-1 says the location defaults to the individual seller's meeting point, but INV has no identity port that reads it (`IdentityForInv` offers `requireListingEligibility` and `getSellerVerification`), and the ATDD fakes provide only those two. DSC-1 (Epic 6) searches on `"Listing".lat/lng`, so until then such a listing counts as an unusable location. Epic 6 decides between copying the point at create (an optional `meetingPoint` on IDN-2) and resolving it at read through `getSellerKinds` (decision log Impl-1 #30).
- `getAvailabilitySummary` (P-INV.availability) throws `NotImplementedError` for a non-null `area`. The area check (`assertSearchArea`) and the geodesic filter are DSC-3 and DSC-1 (Stories 6.1–6.2). Its only consumer, the COL wishlist (Epic 11), calls it after Epic 6, and Epic 6 adds the filter with the same predicate DSC-1 uses.

## Deferred from: code review of Epic 5 (5.1–5.6) (2026-10-27)

- ~~`createListing` and `createBundle` read the projection `FOR SHARE` (AD-INV-3 rule 3), but a business with no `"SellerCommissionState"` row has nothing to lock. A first `CommissionBalanceReplenished` that commits between that read and the listing insert leaves the new listing paused until the next commission event.~~ Resolved by Epic 8 (decision log Impl-1 #33): the `listings:seller` advisory lock, taken first by a business listing's creation and by the commission projection subscriber (AD-SYS-4 rules 4–5).
- Two application decisions for a business with no listings are not serialized (`lockSellerListings` locks only rows that exist), so both can be stored `ignored = false`, and a listing created while a rejection applies can escape the withdrawal. Martín accepted it (decision log Impl-1 #30): VER decides one application at a time, the newest non-ignored decision is still the newest, and an escaped listing is not purchasable because a reserve reads the verification live. Epic 8 added the `listings:seller` advisory lock for the commission projection only (the item above, closed); `applyApplicationDecision` does not take it yet. Owner: Epic 5's follow-up in Impl-2, if a decision path ever needs it.
- `getAvailabilitySummary` reads the verification once per distinct business seller (sequential identity calls, up to 500 entries), and AD-INV-3 rule 2's parity test of the batch and single forms is not written. `IdentityForInv` has no `getSellerKinds`; the COL wishlist (Epic 11), its first consumer, adds the batch port and the parity test.

## Deferred from: spec of Epic 6 (6.1–6.4) (2026-10-27)

- `discovery.search` with `purchasableOnly` filters the listing's own facts in SQL, but the seller's verification comes from `getSellerKinds` after the statement, so a page that held an unverified business's rows comes back with fewer than 24 (decision log Impl-1 #31). An exact page needs the verification inside the statement, which `listings` cannot read (AD-1, AD-8). The same cause leaves gaps in each row's `rankKey`, and `SearchRanked` cites the filtered page's count (Epic 6 review). Revisit with the search UI (page 3.1), for example by paging on a cursor instead of a count.

## Deferred from: code review of Epic 6 (6.1–6.4) (2026-10-27)

- DSC-2 Q4 names a "no active listings" decision for a card with no listing in the area, and excluded rows "counted with `ListingLocationUnusable`", but `GetCardDetailResponse` has no decision field. Martín deferred the DTO change to the card page story (UI 2.2), which renders the empty state from `hasActiveListings` and `excluded.unusableLocation` (decision log Impl-1 #31).

## Deferred from: spec of Epic 7 (7.1–7.5) (2026-10-27)

- No jobs route exists, so `expireDueOrders` (S-FR-ORD-8) has no tick or cron caller: the hourly tick (G-3), `daily-morning` and `daily-night` with the single-flight `job:expiry-materialize`. It belongs with the jobs route, together with `trm-fetch` (Story 4.4) and the catalog's `daily-night` (Story 4.1). Until then expiry is still correct at every read and command (AD-ORD-2 rule 8, AD-SYS-6 rule 5). Stock is reclaimed by the `orders.create` pre-step for the same listing, and by every command that meets an overdue order.
- `orders.supportContact.get` is `Unexpected` (500) until an admin first sets the contact, because `SupportContactDTO` has no null (decision log Impl-1 #32). Setting it belongs to the launch checklist; revisit with the support page (UI 6.2) if a public read must come before it.
- The comprobante uses the production `ObjectStorage` and `MalwareScanner`, which are still `UNWIRED_STORAGE` and `UNWIRED_SCANNER` (Story 3.1's item above). In production the ticket, the upload and the URL fail as NotImplemented (500). NFR-ORD-2's upload transfer time (≤ 10 s at 10 Mbps) is measured with them, at launch.

## Deferred from: code review of Epic 7 (7.1–7.5) (2026-10-27)

- The admin lookup returns neither the `EventDelivery` rows of AD-ORD-3 rule 3 nor a flag when it stops at 50 orders, and `AdminLookupOrdersResponse` has neither field. Martín deferred both to the admin console story (decision log Impl-1 #32); until then the admin reads an order's deliveries through `admin.events.deliveries`.
- One due order whose release throws (only corrupt data: a reservation naming an unknown unit) fails the purchase's pre-step and stops `expireDueOrders`. Isolating it needs a logger port; decide it with the jobs route, together with the job's single-flight `job:expiry-materialize` and `JOBS_SECRET`.
- A promoted comprobante whose cleanup delete fails stays in `order-comprobantes` with no order pointing at it. This is the same best-effort cleanup as VER's documents; the reconciliation sweep belongs with the production storage (Epic 3 item).
- Unlimited comprobante upload tickets per order, and the size is checked after the object is read. The Epic 3 upload-ticket item (a size cap at upload time) covers it. Epic 8's top-up proofs share both (see below).
- `OrderNoLongerActive`, `OrderNotCancellable` and `ComprobanteInvalidFile` render raw enum tokens (`Expired`, `magic`) inside Spanish text, the repo-wide convention (`ApplicationNotPending`, `TradeOfferNotOpen`). The order pages' copy (UI 6.2, 6.3) should map them.

## Deferred from: spec of Epic 8 (8.1–8.4) (2026-10-30)

- The top-up proof uses the production `ObjectStorage` and `MalwareScanner`, which are still `UNWIRED_STORAGE` and `UNWIRED_SCANNER` (Story 3.1's item). In production the ticket, the request and the proof URL fail as NotImplemented (500).
- Stories 8.5 (reconcile, `COM-3`, `COM-3.last`) and 8.6 (rates and the admin ledger, `S-FR-COM-7`, `S-FR-COM-7.list`, `S-FR-COM-8.ledger`) stay in `impl2_scope`; their five procedures stay unwired and their 10 tests red for NotImplemented. The `commission-reconcile` job (`daily-night`, `job:commission-reconcile`) also needs the jobs route (Story 4.1's item). Owner: Epic 8's Impl-2 completion.
- The account page shows the 50 newest ledger lines, with no cursor (`GetMyCommissionAccountRequest` has none; decision log Impl-1 #33). Older lines are reachable only through the admin ledger, which is Story 8.6's. Owner: the account page story (UI 7.2).

## Deferred from: code review of Epic 8 (8.1–8.4) (2026-10-30)

- One quarantined proof can back two top-up requests: two concurrent `requestTopUp` calls with one `uploadKey` both promote it, and a failed best-effort delete of the quarantine copy lets it be used again. Martín deferred it (decision log Impl-1 #33): a single-use upload ticket closes it at the source, and until then an admin sees both requests, with one transfer reference, before crediting. Owner: Epic 3's upload-ticket item (with the production storage).
- ~~Whitespace-only or NUL-bearing `transferReference` and rejection reasons pass the length checks (a NUL then fails in Postgres as 500). Same as Epic 3's trim item; decide it with the top-up and queue forms (UI 7.1, 7.3).~~ Resolved before Epic 13 (decision log Impl-1 #38): `textIssue` refuses both, and counts the minimum after trim.
- The top-up proof is read whole before the 5 MiB check, and an ambiguous COMMIT deletes a promoted proof that a committed row may point to. Same as Epic 3's upload-ticket and production-storage items.

## Deferred from: spec of Epic 9 (9.1–9.5) (2026-10-30)

- Story 9.6 (the inbox, thread, read marks and mute: `S-FR-MSG-7.inbox`, `.thread`, `.read`, `S-FR-MSG-8`) stays in `impl2_scope`; its four procedures stay unwired and its 4 tests red for NotImplemented. Owner: Epic 9's Impl-2 completion.
- Production deployments must set `IP_HMAC_KEY` (≥ 32 bytes) before this branch ships: `loadConfig()` now requires it, and every route reads the config. `.env.example` and `docker-compose.yml` carry a local value. Owner: the launch checklist (decision log Impl-1 #34).

## Deferred from: code review of Epic 9 (9.1–9.5) (2026-10-30)

- ~~A message body that is whitespace only passes `normalizeBody`, and one with a NUL passes it and then fails in Postgres (22021) as 500. Same as Epic 3's and Epic 8's trim items; decide it with the composer (UI 12.2, 12.3).~~ Resolved before Epic 13 (decision log Impl-1 #38): `textIssue` refuses both before any read.
- `messaging.send`'s zod input bounds `body` at 2,000 UTF-16 units before NFC, while MSG-1 P2, `normalizeBody` and the `char_length` CHECK count 2,000 code points after NFC, so a body of 1,001 or more astral characters is refused at the router. The bound comes from `operations.json` (`maxLength`); fix it there with a contract change. Owner: the next contract revision.
- ~~The trade path of `generateContactMessage` accepts an empty offer (no items and no cash renders "Ofrezco .") and calls `BigInt` on `tradeSummary.cashCop` unchecked. Only `kind='purchase'` is wired; TRD-1 is the trade caller. Owner: Epic 10 (Story 10.1's TRD-1 validates the terms before it calls the handoff).~~ Resolved by Epic 10 (decision log Impl-1 #35, D6): trading checks the terms before it stores them, and the contact service raises `Unexpected` for a null or empty summary, a cash outside 0–100,000,000 or an unknown item, before it reads the phone.
- `NotBusinessAccount` on the messaging path renders the raw `{status}` token (`none`, `Rejected`) inside Spanish text, the repo-wide convention noted in Epic 7. The composer's copy (UI 12.3) should map it.


## Deferred from: spec of Epic 10 (10.1–10.5) (2026-10-30)

- No jobs route exists, so `expireDueOffers` (S-FR-TRD-9) has no tick or cron caller (`daily-morning`, the hourly tick, `JOBS_SECRET`, single-flight). It belongs with the jobs route, together with `trm-fetch` (Story 4.4), the catalog's `daily-night` (Story 4.1) and `expireDueOrders` (Story 7.5). Until then expiry is correct at every read and command (AD-TRD-1 rule 5), and an offer's own expired predecessor is materialized when the proposer offers again.

## Deferred from: code review of Epic 10 (10.1–10.5) (2026-10-30)

- `trading.handoff` regenerates the text from the listing as it is now: once the listing is hidden, withdrawn or deactivated after the accept it is `ListingNotFound` (declared on the procedure, decision log Impl-1 #35, R2), a price or title edit changes the text, and a catalog entry that stops resolving is `Unexpected`. A snapshot of the handoff at accept needs a column or a contract change. Owner: the trade page story (UI 8.2), or TRD's Impl-2 follow-up.
- The accept swallows a handoff failure as `handoff: null` with no log, so a systematically broken handoff goes unnoticed. Needs a logger port; decide it with the Epic 7 item that isolates a failing expiry (the jobs route).
- `expireDueOffers` stops at the first seller whose transaction fails and has no single-flight. Same owner as the jobs-route item above.

## Deferred from: spec of Epic 11 (11.1–11.4) (2026-10-30)

- Stories 11.5 (binder, external entries, move/copy, wishlist: `S-FR-COL-3`, `-4`, `-5.binder`, `-5.layout`, `-5.reorder`, `-6.add`, `-6.remove`, `-6.list`) and 11.6 (their refusals) stay in `impl2_scope`; their nine procedures stay unwired and their 8 tests red for NotImplemented. `completionPercent` (AD-COL-1 rule 5) is still a NotImplemented stub. Owner: Epic 11's Impl-2 completion.
- Epic 5's two `getAvailabilitySummary` items above (the area filter, and the batch `getSellerKinds` port with AD-INV-3 rule 2's parity test) stay open: their only consumer is the wishlist list of Story 11.5. Owner: Story 11.5.
- COL needs no jobs route: prompts never expire (A-43), so nothing joins the jobs-route item of Stories 4.1, 4.4, 7.5 and 10.5.

## Deferred from: code review of Epic 11 (11.1–11.4) (2026-10-30)

- COL-2 Q4 says a prompt's rendering cites `{ rule: 'FR-COL-7', inputs: { orderId, lineCount } }`, but `PromptRowDTO` has no decision field, so `collections.prompts.list` returns none. Martín deferred the DTO change (decision log Impl-1 #36, R2); each row already carries `orderId` and `lineCount`. Owner: the prompt page story (UI 6.2, 9.4).
- ~~Collection names are not trimmed: a whitespace-only name passes~~ (resolved before Epic 13, decision log Impl-1 #38: `textIssue` refuses a name of spaces or with a NUL). Still open: "Keep " and "Keep" get different `nameKey`s, because a name is stored as written (#38). Owner: the collection forms (UI 9.1, 9.4).
- `PromptAlreadyResolved` renders the raw status token (`Accepted`, `Dismissed`) and an ISO instant inside Spanish text, the repo-wide convention noted in Epic 7. The prompt pages' copy (UI 6.2, 9.4) should map it.

## Deferred from: spec of Epic 12 (12.1–12.5) (2026-10-30)

- VAL needs no jobs route: valuations are recomputed on every request and never stored (AD-VAL-2), so nothing joins the jobs-route item of Stories 4.1, 4.4, 7.5 and 10.5.
- `completionPercent` (AD-COL-1 rule 5) and the rest of Stories 11.5–11.6 stay in `impl2_scope`; VAL reads only the entries COL stores today. Owner: Epic 11's Impl-2 completion.

## Deferred from: code review of Epic 12 (12.1–12.5) (2026-10-30)

- VAL's history judges a point stale with its own 36 h constant (`FRESHNESS_MS` in `domain/val.ts`), while VAL-1 takes the catalog's `stale` flag from `getReferencePricesAsOf`. The two agree today (36 h, strictly older), but a change to the catalog's threshold would make the current value and the history disagree. VAL may not import the catalog's domain (AD-1); a fix needs the catalog to expose its threshold through a port or on `getPriceHistory`. Owner: the next catalog contract revision.
- The trend's start is `now − period × 86,400 s` (VAL-2 Q1) while the history's first day starts at 05:00 UTC (VAL-3 Q2), so "30 days" covers slightly different windows on the two pages. Both follow their contracts; align them with the valuation pages' copy (UI 10.1, 10.2).

## Deferred from: spec of Epic 13 (13.1–13.4) (2026-10-30)

- Stories 13.5 (listing hide and its log, review search and log, the profile: `S-FR-REP-5`, `S-FR-REP-6.listing`, `.search`, `.log`, `S-FR-REP-7`) and 13.6 (their three refusals, `[S-FR-REP-5.f]`, `[S-FR-REP-6.f]`, `[S-FR-REP-7.f]`) stay in `impl2_scope`; their five procedures stay unwired and their 7 tests red for NotImplemented. 13.6's `[REP-2.P2]`, `[REP-2.P3]` and `[REP-3.P1]` moved to Stories 13.2 and 13.3 (decision log Impl-1 #38, D2). Owner: Epic 13's Impl-2 completion.
- NFR-REP-2's profile read (the aggregate plus the first page of 20 in one `REPEATABLE READ` transaction, p95 ≤ 300 ms) has no benchmark yet: Story 13.5's DoD carries it. Epic 13 measured the next read after a hide and the aggregates read (decision log Impl-1 #38, D3). Owner: Story 13.5.
- REP needs no jobs route: nothing in REP expires or is scheduled, so nothing joins the jobs-route item of Stories 4.1, 4.4, 7.5 and 10.5.

## Deferred from: code review of Epic 13 (13.1–13.4) (2026-10-30)

- REP-1 reads the target and the closed-purchase fact before its write transaction (AD-REP-1 trade-off), so a business that loses `Approved` between that read and the insert still gets the review, verified. Order facts are write-once; a business decision in that window is rare. Owner: Epic 13's Impl-2 completion, if a decision path ever needs it.
- The kernel's `textIssue` counts the minimum after `String.prototype.trim()`, so a text of only invisible characters (U+200B, U+3164, U+2800) passes it, and a lone surrogate is not refused (the driver replaces it with U+FFFD). Owner: the next contract revision of §0.3, with the forms.
- `ReviewAlreadyHidden` renders a raw ISO instant inside Spanish text, the repo-wide convention noted in Epic 7. The moderation page's copy (UI 11.3) should format it.


## Deferred from: the Impl-1 close (Phase 4, 2026-10-30)

- NFR-IDN-1 (capability reads of 500 ids, p95 ≤ 50 ms) and NFR-COL-2 (binder page and wishlist) are "Planned — story DoD", but no story in `epics.md` names them in its Traceability, so no DoD carries their benchmark (`impl1-final-trace.md` §4). Martín kept the certified backlog unchanged (decision log Impl-1 #39). Owners: NFR-COL-2, Story 11.5; NFR-IDN-1's benchmark, the Impl-2 test hardening (a `nfr/idn1_latency.test.ts` with the shared harness; changed at the close review, #39).
- No story in `epics.md` builds the jobs route (the items of Stories 4.1, 4.4, 7.5 and 10.5 above, and 8.5's `commission-reconcile`). Owner: Impl-2 planning, which must give it a story before Epic 8's completion needs it.
- The test review's findings (`impl1-test-review.md`): the two lock-wait tests that sleep 200 ms before asserting a block (`ver.v2.test.ts:549`, `inv.v2.test.ts:293`; wait on `pg_stat_activity` instead), the deadlock watchdog copied into seven files, four test files over 300 lines, three unused variables in ATDD files, and the shared app in `composition.test.ts`. Owner: Impl-2 test hardening. The VAL benchmarks' run time (about 313 of 675 test-seconds) goes to whoever owns CI, together with whether `solu2-nfr` runs on every push.
- `traceability-matrix.md` still shows each test's Solu-2 design state ("red") beside its done story; the implementation result is in `impl1-final-trace.md`. The generator was left unchanged (#39), and it still splits a status cell on every semicolon and does not check status names against the known set, so `nfr-evidence.md` keeps its details free of semicolons by convention only. Owner: the Impl-2 close's trace.
- The Docker image build needs Docker Hub and the npm registry from inside the build stage; behind a TLS-re-signing proxy `npm ci` fails ("Exit handler never called"). The README says so. Owner: the launch checklist, with the deployment target.
