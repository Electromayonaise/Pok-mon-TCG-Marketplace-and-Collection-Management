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

- ~~`checkAuthThrottle` only counts. Inserting an `"AuthThrottleEvent"` row on each failed sign-in or sign-up, and the Better Auth `hooks.before` that calls the check, belong to the story that configures sign-in and sign-up (`src/server/auth.ts` has neither yet). Until then nothing writes the table. No story in `epics.md` configures them: decision log Impl-1 #26 gives the work to Story 2.4's completion in Impl-2.~~ Resolved by Story 2.6 (decision log Impl-2 #11, #12): `src/server/auth-routes.ts` checks before Better Auth and inserts one row per known key after a failed sign-in or any sign-up attempt.

## Deferred from: code review of 2-4-refuse-unverified-buyers-and-throttle-failed-sign-ins (2026-10-25)

- ~~Throttle hardening for the story that wires the hook: the per-account limit lets anyone who knows an email lock that account out (AD-IDN-3 as designed; decide there whether the account key needs the IP too); the hook must pass a 64-hex `ipHmac` and `null`, never `''`, for an unknown account; the insert must write the clock's millisecond instants so `retryAt` frees the key on time.~~ Resolved by Story 2.6: the account limit stays as designed and the lockout risk is accepted (decision log Impl-2 #11, D4); the hook passes a 64-hex `ipHmac` or `null`, never `''` (`[S-FR-IDN-7.signin.unknown]`); the insert writes the Clock's millisecond instant.

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
- A non-admin can flood `"LegalIdentityAccessLog"` with denied rows. Needs the throttle tables (NFR-SYS-14). Epic 9 does not close it: Story 9.5's limiter counts `"ContactRequestLog"` only, which is the contact handoff's own table, not a general throttle. Owner: Story 2.4's Impl-2 completion, which wires `"AuthThrottleEvent"` and the sign-in hook (decision log Impl-1 #34). **Impl-2 note:** Story 2.6 wires `"AuthThrottleEvent"` for sign-in and sign-up only (its two scopes); a limit on denied legal-identity reads needs a new scope, a contract change. Owner: the launch checklist (NFR-SYS-14).
- `legal-identity-confined` misses the table name built from concatenation or reached through an accessor. The same literal-style limit Story 1.4 recorded.
- ~~`nfr-evidence.md` leaves every row at "Red — ATDD" after its story is done (NFR-VER-2, NFR-IDN-2). Refresh the whole table once.~~ Resolved by Story 4.4: the table was refreshed as a whole, with a new "Green — ATDD" status, and each later epic refreshes its own rows.

## Deferred from: 4-1-start-and-continue-a-catalog-feed-run (2026-10-27)

- No production `CatalogFeedSource` exists: OQ-9 names a fixture file, and no story builds its production reader. `compose()` binds `UNWIRED_FEED`, so a production `catalog.feed.continue` fails the run as NotImplemented, never silently. Tests bind `FixtureFeedSource`.
- The scheduled run of AD-CAT-1 rule 4 (`daily-night`, looping in-process for up to 240 s) has no jobs route to run from. It belongs with the jobs route, together with `jobs/trm-fetch` (Story 4.4). **Impl-2 note:** Story 1.6 built the job route, but the catalog feed has no `jobs/*` procedure in the registry and no production `CatalogFeedSource` (`UNWIRED_FEED`), so this stays open. Owner: the launch checklist, with the production feed.

## Deferred from: 4-4-never-fabricate-a-price (2026-10-27)

- The production `FxRateSource` (datos.gov.co dataset `32sa-8pi3`, ADD-§6) is not built. It needs an HTTP client behind `tezg/no-direct-io`, the three transport retries of NFR-CAT-4, and its fields checked against the live dataset (`unidad = 'COP'`, the floating `vigenciadesde`/`vigenciahasta`). `compose()` binds `UNWIRED_FX`, so `catalog.fx.retry` fails as NotImplemented in production.
- ~~No jobs route exists, so the `jobs/trm-fetch` procedure (`daily-morning` plus the hourly tick, G-3) is not reachable. `fetchTrm` is ready for it. Its single-flight lock (`job:trm-fetch`) belongs with that route; until then, the exclusion constraint makes two concurrent fetches converge on one row.~~ Resolved by Story 1.6 (decision log Impl-2 #11): `jobs/trm-fetch` runs on `tick` and `daily-morning` under `job:trm-fetch`.
- `getFxRate` raises `Unexpected` (500) when no TRM is stored on or before the date, because the DTO has no null. Only an empty `"FxRate"` table reaches it. Revisit if VAL needs an explained answer before the first fetch. VAL does not need one: it never calls `getFxRate`, because an FX-derived observation already carries its COP (decision log Impl-1 #37, D3). Owner: the jobs route (the first `trm-fetch` run).

## Deferred from: code review of Epic 4 (4.1–4.5) (2026-10-27)

- `catalog.fx.retry` drops the admin's id: `FetchTrmRequest` carries no actor, so the `catalog.fxRate.*` audit rows are `actorKind: 'system'` with a null actor and `data.trigger = 'admin'`. Recording the admin needs a DTO change (`actorId` on the admin trigger), for the story that wires the jobs route.
- ~~`getPriceHistory` bounds its ids (≤ 500) but not its window or row count, so a wide `[from, to]` returns every observation of those entries. The contract bounds only the ids; VAL-3 (Epic 12) sets the windows it asks for and should bound them.~~ Resolved by Epic 12 (decision log Impl-1 #37, D3): VAL-3, its only caller, asks from the Bogotá start of `today − days + 1` to `now`, with `days` ≤ 365 (contracts.md VAL-3 Q2), so a call covers at most 365 days of at most 500 cards.
- `catalog.browse` accepts any safe-integer `page`, and its filter strings have no length bound (the registry's zod input bounds only `pageSize`). A deep OFFSET is a slow but correct read. DSC-1 caps its own pages at 417; add the same cap to the registry with a contract change.

## Deferred from: spec of Epic 5 (5.1–5.6) (2026-10-27)

- A listing created with `location = null` stores no coordinates. FR-INV-1 says the location defaults to the individual seller's meeting point, but INV has no identity port that reads it (`IdentityForInv` offers `requireListingEligibility` and `getSellerVerification`), and the ATDD fakes provide only those two. DSC-1 (Epic 6) searches on `"Listing".lat/lng`, so until then such a listing counts as an unusable location. Epic 6 decides between copying the point at create (an optional `meetingPoint` on IDN-2) and resolving it at read through `getSellerKinds` (decision log Impl-1 #30).
- ~~`getAvailabilitySummary` (P-INV.availability) throws `NotImplementedError` for a non-null `area`. The area check (`assertSearchArea`) and the geodesic filter are DSC-3 and DSC-1 (Stories 6.1–6.2). Its only consumer, the COL wishlist (Epic 11), calls it after Epic 6, and Epic 6 adds the filter with the same predicate DSC-1 uses.~~ Resolved by Story 6.2 (found while closing Story 11.5): `availabilityCandidates` applies DSC-1's location predicates for a non-null `area`, and `inv.v2.test.ts` proves a near, a far and an unusable location and an over-long radius.

## Deferred from: code review of Epic 5 (5.1–5.6) (2026-10-27)

- ~~`createListing` and `createBundle` read the projection `FOR SHARE` (AD-INV-3 rule 3), but a business with no `"SellerCommissionState"` row has nothing to lock. A first `CommissionBalanceReplenished` that commits between that read and the listing insert leaves the new listing paused until the next commission event.~~ Resolved by Epic 8 (decision log Impl-1 #33): the `listings:seller` advisory lock, taken first by a business listing's creation and by the commission projection subscriber (AD-SYS-4 rules 4–5).
- Two application decisions for a business with no listings are not serialized (`lockSellerListings` locks only rows that exist), so both can be stored `ignored = false`, and a listing created while a rejection applies can escape the withdrawal. Martín accepted it (decision log Impl-1 #30): VER decides one application at a time, the newest non-ignored decision is still the newest, and an escaped listing is not purchasable because a reserve reads the verification live. Epic 8 added the `listings:seller` advisory lock for the commission projection only (the item above, closed); `applyApplicationDecision` does not take it yet. Owner: Epic 5's follow-up in Impl-2, if a decision path ever needs it.
- ~~`getAvailabilitySummary` reads the verification once per distinct business seller (sequential identity calls, up to 500 entries), and AD-INV-3 rule 2's parity test of the batch and single forms is not written. `IdentityForInv` has no `getSellerKinds`; the COL wishlist (Epic 11), its first consumer, adds the batch port and the parity test.~~ Resolved by Story 11.5 (decision log Impl-2 #17): `IdentityForInv` has `getSellerKinds` (S-FR-IDN-6.kinds, `INV` added to its consumers in `operations.json`), P-INV.availability asks it once per 500 distinct business sellers, and `inv.v2.test.ts` runs AD-INV-3 rule 2's parity test over the seed (the batch and the single form count the same listings, seller by seller).

## Deferred from: spec of Epic 6 (6.1–6.4) (2026-10-27)

- `discovery.search` with `purchasableOnly` filters the listing's own facts in SQL, but the seller's verification comes from `getSellerKinds` after the statement, so a page that held an unverified business's rows comes back with fewer than 24 (decision log Impl-1 #31). An exact page needs the verification inside the statement, which `listings` cannot read (AD-1, AD-8). The same cause leaves gaps in each row's `rankKey`, and `SearchRanked` cites the filtered page's count (Epic 6 review). Revisit with the search UI (page 3.1), for example by paging on a cursor instead of a count.

## Deferred from: code review of Epic 6 (6.1–6.4) (2026-10-27)

- DSC-2 Q4 names a "no active listings" decision for a card with no listing in the area, and excluded rows "counted with `ListingLocationUnusable`", but `GetCardDetailResponse` has no decision field. Martín deferred the DTO change to the card page story (UI 2.2), which renders the empty state from `hasActiveListings` and `excluded.unusableLocation` (decision log Impl-1 #31).

## Deferred from: spec of Epic 7 (7.1–7.5) (2026-10-27)

- ~~No jobs route exists, so `expireDueOrders` (S-FR-ORD-8) has no tick or cron caller: the hourly tick (G-3), `daily-morning` and `daily-night` with the single-flight `job:expiry-materialize`. It belongs with the jobs route, together with `trm-fetch` (Story 4.4) and the catalog's `daily-night` (Story 4.1). Until then expiry is still correct at every read and command (AD-ORD-2 rule 8, AD-SYS-6 rule 5). Stock is reclaimed by the `orders.create` pre-step for the same listing, and by every command that meets an overdue order.~~ Resolved by Story 1.6 (decision log Impl-2 #11): `jobs/expiry-materialize` runs `expireDueOrders` on every trigger under `job:expiry-materialize`; `[S-SYS.jobs.C1]` proves 20 concurrent runs release a unit once.
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
- Stories 8.5 (reconcile, `COM-3`, `COM-3.last`) and 8.6 (rates and the admin ledger, `S-FR-COM-7`, `S-FR-COM-7.list`, `S-FR-COM-8.ledger`) stay in `impl2_scope`; their five procedures stay unwired and their 10 tests red for NotImplemented. The `commission-reconcile` job (`daily-night`, `job:commission-reconcile`) also needs the jobs route (Story 4.1's item). Owner: Epic 8's Impl-2 completion. **Impl-2 note:** ~~Story 8.5's half (`COM-3`, `COM-3.last` and the `commission-reconcile` job)~~ Resolved by Story 8.5: `commission.reconcile` and `commission.admin.lastReconciliation` are wired and the job reconciles through Story 1.6's route. ~~Story 8.6's three procedures remain.~~ Resolved by Story 8.6: `commission.admin.setRate`, `commission.admin.rates` and `commission.admin.ledger` are wired, and the item is closed.
- The account page shows the 50 newest ledger lines, with no cursor (`GetMyCommissionAccountRequest` has none; decision log Impl-1 #33). Older lines are reachable only through the admin ledger, which is Story 8.6's. Owner: the account page story (UI 7.2). **Impl-2 note (Story 8.6):** the admin ledger (`commission.admin.ledger`) now pages the same 50 lines newest first by `seq DESC` with an opaque cursor (decision log Impl-2 #13), so it complements the account page's 50-line limit. The business itself still has no cursor.

## Deferred from: code review of Epic 8 (8.1–8.4) (2026-10-30)

- One quarantined proof can back two top-up requests: two concurrent `requestTopUp` calls with one `uploadKey` both promote it, and a failed best-effort delete of the quarantine copy lets it be used again. Martín deferred it (decision log Impl-1 #33): a single-use upload ticket closes it at the source, and until then an admin sees both requests, with one transfer reference, before crediting. Owner: Epic 3's upload-ticket item (with the production storage).
- ~~Whitespace-only or NUL-bearing `transferReference` and rejection reasons pass the length checks (a NUL then fails in Postgres as 500). Same as Epic 3's trim item; decide it with the top-up and queue forms (UI 7.1, 7.3).~~ Resolved before Epic 13 (decision log Impl-1 #38): `textIssue` refuses both, and counts the minimum after trim.
- The top-up proof is read whole before the 5 MiB check, and an ambiguous COMMIT deletes a promoted proof that a committed row may point to. Same as Epic 3's upload-ticket and production-storage items.

## Deferred from: spec of Epic 9 (9.1–9.5) (2026-10-30)

- ~~Story 9.6 (the inbox, thread, read marks and mute: `S-FR-MSG-7.inbox`, `.thread`, `.read`, `S-FR-MSG-8`) stays in `impl2_scope`; its four procedures stay unwired and its 4 tests red for NotImplemented. Owner: Epic 9's Impl-2 completion.~~ Resolved by Story 9.6: the four procedures are wired and their 6 tests are green.
- Production deployments must set `IP_HMAC_KEY` (≥ 32 bytes) before this branch ships: `loadConfig()` now requires it, and every route reads the config. `.env.example` and `docker-compose.yml` carry a local value. Owner: the launch checklist (decision log Impl-1 #34).

## Deferred from: code review of Epic 9 (9.1–9.5) (2026-10-30)

- ~~A message body that is whitespace only passes `normalizeBody`, and one with a NUL passes it and then fails in Postgres (22021) as 500. Same as Epic 3's and Epic 8's trim items; decide it with the composer (UI 12.2, 12.3).~~ Resolved before Epic 13 (decision log Impl-1 #38): `textIssue` refuses both before any read.
- `messaging.send`'s zod input bounds `body` at 2,000 UTF-16 units before NFC, while MSG-1 P2, `normalizeBody` and the `char_length` CHECK count 2,000 code points after NFC, so a body of 1,001 or more astral characters is refused at the router. The bound comes from `operations.json` (`maxLength`); fix it there with a contract change. Owner: the next contract revision.
- ~~The trade path of `generateContactMessage` accepts an empty offer (no items and no cash renders "Ofrezco .") and calls `BigInt` on `tradeSummary.cashCop` unchecked. Only `kind='purchase'` is wired; TRD-1 is the trade caller. Owner: Epic 10 (Story 10.1's TRD-1 validates the terms before it calls the handoff).~~ Resolved by Epic 10 (decision log Impl-1 #35, D6): trading checks the terms before it stores them, and the contact service raises `Unexpected` for a null or empty summary, a cash outside 0–100,000,000 or an unknown item, before it reads the phone.
- `NotBusinessAccount` on the messaging path renders the raw `{status}` token (`none`, `Rejected`) inside Spanish text, the repo-wide convention noted in Epic 7. The composer's copy (UI 12.3) should map it.


## Deferred from: spec of Epic 10 (10.1–10.5) (2026-10-30)

- ~~No jobs route exists, so `expireDueOffers` (S-FR-TRD-9) has no tick or cron caller (`daily-morning`, the hourly tick, `JOBS_SECRET`, single-flight). It belongs with the jobs route, together with `trm-fetch` (Story 4.4), the catalog's `daily-night` (Story 4.1) and `expireDueOrders` (Story 7.5). Until then expiry is correct at every read and command (AD-TRD-1 rule 5), and an offer's own expired predecessor is materialized when the proposer offers again.~~ Resolved by Story 1.6 (decision log Impl-2 #11): the same `expiry-materialize` run calls `expireDueOffers`.

## Deferred from: code review of Epic 10 (10.1–10.5) (2026-10-30)

- `trading.handoff` regenerates the text from the listing as it is now: once the listing is hidden, withdrawn or deactivated after the accept it is `ListingNotFound` (declared on the procedure, decision log Impl-1 #35, R2), a price or title edit changes the text, and a catalog entry that stops resolving is `Unexpected`. A snapshot of the handoff at accept needs a column or a contract change. Owner: the trade page story (UI 8.2), or TRD's Impl-2 follow-up.
- The accept swallows a handoff failure as `handoff: null` with no log, so a systematically broken handoff goes unnoticed. Needs a logger port; decide it with the Epic 7 item that isolates a failing expiry (the jobs route).
- `expireDueOffers` stops at the first seller whose transaction fails and has no single-flight. Same owner as the jobs-route item above.

## Deferred from: spec of Epic 11 (11.1–11.4) (2026-10-30)

- ~~Stories 11.5 (binder, external entries, move/copy, wishlist: `S-FR-COL-3`, `-4`, `-5.binder`, `-5.layout`, `-5.reorder`, `-6.add`, `-6.remove`, `-6.list`) and 11.6 (their refusals) stay in `impl2_scope`; their nine procedures stay unwired and their 8 tests red for NotImplemented. `completionPercent` (AD-COL-1 rule 5) is still a NotImplemented stub. Owner: Epic 11's Impl-2 completion.~~ Resolved by Stories 11.5 and 11.6: the nine procedures (`collections.addExternal`, `moveEntry`, `copyEntry`, `binder`, `setLayout`, `reorder`, `wishlist.add`, `.remove`, `.list`) are wired, `completionPercent` is implemented, and the 8 bound tests plus `[S-FR-COL-3.f2]` are green.
- ~~Epic 5's two `getAvailabilitySummary` items above (the area filter, and the batch `getSellerKinds` port with AD-INV-3 rule 2's parity test) stay open: their only consumer is the wishlist list of Story 11.5. Owner: Story 11.5.~~ Resolved: the area filter by Story 6.2, the batch port and the parity test by Story 11.5.
- COL needs no jobs route: prompts never expire (A-43), so nothing joins the jobs-route item of Stories 4.1, 4.4, 7.5 and 10.5.

## Deferred from: code review of Epic 11 (11.1–11.4) (2026-10-30)

- COL-2 Q4 says a prompt's rendering cites `{ rule: 'FR-COL-7', inputs: { orderId, lineCount } }`, but `PromptRowDTO` has no decision field, so `collections.prompts.list` returns none. Martín deferred the DTO change (decision log Impl-1 #36, R2); each row already carries `orderId` and `lineCount`. Owner: the prompt page story (UI 6.2, 9.4).
- ~~Collection names are not trimmed: a whitespace-only name passes~~ (resolved before Epic 13, decision log Impl-1 #38: `textIssue` refuses a name of spaces or with a NUL). Still open: "Keep " and "Keep" get different `nameKey`s, because a name is stored as written (#38). Owner: the collection forms (UI 9.1, 9.4).
- `PromptAlreadyResolved` renders the raw status token (`Accepted`, `Dismissed`) and an ISO instant inside Spanish text, the repo-wide convention noted in Epic 7. The prompt pages' copy (UI 6.2, 9.4) should map it.

## Deferred from: spec of Epic 12 (12.1–12.5) (2026-10-30)

- VAL needs no jobs route: valuations are recomputed on every request and never stored (AD-VAL-2), so nothing joins the jobs-route item of Stories 4.1, 4.4, 7.5 and 10.5.
- ~~`completionPercent` (AD-COL-1 rule 5) and the rest of Stories 11.5–11.6 stay in `impl2_scope`; VAL reads only the entries COL stores today. Owner: Epic 11's Impl-2 completion.~~ Resolved by Stories 11.5 and 11.6.

## Deferred from: code review of Epic 12 (12.1–12.5) (2026-10-30)

- VAL's history judges a point stale with its own 36 h constant (`FRESHNESS_MS` in `domain/val.ts`), while VAL-1 takes the catalog's `stale` flag from `getReferencePricesAsOf`. The two agree today (36 h, strictly older), but a change to the catalog's threshold would make the current value and the history disagree. VAL may not import the catalog's domain (AD-1); a fix needs the catalog to expose its threshold through a port or on `getPriceHistory`. Owner: the next catalog contract revision.
- The trend's start is `now − period × 86,400 s` (VAL-2 Q1) while the history's first day starts at 05:00 UTC (VAL-3 Q2), so "30 days" covers slightly different windows on the two pages. Both follow their contracts; align them with the valuation pages' copy (UI 10.1, 10.2).

## Deferred from: spec of Epic 13 (13.1–13.4) (2026-10-30)

- ~~Stories 13.5 (listing hide and its log, review search and log, the profile: `S-FR-REP-5`, `S-FR-REP-6.listing`, `.search`, `.log`, `S-FR-REP-7`) and 13.6 (their three refusals, `[S-FR-REP-5.f]`, `[S-FR-REP-6.f]`, `[S-FR-REP-7.f]`) stay in `impl2_scope`; their five procedures stay unwired and their 7 tests red for NotImplemented. 13.6's `[REP-2.P2]`, `[REP-2.P3]` and `[REP-3.P1]` moved to Stories 13.2 and 13.3 (decision log Impl-1 #38, D2). Owner: Epic 13's Impl-2 completion.~~ Resolved by Story 13.5 (with 13.6, decision log Impl-2 #18): the operations and their six procedures are wired, and the bound tests are green.
- ~~NFR-REP-2's profile read (the aggregate plus the first page of 20 in one `REPEATABLE READ` transaction, p95 ≤ 300 ms) has no benchmark yet: Story 13.5's DoD carries it. Epic 13 measured the next read after a hide and the aggregates read (decision log Impl-1 #38, D3). Owner: Story 13.5.~~ Resolved by Story 13.5: `[NFR-REP-2.profile]` (`nfr/rep2_latency.test.ts`) and the k6 burst (`npm run nfr:k6`) are green.
- REP needs no jobs route: nothing in REP expires or is scheduled, so nothing joins the jobs-route item of Stories 4.1, 4.4, 7.5 and 10.5.

## Deferred from: code review of Epic 13 (13.1–13.4) (2026-10-30)

- REP-1 reads the target and the closed-purchase fact before its write transaction (AD-REP-1 trade-off), so a business that loses `Approved` between that read and the insert still gets the review, verified. Order facts are write-once; a business decision in that window is rare. Owner: Epic 13's Impl-2 completion, if a decision path ever needs it.
- The kernel's `textIssue` counts the minimum after `String.prototype.trim()`, so a text of only invisible characters (U+200B, U+3164, U+2800) passes it, and a lone surrogate is not refused (the driver replaces it with U+FFFD). Owner: the next contract revision of §0.3, with the forms.
- `ReviewAlreadyHidden` renders a raw ISO instant inside Spanish text, the repo-wide convention noted in Epic 7. The moderation page's copy (UI 11.3) should format it.


## Deferred from: the Impl-1 close (Phase 4, 2026-10-30)

- NFR-IDN-1 (capability reads of 500 ids, p95 ≤ 50 ms) and NFR-COL-2 (binder page and wishlist) are "Planned — story DoD", but no story in `epics.md` names them in its Traceability, so no DoD carries their benchmark (`impl1-final-trace.md` §4). Martín kept the certified backlog unchanged (decision log Impl-1 #39). Owners: NFR-COL-2, Story 11.5; NFR-IDN-1's benchmark, the Impl-2 test hardening (a `nfr/idn1_latency.test.ts` with the shared harness; changed at the close review, #39). ~~NFR-COL-2~~ Resolved by Story 11.5: `nfr/col2_latency.test.ts` (`[NFR-COL-2.binder]`, `[NFR-COL-2.wishlist]`) is green; NFR-IDN-1 stays open.
- ~~No story in `epics.md` builds the jobs route (the items of Stories 4.1, 4.4, 7.5 and 10.5 above, and 8.5's `commission-reconcile`). Owner: Impl-2 planning, which must give it a story before Epic 8's completion needs it.~~ Resolved by Story 1.6 (decision log Impl-2 #7, #11), which also adds `jobs/outbox-sweep`; Story 8.5 completes `commission-reconcile`.
- The test review's findings (`impl1-test-review.md`): the two lock-wait tests that sleep 200 ms before asserting a block (`ver.v2.test.ts:549`, `inv.v2.test.ts:293`; wait on `pg_stat_activity` instead), the deadlock watchdog copied into seven files, four test files over 300 lines, three unused variables in ATDD files, and the shared app in `composition.test.ts`. Owner: Impl-2 test hardening. The VAL benchmarks' run time (about 313 of 675 test-seconds) goes to whoever owns CI, together with whether `solu2-nfr` runs on every push.
- `traceability-matrix.md` still shows each test's Solu-2 design state ("red") beside its done story; the implementation result is in `impl1-final-trace.md`. The generator was left unchanged (#39), and it still splits a status cell on every semicolon and does not check status names against the known set, so `nfr-evidence.md` keeps its details free of semicolons by convention only. Owner: the Impl-2 close's trace.
- The Docker image build needs Docker Hub and the npm registry from inside the build stage; behind a TLS-re-signing proxy `npm ci` fails ("Exit handler never called"). The README says so. Owner: the launch checklist, with the deployment target.

## Deferred from: Story 1.6 (2026-11-03)

- The `schedule:` of `.github/workflows/jobs-tick.yml` stays commented until a deployment exists and the repository secrets `TEZG_URL` and `JOBS_SECRET` are set (decision log Impl-2 #11). Owner: the launch checklist. Until then the jobs run by hand (`workflow_dispatch`), and no correctness rule depends on them (AD-SYS-6 rule 5).
- Production deployments must set `JOBS_SECRET` (≥ 32 bytes): `loadConfig()` now requires it. `.env.example`, `docker-compose.yml` and the Playwright web server carry local values. Owner: the launch checklist.
- `retention-purge` (ARCH §13, `daily-night`) has no registry procedure either; like the catalog feed it stays with the launch checklist (LG-2).

## Deferred from: Story 2.6 (2026-11-03)

- Production binds `UNWIRED_EMAIL` until a mail provider is chosen (decision log Impl-2 #11, D3). ~~A production sign-up failed only when Better Auth sent the verification link, after it had written `"User"` and `"Account"`, leaving an account that could never be verified.~~ Since the Impl-2 code review (F2) the guard refuses `POST /sign-up/email` before Better Auth runs while the sender is unwired (`createAuth(...).emailWired` false): 500 `Unexpected`, no row written (`[S-FR-IDN-7.signup.unwired]`). So production sign-up is refused, not half-done, until the provider is chosen. Owner: the launch checklist, which also turns Better Auth's own limiter back on for the unguarded routes (code review F7, below). Tests bind `CapturingEmailSender`; the E2E journeys sign in with seeded users.
- Better Auth's own `401` body on a wrong password passes through the guard unchanged (`{ code: 'INVALID_EMAIL_OR_PASSWORD', message }`), so it is not the platform's `ErrorBody`. The sign-in page maps it to its es-CO copy. Owner: the next contract revision, if the registry gains a credentials code.
- Better Auth writes `ipAddress: ''` on every session write even with IP tracking off; `createAuth` strips it in a Prisma client extension (R-12). Revisit on a Better Auth upgrade.

## Deferred from: Story 8.5 (2026-11-03)

- The all-accounts run restarts from the first account after a 50 s partial run (decision log Impl-2 #13), so with enough accounts the last ones in `businessId` order are never checked by the job. The run row and its `ReconciliationPartial` decision say so; a persisted resume cursor needs a migration. Owner: the launch checklist, once the account count makes a run approach 50 s.
- The admin path runs on the request, so an admin all-accounts run can take up to the 50 s bound; only the single-account call has the 800 ms budget (NFR-SYS-9). Page 7.4 should start the all-accounts run with a pending state. Owner: the reconcile page story (UI 7.4).

## Deferred from: Story 8.6 (2026-11-03)

- Page 7.4 says "a mistaken future rate is replaced by scheduling another row with the same or an earlier start", but `"CommissionRateSetting"."effectiveFrom"` is `UNIQUE`, so a row with the same start is refused (`RequestValidationFailed` on `effectiveFrom`). A row with an earlier start does not replace it either: the rate in force is the one with the greatest `effectiveFrom ≤ t`. As built, a mistaken scheduled rate can only be overridden by a later start, and it is in force until then. Owner: the rate page story (UI 7.4), after the open decision on how to correct a scheduled rate (Story 8.6 report).
- The 7.4 history has a "Registrada" column, but `ListCommissionRatesResponse` carries only `rateBps`, `effectiveFrom` and `setBy`. Its "worked example" line ("Un pedido de $45.000 pagaría {c}") has no contract either. Owner: the rate page story (UI 7.4), with a DTO change in `operations.json`.
- `listCommissionRates` returns every setting with no page. Settings are admin actions and few. Owner: the rate page story, if the history grows.

## Deferred from: Story 9.6 (2026-11-03)

- `InboxRowDTO` has no last-message preview ("Tú: " prefix) and no counterpart verification marker ("sin verificar", "solo lectura"), and `ThreadMessageDTO` has no `recipientVerificationAtSend`, so page 12.2's notice line on messages sent while the shop was Pending cannot be drawn. Owner: the full UI 12.2 story, with a DTO change in `operations.json`.
- The `/mensajes` slice has no composer, no "Todas" · "Sin leer" · "Silenciadas" filters and no `/mensajes/<conversationId>` deep link; the thread opens in the right pane only. Owner: the full UI 12.2 story.
- The inbox response does not say which side the caller is on, so the mute toggle is shown to a business too; its click gets the server's explained no-op (`MuteNotAvailableToBusiness`) as a notice, never a write. Owner: the full UI 12.2 story (a `role` field on the inbox, or the capabilities read on the page).
- `listInbox` asks identity for the business name once per distinct shop on the page (at most 20 read-only transactions, P-VER.name has no batch form). Owner: a batch `getBusinessNames` port when the inbox read approaches its latency budget.
- ~~`/ingresar` always continues to `/mensajes` (no return-to page)~~ Resolved by Story 11.5: `?siguiente=<path>` (a path on this site only) returns the user to the page that sent them. Still open: the header shows "Ingresar" to a signed-in user, and there is no sign-out or sign-up page. Owner: the account pages story.

## Deferred from: Story 11.5 (2026-11-03)

- The binder sorts on the five keys `BinderSortKey` has (`setNumber`, `name`, `acquiredAt`, `acquiredPriceCop`, `manual`), each ascending. FR-COL-5 and page 9.1 also name `value` (VAL), `pokemon`, `artist` and `colour`, each ascending or descending, and the sort "saved per collection". `GetBinderRequest` has no direction and `"Collection"` has no sort column, so the page keeps the sort in its address (`?orden=`), which is what makes it stable on reload. Owner: the full UI 9.1 story, with a DTO change in `operations.json` and a migration.
- `setNumber` orders sets by their id, not by name or release, because `catalog.getEntries` carries `setId` only. Cards within a set go by number as read ("2" before "10"); link-added entries go last by title (FR-COL-5). Owner: the full UI 9.1 story (`getSetSummaries` names, or a set order in the catalog).
- The wishlist list is ordered by lowest price with unavailable cards last (FR-COL-6), but `ListWishlistRequest` has no sort ("Más disponibles", "Agregadas recientemente") and no area, so `collections.wishlist.list` always asks availability with `area: null`. Owner: the wishlist page story (UI 9.3), with a DTO change.
- ~~The parser refuses an `http://` or `HTTP://` link on `AddExternalEntryRequest.url`'s `@pattern ^https://` with `RequestValidationFailed` (field `url`) before the service's `InvalidExternalLink` runs, so over HTTP only a link that starts with `https://` and fails the rest of the rule (userinfo, length, whitespace) gets `InvalidExternalLink`. The page maps both to the same field copy. Owner: a contracts review, if the HTTP refusal must be the registry code (drop the `@pattern`, keep the service rule).~~ Resolved (decision log Impl-2 #20): the `@pattern` is dropped from `url` and `imageUrl`, so every unsafe link answers `InvalidExternalLink` citing `url` over HTTP too.
- The UI slice is pages 9.1 (the binder and the collections list) and 9.2's "Por enlace" tab only: there is no create, rename or delete form, no move, copy, reorder or layout control, no set filter or completion footer, no "Ver pedido" link, no "Del catálogo" tab and no wishlist page (9.3). The procedures behind all of them are wired and proven over HTTP. The link form validates on the server only (page 9.2 asks for the client check too). Owner: the full UI 9.1–9.3 stories.
- `getBinder` returns every entry of the collection and the page slices it into `rows × cols` pockets. NFR-COL-2's 500-entry read is p95 20.7 ms, so no server paging is needed at that size. Owner: a paged `collections.binder` if collections grow far past 500 entries.
- The routes follow page 9.1's spec (`/coleccion/<collectionId>`), not ARCHITECTURE §6.10's `/coleccion?coleccion=<collectionId>`. Owner: the architecture's next revision (§6.10 routes).

## Deferred from: Story 13.5 (2026-11-04)

- The admin pages 11.3 (the moderation queue: search, hide and unhide) and 11.4 (the moderation audit) are not built. Their procedures are wired and proven over HTTP, and `src/server/moderation-log.ts` merges one page of each log by `(at desc, id)`; deep paging of the merged view (a cursor per source, resumed at the last row each contributed) and the type, reason and date filters of AD-REP-3 rule 5 (only the reason filter exists, per log) belong to the 11.4 page. Owner: the full UI 11.3–11.4 stories.
- The public profile slice (`/perfil/<userId>`) has no write or edit action: page 11.1 does not exist, so neither "Escribir una reseña" nor "Inicia sesión para reseñar" is shown, and the author's hidden-review tombstone (a separate "my review" read) is not drawn. `?pagina=` shows one page of 20 at a time rather than appending. Owner: the full UI 11.1–11.2 stories.
- `GetProfileResponse` gained `seller: { userId, kind, displayName }` (the 11.2 header and the provenance label need the kind and a name), read through REP's existing `getDisplayNames` port. For a shop that is its account name, not the business name of P-VER.name, which REP's identity port does not carry; the city in the 11.2 kind line is not served either. Owner: the full UI 11.2 story, with `getBusinessName` on REP's identity port.
- The profile pages by `page` number (the DTO's `page`, an offset of 20 × (page − 1), at most page 1,000), not by the keyset page 11.2's technical notes describe, so a review written between two page reads shifts the next page by one. Owner: the full UI 11.2 story, with a cursor in `GetProfileRequest`.
- The admin search has no bound beyond 1–200 characters and no page past the cursor of 50; it reads the text with `tezg_unaccent_lower(text) LIKE`, which no index serves (a sequential scan of `"Review"`, fine at the seed's 400 rows). Owner: a trigram index migration if reviews reach the tens of thousands.
- ~~The k6 burst is closed-loop (50 users, no think time), so its profile p95 follows the one `next start` process's throughput: three local runs of the same tree gave 177, 236 and 279 ms against the 300 ms threshold. A slower CI runner may cross it. Owner: whoever owns CI, if `nfr-k6` turns flaky (an arrival-rate executor, or more than one server process, would measure latency at a set load instead).~~ Resolved by decision log Impl-2 #21: k6 now runs two constant-arrival-rate scenarios (100 requests/s per endpoint for 60 s, at most 50 VUs each, a warm-up first) with a dropped-iterations threshold of 1 %, so the latency is measured at a set load (profile p95 34 and 38 ms in two local runs).
- `ListingAlreadyHidden` renders a raw ISO instant inside Spanish text, the repo-wide convention noted in Epic 7 (as `ReviewAlreadyHidden`). The moderation page's copy (UI 11.3) should format it.

## Deferred from: code review of Impl-2 (2026-11-04)

- **F5:** templates that interpolate a raw ISO instant or a bare amount render it inside Spanish text as is (`ListingAlreadyHidden`, `ReviewAlreadyHidden`, `CommissionRateScheduled`, `AuthRateLimited`'s `{retryAt}`, `ApplicationAlreadyPending`'s `{submittedAt}`, …). `renderMessage` needs a typed formatter: instants as a Bogotá date and time (ADD-§2.7), money as COP. Only the `Reconciliation*` plurals were fixed in the review. Owner: the microcopy / UI phase.
- **F6:** `src/server/moderation-log.ts` merges one page of each source but returns each source's own cursor, so rows of a source past the last merged row it contributed are skipped on the next page. It needs one cursor per source, taken from the last kept row of each kind. Owner: the UX 11.4 admin moderation view story.
- **F7:** `rateLimit: { enabled: false }` in `createAuth` turns off Better Auth's limiter on every `/api/auth/*` route, while the AD-IDN-3 guard covers only `/sign-up/email` and `/sign-in/email`. When mail is wired, keep Better Auth's limiter on except for the two guarded paths (`customRules`), or extend the guard to `/send-verification-email` and password reset. Owner: the launch checklist, with the mail provider (the Story 2.6 `UNWIRED_EMAIL` item).
