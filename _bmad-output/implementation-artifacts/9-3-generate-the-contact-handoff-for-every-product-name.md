---
title: 'Story 9.3: Generate the contact handoff for every product name'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: '787392b'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `ContactServiceV2.generateContactMessage` throws `NotImplementedError`: a buyer cannot reach an individual seller, and the R-09 (P0) rendering MEC and the S-6 limiter are unproven.

**Approach:** MSG-2 as written in contracts.md §9 and AD-MSG-1: P2–P4 first-fail, a pure deterministic composer, and the purchase limiter under the fixed-order advisory locks `msg:contact:req` → `msg:contact:ip`. P1 `canBuy` is the procedure builder's.

## Boundaries & Constraints

**Always:**
- **P2:** the listing is visible (`hiddenAt`, `withdrawnAt`, `deactivatedAt` all null) → else `ListingNotFound` (404). **P3:** `sellerKindAtCreation = 'individual'` → else `NotIndividualSellerListing` (409).
- **P4 (`kind='purchase'` only):** one transaction; `pg_advisory_xact_lock` on `msg:contact:req:<requesterId>` then `msg:contact:ip:<ipHmac>`; counted rows in half-open windows: 30/requester/1 h, 10/requester+seller/24 h, 60/IP/1 h → `ContactRateLimited` (429) citing `{ retryAt }` = oldest counted row in the breached window + window. A repeat for the same `(requesterId, listingId)` within 60 min inserts `counted=false` and is never refused (EC-36). Then one `"ContactRequestLog"` row. `kind='trade'`: no lock, no row (EC-37).
- **Card:** `identity.getContactCard` only after P4, inside the transaction, so every refusal reads no phone and writes nothing. **D4 (approved):** an `IndividualSellerProfileIncomplete` from the card (unreachable today: no flow updates or deletes a profile) becomes the buyer-facing `ListingNotFound` (404) citing `{ sellerContact: false }`; the seller-facing text never reaches the buyer (closes the Story 2.5 deferral).
- **Composer (pure, `listings/domain/contact.ts`):** NFC every string; es-CO template "¡Hola {seller}! Vi tu {product} ({condition}) en TEZG por {price}. ¿Todavía está disponible?" (trade variant lists items `qty× name (condition)` and cash); price `$45.000 COP` (dot thousands, BigInt, no float); RFC 3986 encoding via `encodeURIComponent` plus `!'()*`; truncation in FR-MSG-2 order at grapheme boundaries (`Intl.Segmenter`) with "…" until `externalUrl.length ≤ 2000`; `copyText` never truncated. `externalUrl = https://wa.me/<E.164 without +>?text=<encoded>`.
- **Q4:** decision `{ rule: 'FR-MSG-2', inputs: { truncated, truncationSteps, urlLength } }`. No event, no audit; the phone only in `externalUrl` (AD-SYS-8 rules 3–4).
- **D5 (decision) — wiring:** `inventory.contact` is wired with an `ipHmac` computed in the request context: HMAC-SHA256 keyed by `IP_HMAC_KEY` (S-7, ≥ 32 bytes, new in `config.ts`, `.env.example`, `docker-compose.yml`) over the first `x-forwarded-for` hop (else `null` → the IP limit is skipped); resolvers receive it as a third argument.
- **NFR-MSG-1 benchmark:** `[NFR-MSG-1.contact]` in `msg_latency.test.ts`, p95 ≤ 200 ms; bound to 9.3; refresh `nfr-evidence.md`.
- §13 stored-only `ContactMessageGenerated` row for the decision code.

**Ask First:** a DTO, port or bound-test change; a different template wording that drops a typed field.

**Never:** an outbound request (NFR-MSG-3); the phone in a log, row or citation; `Math.round`/float on prices.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Purchase 45,000 | visible individual | names product + `$45.000 COP`, one counted row | N/A |
| 1,000 runs | trade, same input | 1 distinct output, no row | N/A |
| 500-char / emoji / ñ / URL name | 1,000 and 100,000,000 | ≤ 2,000, round-trips, full price | N/A |
| 50 concurrent | one requester | 30 allowed | 20 `ContactRateLimited` |
| Hidden / business / 31st | — | zero writes, phone unread | 404 / 409 / 429 |

</frozen-after-approval>

## Code Map

- `src/modules/listings/domain/contact.ts` (new) -- `composeContactMessage`, `formatCop`, `encodeWaMe`
- `src/modules/listings/ports/contact.v2.ts`, `infra/pg.ts` -- listing read, locks, window counts, log insert
- `src/modules/listings/application/contact.v2.ts`, `index.ts`
- `src/server/composition.ts`, `trpc/init.ts`, `trpc/router.v2.ts`, `src/shared-kernel/config.ts` + `ip-hmac.ts` -- the wiring (D5)
- `_bmad-output/test-artifacts/nfr/msg_latency.test.ts`, `nfr-evidence.md`, `epics.source.mjs` / `epics.md`

## Tasks & Acceptance

**Execution:**
- [x] composer + src domain tests (maximal trade: 10 × 200-char items + cash ≤ 2,000; copyText full)
- [x] repository + service; src test for D4
- [x] wiring (D5) + HTTP case; the benchmark
- [x] `sprint-status.yaml` -- 9.3 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 9.3 `done`, when its 4 bound tests and `[NFR-MSG-1.contact]` run, then they pass; `[MSG-2.MEC]` runtime recorded (TG-7). Story 9.5's three tests are early greens, restored by the 9.5 commit (#23).

## Verification

- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/msg_contracts.test.ts -t "MSG-2"` -- expected: pass

## Implementation Notes

- Code review is batched with the rest of Epic 9 at its close (decision #22).
- The composer is `listings/domain/contact.ts` (pure): NFC on every string, the es-CO template, `encodeURIComponent` plus `!'()*` (RFC 3986), `Intl.Segmenter` graphemes, and a binary search for each FR-MSG-2 step (product name, then offered names longest first, then "+N más" keeping at least one). `text` is what `externalUrl` encodes; `copyText` is the untruncated rendering. A bundle names its title with no condition.
- **P4:** `lockContactKeys` takes `msg:contact:req` then `msg:contact:ip` (skipped for a null `ipHmac`); one statement reads the three windows and the 60-minute repeat; a repeat inserts `counted=false` and is never refused (EC-36); a breach cites `{ retryAt, window, limit }`. The phone is read only after P4, inside the transaction.
- **Windows (approved, decision log Impl-1 #34):** `[MSG-2.R1]`'s concurrent calls share one virtual instant, so `[now − w, now)` counted none of them (50 allowed). The windows are `(now − w, now]`: a row stamped `now` counts and the oldest stops counting exactly at the cited `retryAt`. contracts.md MSG-2 P4 and Time, and ARCHITECTURE AD-MSG-1 rule 3, are amended.
- **Bound-test Given (approved, decision log Impl-1 #34):** `[MSG-2.R1]` put all 50 listings on one seller, so FR-MSG-3's 10 per requester and seller per day allowed 10, not 30. Its Given now spreads them over five sellers of 10 listings each; the assertion (exactly 30 of 50, S-6) is unchanged.
- **D4:** a card's `IndividualSellerProfileIncomplete` becomes `ListingNotFound` citing `{ sellerContact: false }`; the transaction rolls the counted row back. Closes Story 2.5's deferral.
- **D5:** `IP_HMAC_KEY` (≥ 32 characters) joins `config.ts`, `.env.example` and `docker-compose.yml`; `src/server/ip-hmac.ts` hashes the first `x-forwarded-for` hop (else `x-real-ip`, else null); `serveTrpc` puts it in the context and resolvers receive `{ ipHmac }` as a third argument. `inventory.contact` is wired with the real catalog and identity.
- The decision cites `truncationSteps` joined with commas, since citation inputs are primitives (AD-SYS-1 rule 5). §13 gains the stored-only `ContactMessageGenerated` row.
- **TG-7 runtime** (local Postgres 16, `fsync=off`): `[MSG-2.MEC]` (8 names × prices) in 188 ms; `[MSG-2.I1]` 1,000 runs in 854 ms.
- Measured: `[NFR-MSG-1.contact]` p95 4.5 ms (p50 2.4).

### Review Findings

Epic 9 close review (2026-10-30, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `787392b..7be44bf` (code paths, the two bound-test Givens and the NFR file). Totals for the epic: 3 decisions, 7 patches, 4 deferrals, 10 dismissed. Martín resolved the decisions with every recommendation and approved every patch (decision log Impl-1 #34).

- [x] [Review][Decision→Patch] The leftmost `x-forwarded-for` hop is client-controlled, so a new header per request escaped the 60-per-IP limit — `callerIp` reads `x-real-ip` (set and overwritten by the hosting proxy), else the rightmost hop, normalized (no port or brackets, lower-case IPv6, IPv4-mapped as IPv4); this amends D5's "first hop" [src/server/ip-hmac.ts + test]
- [x] [Review][Decision→Patch] `externalUrl ≤ 2000` (I2) was not guaranteed: a 400-character seller name or heavy emoji graphemes overflow after the three FR-MSG-2 steps — a last `overflow` step cuts the seller name to 20 graphemes, then every name below 20, until it fits; contracts.md MSG-2 Q1 and AD-MSG-1 rule 4 amended [src/modules/listings/domain/contact.ts + test]
- [x] [Review][Patch] The 60-minute repeat matched uncounted rows, so a chain of repeats renewed itself and skipped every limit — it now matches counted rows only [src/modules/listings/infra/pg.ts + test]
- [x] [Review][Patch] A single listing with no unit rendered an empty product name — `Unexpected` (`listing_single_has_unit`) [src/modules/listings/application/contact.v2.ts]
- [x] [Review][Patch] No pool-of-1 proof for the contact path (AD-SYS-4 rule 9) [src/modules/listings/application/contact.v2.test.ts]
- [x] [Review][Patch] `IP_HMAC_KEY` was checked in characters; S-7 says bytes [src/shared-kernel/config.ts + test]
- [x] [Review][Patch] contracts.md Q4 still said `truncationSteps: string[]`, and §13 `ListingNotFound` did not name D4's source
- [x] [Review][Defer] the trade path's empty offer and unchecked `cashCop` (Epic 10) (deferred-work.md)
- Dismissed (10): compose without a key (tests only; production always passes one); the required key failing start-up (intended, now a launch-checklist item); a Rejected status visible in the citation (MSG-3 Q-fail cites `{ status }`); the replayed decision's `occurredAt` and a retry with another body (idempotency is by key); a second `DuplicateSend` (the re-run now finds the winner first); `now` read before the locks (one Clock read, as the contract says); FOR SHARE with no application yet (nothing to protect); a seller contacting their own listing (their own phone); `sellerContact` telling apart a missing listing (approved D4 citation); self-messaging (P4 or P5 refuses it before the insert).
