---
title: Plan-2 Implementation Readiness Gate Report
stepsCompleted: [1, 2, 3, 4, 5, 6]
status: final
created: 2026-09-27
updated: 2026-09-27
gateVerdict: PASS (after remediation R-1..R-6; initial run CONCERNS)
signedOff: 2026-09-27
documentsAssessed:
  - planning/prd.md
  - planning/addendum.md
  - ux/DESIGN.md
  - ux/EXPERIENCE.md
  - ux/microcopy-es-CO.md
  - ux/C-UX-Scenarios/ (12 modules, 48 scenarios, 43 page specs)
  - planning/ARCHITECTURE.md
  - reviews/ (4 review files)
  - ai-log/decision-log.md
---

# Implementation Readiness Gate Report: Plan-2 Package (12 modules)

**Date:** 2026-09-27
**Project:** Pokémon TCG Marketplace and Collection Management, Plan-2 package
**Gate status: PASS** (verified by the post-remediation audit, §9; signed off in §11).

- **Initial run: CONCERNS.** The audit found no ownership collision, no dependency edge outside AD-1 and no untriaged review finding. It did find 42 gaps across 5 categories, all fixable in the documents.
- **Remediation.** The team approved fixes R-1..R-6 at the gate, and all six were applied (§8).
- **Post-remediation run: clean.** 0 MAJOR and 0 MINOR findings. The 4 REVIEW items left are the verified false positives in Step 4.A.

> **Post-issue note (added after sign-off).** The body of this report is kept as issued and signed off on 2026-09-27; it is not rewritten. Two human review rounds came after it and changed decisions it describes: decision log #26–#35 (the review of existing decisions) and #36–#45 (the follow-up on the #35 findings). Read those entries for the current state. What changed after issue:
> - The sandboxed viewer named here as the G-4 compensating control became viewers that render only the sanitized rendition; the PDF mechanism is pending (G-5) and blocks launch (LG-3) (#28, #44).
> - Uploads go directly to a quarantine bucket and are promoted only after validation (#36).
> - The F-14 deferral closed differently: "Oversell incidents" is not measured in production in V1, and `oversell-check` was removed (#29).
> - The AEC-19 deferral is covered by the best-effort tick hardening (`JobRun` and the silence alert, #30), and the tick moved to `17 12-23,0-1 * * *` (#37).
> - Launch gates LG-1..LG-5 were added, with `launchReady: false` (#32, #33, #38). The PASS verdict covers the planning package, not a production launch.

Steps 1–4 describe the package as found on the initial run. Each gap they record names the fix that closed it.

This report has three parts. Steps 1–5 follow the `bmad-check-implementation-readiness` workflow. §6 covers the cross-module consistency checks the task statement adds. §7–§11 hold the terminal audit, the blocker resolution log, the deferred items, the ops checklist and the sign-off.

Section IDs used below: `ADD-§n` is a section of `planning/addendum.md`; `ARCH §n` is a section of `planning/ARCHITECTURE.md`; `PRD §n` is a section of `planning/prd.md`.

---

## Step 1: Document Discovery

The search covered `docs/plan-2/` (113 files).

### PRD Documents

- `planning/prd.md`: one PRD for all 12 modules (96 FRs, 56 NFRs, 12 open questions).
- `planning/addendum.md`: the companion. It holds the DomainError and DecisionCode registry (ADD-§3), the event catalog (ADD-§5) and the retention periods (ADD-§9.4).
- `reviews/review-prd-adversarial.md`: Phase 1 review, triaged.

### Architecture Documents

- `planning/ARCHITECTURE.md`, `status: final`. It inherits AD-1..AD-19 and adds 8 AD-SYS and 33 module ADs, the event catalog (§7), the DomainError additions (§8), the consistency matrix (§11), the scheduled jobs (§13), the Deferred table (§14) and the gate record (§15).
- `reviews/review-arch-adversarial.md` and `reviews/review-arch-edge-cases.md`: Phase 3 reviews, triaged.

### Epics & Stories Documents

None, by design. The task statement puts epics and stories outside the deliverable scope, so the "missing epics" finding is recorded as **not applicable**. It is not a blocker.

### UX Design Documents

- `ux/DESIGN.md`, `status: final`: visual identity, extending Plan-1's "Trusted Ledger".
- `ux/EXPERIENCE.md`, `status: final`: information architecture, states, interactions, accessibility floor and key flows.
- `ux/microcopy-es-CO.md`, `status: final`: es-CO message registry: 96 keys on the initial run, 108 after R-5.
- `ux/C-UX-Scenarios/`: 12 module folders, each with 4 scenarios and its page specs (48 scenarios, 43 page specs).
- `ux/wireframes/`: Excalidraw wireframes referenced from the page specs.
- `reviews/review-ux-edge-cases.md`: Phase 2 review, triaged.

## Issues Found

- No duplicate documents and no sharded/whole conflicts.
- `planning/prd.md` and `planning/addendum.md` still carry `status: draft` in their frontmatter, although Phase 1 closed at its gate. Fixed by R-1 (applied).

## Documents Selected for Assessment

All of the documents listed above. The scratch working files (`.memlog.md`) were read for gate decisions only; they were not assessed as deliverables.

---

## Step 2: PRD Analysis

### Functional Requirements Extracted (96)

#### IDN (7)

| ID | Requirement | Traces |
| --- | --- | --- |
| FR-IDN-1 | Derive capabilities server-side | CAP-19, CAP-5 · AD-16 |
| FR-IDN-2 | Complete the individual-seller profile step | CAP-19 · AD-18 |
| FR-IDN-3 | Answer listing eligibility | CAP-19, CAP-5 · AD-11 |
| FR-IDN-4 | Guard seller-type exclusivity atomically | CAP-5, CAP-19 · AD-18 |
| FR-IDN-5 | Capability audit trace for admins | CAP-15 (support) · AD-16, AD-13 |
| FR-IDN-6 | Messaging, review-target and seller-kind queries | CAP-18, CAP-7, CAP-1 · AD-1 |
| FR-IDN-7 | Authentication and admin gating | CAP-15, CAP-28 (admin gating); cross-cutting to every authenticated CAP · AD-16, AD-12 |

#### VER (9)

| ID | Requirement | Traces |
| --- | --- | --- |
| FR-VER-1 | Submit a business application | CAP-15, CAP-5 · AD-13, AD-18 |
| FR-VER-2 | Admin review queue | CAP-15 · AD-13 |
| FR-VER-3 | Approve | CAP-15, CAP-5 · AD-13 |
| FR-VER-4 | Reject with a policy reason | CAP-15 · AD-13 |
| FR-VER-5 | Access to legal identity only through admin review | CAP-15 · AD-13, AD-17 |
| FR-VER-6 | Reapplication policy | CAP-15 · (Plan-2 decision) |
| FR-VER-7 | Applicant status view | CAP-15 |
| FR-VER-8 | Rejection-reason policy settings | CAP-15 · NFR-SYS-8 |
| FR-VER-9 | Business payment instructions for orders | CAP-20 · AD-15 |

#### CAT (8)

| ID | Requirement | Traces |
| --- | --- | --- |
| FR-CAT-1 | Browse and filter the catalog by collector attributes | CAP-1, CAP-2 · AD-8 |
| FR-CAT-2 | One stable identity per card or product | CAP-2, CAP-16 · AD-7 |
| FR-CAT-3 | Feed ingestion with idempotent upsert and quarantine | CAP-2, CAP-3 · AD-8 |
| FR-CAT-4 | Attribute changes keep the identity | CAP-2 · AD-7 |
| FR-CAT-5 | Reference prices as a distinct value object | CAP-3 · money rule |
| FR-CAT-6 | Price provenance for the card detail | CAP-3 |
| FR-CAT-7 | Freshness and feed outage | CAP-3 |
| FR-CAT-8 | Official exchange rate (TRM) | CAP-3, CAP-9 · money rule |

#### INV (10)

| ID | Requirement | Traces |
| --- | --- | --- |
| FR-INV-1 | Create a card or sealed-product listing | CAP-4, CAP-5, CAP-19 · AD-6, AD-7 |
| FR-INV-2 | Create a bundle | CAP-4, CAP-16 · AD-7 |
| FR-INV-3 | Reserve inventory atomically in the caller's transaction | CAP-17, CAP-25 · AD-6 |
| FR-INV-4 | Shared-quantity reconciliation | CAP-4, CAP-16 · AD-6 |
| FR-INV-5 | Release a reservation | CAP-17, CAP-25 · AD-6 |
| FR-INV-6 | Aborted caller transaction restores quantity | CAP-17, CAP-25 · AD-6 |
| FR-INV-7 | Purchasability, verified badge and commission pause | CAP-5, CAP-21 · AD-3 |
| FR-INV-8 | Withdraw on rejection, restore on approval | CAP-5, CAP-15 · (Plan-2 decision) |
| FR-INV-9 | Edit, restock and deactivate | CAP-4 · AD-6 |
| FR-INV-10 | Listing detail and owner view | CAP-4, CAP-28 · AD-12 |

#### DSC (7)

| ID | Requirement | Traces |
| --- | --- | --- |
| FR-DSC-1 | One browse query for both seller kinds | CAP-1, CAP-2 · AD-5 |
| FR-DSC-2 | Correct geodesic distance and an inclusive boundary | CAP-1 · AD-5 |
| FR-DSC-3 | Unusable locations are excluded and explained | CAP-1 |
| FR-DSC-4 | Pickup is derived on read | CAP-1 · AD-5 |
| FR-DSC-5 | Deterministic ranking with an explanation for each row | CAP-1 |
| FR-DSC-6 | Moderation and state exclusion take effect immediately | CAP-28, CAP-1 · AD-12 |
| FR-DSC-7 | Card detail composition | CAP-3, CAP-2 · (OQ-8) |

#### ORD (10)

| ID | Requirement | Traces |
| --- | --- | --- |
| FR-ORD-1 | Purchase and reserve at creation | CAP-17 · AD-6, AD-15 |
| FR-ORD-2 | Upload or replace the comprobante | CAP-20 · AD-14, AD-17 |
| FR-ORD-3 | Buyer confirms "I paid" | CAP-20, CAP-22 · AD-2 |
| FR-ORD-4 | Business confirms payment received | CAP-20, CAP-22 · AD-2, AD-3 |
| FR-ORD-5 | Buyer confirms item received; the order closes | CAP-22, CAP-27 · AD-2 |
| FR-ORD-6 | Visibility and fact queries | CAP-22, CAP-20 · AD-14, AD-15 |
| FR-ORD-7 | Buyer cancels before paying | CAP-17 · AD-6 |
| FR-ORD-8 | Expire unpaid orders | CAP-17 · AD-6, AD-2 |
| FR-ORD-9 | Closed-purchase query | CAP-7 · AD-2 |
| FR-ORD-10 | Admin order lookup and support contact | CAP-22 (support) · AD-12, NFR-SYS-8 |

#### COM (9)

| ID | Requirement | Traces |
| --- | --- | --- |
| FR-COM-1 | Open an account on approval | CAP-21 · AD-3 |
| FR-COM-2 | Request a top-up (manual V1 behind a port) | CAP-21 · (Plan-2 decision) |
| FR-COM-3 | Admin confirms or rejects a top-up | CAP-21 · NFR-SYS-8 |
| FR-COM-4 | Deduct commission exactly once per order | CAP-21 · AD-3, AD-19, AD-10 |
| FR-COM-5 | Commission amount and rounding rule | CAP-21 |
| FR-COM-6 | Threshold events without flapping | CAP-21 · AD-3, AD-9 |
| FR-COM-7 | Configure the commission rate | CAP-21 · NFR-SYS-8 |
| FR-COM-8 | Ledger views and reconciliation | CAP-21 |
| FR-COM-9 | Low-balance notice | CAP-21 · (Plan-1 OQ3) |

#### TRD (9)

| ID | Requirement | Traces |
| --- | --- | --- |
| FR-TRD-1 | Make an offer on an open-to-trade listing | CAP-25 · AD-4 |
| FR-TRD-2 | Turn-taking: reject, counter, withdraw | CAP-25 |
| FR-TRD-3 | Visibility | CAP-25 |
| FR-TRD-4 | Accept and reserve | CAP-25 · AD-4, AD-6 |
| FR-TRD-5 | Competing offers become unfulfillable | CAP-25 · (Plan-2 decision, from the Plan-1 assumption) |
| FR-TRD-6 | Contact handoff reuses the listings service | CAP-25, CAP-6 · AD-4 |
| FR-TRD-7 | Mutual completion (computed) | CAP-26 · AD-4 |
| FR-TRD-8 | Cancel an accepted trade before confirmation | CAP-26 · AD-6 |
| FR-TRD-9 | Expire open offers | CAP-25 |

#### MSG (8)

| ID | Requirement | Traces |
| --- | --- | --- |
| FR-MSG-1 | Generate an external contact message (listings service) | CAP-6, CAP-25 · AD-4 |
| FR-MSG-2 | Deterministic rendering and edge-safe encoding | CAP-6 |
| FR-MSG-3 | Protect sellers' phone numbers | CAP-6 · NFR-SYS-2 |
| FR-MSG-4 | In-app messaging eligibility | CAP-18 · AD-11 (Plan-2 decision) |
| FR-MSG-5 | Send a message | CAP-18 |
| FR-MSG-6 | Verification changes between compose and send | CAP-18 |
| FR-MSG-7 | Inbox and read state | CAP-18 |
| FR-MSG-8 | Mute a conversation (buyer side) | CAP-18 · added at the Phase 2 gate (review F-29, UX-A-1) |

#### COL (7)

| ID | Requirement | Traces |
| --- | --- | --- |
| FR-COL-1 | Named collections | CAP-11 |
| FR-COL-2 | Add an entry manually | CAP-8, CAP-12 · AD-7 |
| FR-COL-3 | Add an entry by link | CAP-24 · AD-7 |
| FR-COL-4 | Move and copy between collections | CAP-11 |
| FR-COL-5 | Binder layout, sorting and completion | CAP-10 |
| FR-COL-6 | Wishlist, separate from collections | CAP-13, CAP-14 |
| FR-COL-7 | Exactly one post-purchase prompt per closed order | CAP-27 · AD-9, AD-10 |

#### VAL (5)

| ID | Requirement | Traces |
| --- | --- | --- |
| FR-VAL-1 | Current value in integer COP | CAP-9 · money rule |
| FR-VAL-2 | Period trend with a defined zero baseline | CAP-9, CAP-3 |
| FR-VAL-3 | Unpriced and stale items | CAP-9, CAP-12 |
| FR-VAL-4 | Value history series | CAP-9 |
| FR-VAL-5 | Money-shape separation | CAP-3, CAP-9 · money rule |

#### REP (7)

| ID | Requirement | Traces |
| --- | --- | --- |
| FR-REP-1 | Gated review of a business | CAP-7 · AD-2 |
| FR-REP-2 | Ungated review of an individual seller | CAP-7 · (SPEC flagged risk) |
| FR-REP-3 | Aggregate reputation with a stated rounding rule | CAP-7 · AD-12 |
| FR-REP-4 | Hide and unhide a review | CAP-28 · AD-12 |
| FR-REP-5 | Hide and unhide a listing (listings host) | CAP-28 · AD-12 |
| FR-REP-6 | Moderation queue and audit view | CAP-28 · NFR-SYS-8 |
| FR-REP-7 | Profile page with reviews | CAP-7 |

### Non-Functional Requirements Extracted (56)

#### SYS (14)

| ID | Requirement |
| --- | --- |
| NFR-SYS-1 | **Explainability coverage.** **Decision coverage:** 100% of rejection and gate responses across the 12 modules return a `Decision` with a non-empty `reasonCode`, a `humanMessage` and at least one citation with its triggering inputs. This is verified by a … |
| NFR-SYS-2 | **Regulated data never leaks.** Zero occurrences of any of the following in application logs, error messages, `Decision.citations`, event payloads or analytics: a `legalIdentity` field value or document key; a comprobante object key or signed URL; a top-up … |
| NFR-SYS-3 | **Independent executability.** Each module's test suite runs with only PostgreSQL (Docker Compose) and fakes of its neighbours' public interfaces. No test makes an outbound network call; the test harness fails any socket opened outside Postgres. A clean … |
| NFR-SYS-4 | **Virtual time.** Every time-dependent rule reads an injectable clock: cooldowns, freshness, offer and order expiry, trend windows and `occurredAt`. Domain and application code make zero direct reads of the system clock, enforced by a lint … |
| NFR-SYS-5 | **Money-shape safety.** **Integer COP:** all COP amounts are integers, and no floating-point arithmetic touches COP. This is enforced by the type system (`Cop` and `ReferencePrice` are distinct branded types) and by a lint rule banning `number` … |
| NFR-SYS-6 | **Post-commit events are exactly-once in effect.** AD-10's dispatch is adopted. Because this is a launch, the following is added: **Idempotent subscribers:** every subscriber is idempotent by a natural key (`orderId`, `applicationId`, ledger sequence). **Failure log:** every … |
| NFR-SYS-7 | **Server-side authorization.** Every command and every non-public query checks the actor server-side from the session's `userId`. Roles are derived per request (AD-16) and never read from a client claim. Unauthenticated calls to protected procedures return … |
| NFR-SYS-8 | **Admin audit trail.** Every admin action writes an append-only audit record `{adminId, action, targetId, reason?, before?, after?, at}` in the owning module's own table (AD-12: no shared moderation table). That covers approve, reject, … |
| NFR-SYS-9 | **Latency baseline.** Unless a module NFR states otherwise: interactive reads return within **p95 ≤ 1,000 ms**; commands return within **p95 ≤ 800 ms**, excluding file-upload transfer time. |
| NFR-SYS-10 | **Concurrency proofs run on PostgreSQL.** Every concurrency NFR runs against the Docker Compose PostgreSQL instance under real concurrent connections (at least 50 in the pool), never against SQLite or in-memory stores. Each proof runs 100 repetitions with zero … |
| NFR-SYS-11 | **Accessibility.** Responsive (R) and desktop-first (D) surfaces meet WCAG 2.2 AA: contrast, keyboard operation, focus order, and status messages announced through live regions. Status is never conveyed by colour alone, which matters for the … |
| NFR-SYS-12 | **Platform personal-data consent.** [ASSUMPTION; extends beyond AD-13's `legalIdentity`-only scope, see OQ-5]. **At sign-up:** account creation records `signupConsentVersion` and `signupConsentAt` on `User`, in the same insert as the user, so no personal data is … |
| NFR-SYS-13 | **Error-code integrity.** In CI: every thrown `DomainError` resolves to exactly one owning module in the registry (§4.2 / `ADD-§3`); no module declares a code another module owns; no DomainError is caught and re-thrown as a different code across a … |
| NFR-SYS-14 | **Abuse baseline.** [ASSUMPTION: values are OQ-11 parameters]. **Auth throttling:** sign-in is limited to 10 failed attempts per account per 15 minutes and 30 per IP per 15 minutes; sign-up to 5 per IP per hour. A throttled attempt is refused … |

#### IDN (3)

| ID | Requirement |
| --- | --- |
| NFR-IDN-1 | `getCapabilities`, `getListingEligibility` and `getSellerKinds` (500 ids, the interface maximum) each respond in p95 ≤ 50 ms under the §7 protocol, because they run inside other modules' request paths. |
| NFR-IDN-2 | **(mandatory edge case).** 100 repetitions of the race below, each on a fresh account, give exactly one success and one explained rejection every time. |
| NFR-IDN-3 | 0 procedures accept a client-supplied role, seller-kind or capability field, verified by a schema scan of every tRPC input. |

#### VER (4)

| ID | Requirement |
| --- | --- |
| NFR-VER-1 | **(mandatory edge case).** in 100 repetitions, two admins act on the same `Pending` application concurrently, one approving and one rejecting. |
| NFR-VER-2 | 100% of `legalIdentity` reads and denials are audited, verified by comparing the access-log count with the number of instrumented reads in the test suite. |
| NFR-VER-3 | the review queue, with 1,000 pending applications, responds in p95 ≤ 1,000 ms. A document signed URL is issued in p95 ≤ 300 ms. |
| NFR-VER-4 | document uploads are ≤ 5 MB per file and at most 3 files. Upload plus validation completes in p95 ≤ 10 s on a 10 Mbps link. |

#### CAT (4)

| ID | Requirement |
| --- | --- |
| NFR-CAT-1 | FR-CAT-1 over 10,000 entries in p95 ≤ 1,000 ms. `getPriceProvenance` for 48 entries in p95 ≤ 300 ms. |
| NFR-CAT-2 | a 10,000-row ingestion run completes in ≤ 120 s. A rerun creates 0 duplicates, verified by a uniqueness constraint on `externalKey` and a count comparison. |
| NFR-CAT-3 | 0 fabricated prices. When the fault switch is set to `down`, `stale` or `malformedRows`, every displayed reference price equals a stored observation byte-for-byte, and every stale one carries the stale label. |
| NFR-CAT-4 | The daily TRM job runs outside request paths. It makes one attempt per hour from 07:00 to 20:00 `America/Bogota` until a rate covering today is stored (`ADD-§6`). Each attempt retries transport failures at most 3 times with … |

#### INV (4)

| ID | Requirement |
| --- | --- |
| NFR-INV-1 | **(Annex scenario 3).** 100 repetitions of the race below. Each time exactly 1 order or trade reservation succeeds and the other 49 receive `InsufficientQuantity`. |
| NFR-INV-2 | a mixed race of purchases and trades gives the same result as NFR-INV-1. |
| NFR-INV-3 | **(mandatory edge case).** in 100 repetitions, the caller reserves and then aborts after the reserve. |
| NFR-INV-4 | a single reservation completes in p95 ≤ 150 ms (a bundle of 20 components in p95 ≤ 300 ms). Listing creation completes in p95 ≤ 800 ms. |

#### DSC (3)

| ID | Requirement |
| --- | --- |
| NFR-DSC-1 | `view=listings` with a 15 km area responds in p95 ≤ 1,000 ms on the §3 seed and in p95 ≤ 1,500 ms on a scale seed of 50,000 listings [ASSUMPTION: the launch-year upper bound]. `view=entries` meets the same targets on a scale … |
| NFR-DSC-2 | distance error is ≤ 1 m against the haversine reference for 1,000 random Colombian point pairs. |
| NFR-DSC-3 | ordering is deterministic, verified by 10 identical runs producing 0 differences in ordering. |

#### ORD (4)

| ID | Requirement |
| --- | --- |
| NFR-ORD-1 | **(mandatory edge case).** out-of-order and duplicate confirmations are safe. The following sequences run for 100 repetitions: the business confirming before the buyer's paid confirmation; the business confirming before any comprobante; double-clicks on … |
| NFR-ORD-2 | order creation (including the reservation) responds in p95 ≤ 800 ms. A 5 MB comprobante upload plus validation completes in p95 ≤ 10 s on a 10 Mbps link (Plan-1 NFR). |
| NFR-ORD-3 | 0 funds-held states or payment-gateway calls, verified by a schema check (no balance, escrow or payment-status column on `Order`) and by the NFR-SYS-3 network guard. |
| NFR-ORD-4 | the stalled-order gap is documented in UI copy. A paid order with no business confirmation after 7 days shows the "Waiting for confirmation" state and a link to the configured support contact (FR-ORD-10). No automated action … |

#### COM (4)

| ID | Requirement |
| --- | --- |
| NFR-COM-1 | **(mandatory edge case).** in 100 repetitions: Setup: two orders, each owing 3,600, are confirmed at the same instant against a balance of 5,000, and one of the events is delivered twice. Each order produces exactly 1 ledger entry. The final balance is … |
| NFR-COM-2 | reconciliation is exact over a randomised sequence of 10,000 top-ups and deductions with 20% duplicate deliveries: `balance = Σ top-ups − Σ deductions` with a difference of 0 pesos. |
| NFR-COM-3 | the deduction handler runs in p95 ≤ 200 ms, and a top-up confirmation in p95 ≤ 800 ms. |
| NFR-COM-4 | 0 floating-point operations on COP in the commission code path, enforced by lint (NFR-SYS-5) and a property test against a BigInt reference. |

#### TRD (3)

| ID | Requirement |
| --- | --- |
| NFR-TRD-1 | **(mandatory edge case).** in 100 repetitions: Setup: a last-unit listing with two `Open` offers, and Valentina accepting both concurrently from two sessions. Exactly one offer ends `Accepted` with a reservation. The other ends `Unfulfillable`, and its … |
| NFR-TRD-2 | accept responds in p95 ≤ 800 ms and other actions in p95 ≤ 500 ms. |
| NFR-TRD-3 | a trade-versus-purchase race on a shared unit never oversells (NFR-INV-2). |

#### MSG (4)

| ID | Requirement |
| --- | --- |
| NFR-MSG-1 | contact-message generation takes p95 ≤ 200 ms. Output is deterministic: 1 distinct output per input across 1,000 runs. |
| NFR-MSG-2 | in-app freshness through polling, with no real-time push (§5). The inbox and open threads poll every 30 s. A sent message is visible to the recipient within ≤ 35 s at p95. Send takes p95 ≤ 500 ms. |
| NFR-MSG-3 | 0 outbound calls to external messaging services (NFR-SYS-3 guard). |
| NFR-MSG-4 | **(mandatory edge case).** every fixture name renders correctly. That covers ñ, accents, emoji, the 500-character name and URL-like text. Correct means: the URL is within the length limit; the round-trip decode is exact; the price is formatted per … |

#### COL (3)

| ID | Requirement |
| --- | --- |
| NFR-COL-1 | **(mandatory edge case).** in 100 repetitions: Setup: `OrderClosed` is delivered twice, then the prompt is accepted twice concurrently from two sessions. Exactly 1 prompt row exists and exactly 1 entry per order line. The second accept receives … |
| NFR-COL-2 | a binder page render (sorted, 500-entry collection) takes p95 ≤ 800 ms. A wishlist of 200 items with availability takes p95 ≤ 1,000 ms. |
| NFR-COL-3 | there are 0 `CatalogEntry` writes from `collections`, verified by table-ownership lint (AD-8) and by a count assertion around the FR-COL-3 tests. |

#### VAL (3)

| ID | Requirement |
| --- | --- |
| NFR-VAL-1 | **(mandatory edge case).** The zero baseline yields `changePercent=null`, never `NaN` or `Infinity`, across the empty collection, the all-unpriced collection and the all-new collection. For the 500-entry collection, `Σ entryValueCop == totalCop` … |
| NFR-VAL-2 | current value plus the 30-day trend for 500 entries takes p95 ≤ 1,500 ms, and the 365-day history p95 ≤ 2,500 ms. |
| NFR-VAL-3 | 0 floating-point operations on COP in valuation code. Percentages are computed in exact integer or rational arithmetic and formatted at presentation. |

#### REP (3)

| ID | Requirement |
| --- | --- |
| NFR-REP-1 | **(mandatory edge case).** A review submitted while the order is paid but not closed is refused with `NotVerifiedPurchaser` in 100/100 cases. A hide and a new post on the same target run concurrently, 100 repetitions. Every subsequent read shows `count` … |
| NFR-REP-2 | a profile read (aggregate plus the first page) takes p95 ≤ 300 ms. A hide takes effect on the very next read (0 s cache). |
| NFR-REP-3 | 0 hard deletes of `Review` or `Listing` rows, verified by revoking the application's DB role's `DELETE` privilege on those tables in a test that runs the full suite. |

### Additional Requirements / Constraints

- **Registry (ADD-§3).** 83 DomainErrors and 12 DecisionCodes, each with exactly one owner module. AD-SYS-1 requires each code to have a registry row, an es-CO template and a test that triggers it.
- **Events (ADD-§5).** 7 domain events, each with one publisher, idempotent by the listed key.
- **Retention (ADD-§9.4).** Retention periods per regulated data class. The `retention-purge` job enforces them (ARCH §13).
- **Open questions.** 11 of 12 are resolved. OQ-9 (the choice of price feed) stays open: owner Team, before launch.
- **Assumptions.** 58 are indexed and none is marked blocking.

### PRD Completeness Assessment

The PRD is complete for its purpose. Every FR has a stable ID, a trace line (CAP / AD) and acceptance criteria, and every NFR is measurable. Three maintenance gaps remain from the later phases:

1. The frontmatter still says `status: draft` (R-1).
2. Seven sentences still defer to "Phase 3" or to open questions that Phase 3 has since resolved (R-2).
3. PRD §4.2 lags the ARCHITECTURE:
   - It lists 72 of the 83 codes.
   - It names three tables that ARCHITECTURE replaced (`ContactRequestCounter`, `ConversationReadState`, `PrivacyConsent`) and does not say what replaced them (R-3).

None of these makes a requirement ambiguous. All three were fixed by R-1..R-3 (applied). The extract above reflects the fixed PRD; the only requirement text that changed is NFR-SYS-12, which now names the `User` consent columns.

---

## Step 3: Epic Coverage Validation

**Not applicable.** There are no epics by design (see Step 1). In place of epic coverage, the gate traces every FR from the PRD through the UX (scenario and page spec) to the ARCHITECTURE (the AD whose **Binds** line cites it, else the AD body, else the §6.x module section).

### Coverage Matrix (FR → UX → ARCHITECTURE)

The matrix below is the post-remediation run. On the initial run, the four rows marked "(R-4)" showed **not cited** in the ARCHITECTURE column.

| FR | Requirement | UX (scenario, page spec) | Architecture (AD Binds; * = AD body; §6.x) |
| --- | --- | --- | --- |
| FR-IDN-1 | Derive capabilities server-side | IDN-S1, IDN-S4, 1.1, 1.3, 8.1 | AD-IDN-1, AD-IDN-3, §6.1 |
| FR-IDN-2 | Complete the individual-seller profile step | IDN-S2, IDN-S3, 1.1, 1.2 | AD-IDN-2, §6.1 |
| FR-IDN-3 | Answer listing eligibility | IDN-S2, INV-S4, 1.1, 1.2, 4.1 | AD-IDN-1, §6.1 |
| FR-IDN-4 | Guard seller-type exclusivity atomically | IDN-S3, VER-S1, 1.1, 1.2, 5.1 | AD-IDN-2, §6.1 |
| FR-IDN-5 | Capability audit trace for admins | IDN-S4, 1.1, 1.3, 5.3 | AD-IDN-1, §6.1 |
| FR-IDN-6 | Messaging, review-target and seller-kind queries | DSC-S2, MSG-S3, 1.1, 4.2 | AD-IDN-1, §6.1 |
| FR-IDN-7 | Authentication and admin gating | IDN-S1, IDN-S4, 1.1, 1.3 | AD-IDN-3, §6.1 |
| FR-VER-1 | Submit a business application | IDN-S3, VER-S1, 1.1, 5.1 | AD-IDN-2, AD-VER-3, §6.1, §6.2 |
| FR-VER-2 | Admin review queue | VER-S2, 5.3 | §6.2 (R-4) |
| FR-VER-3 | Approve | VER-S2, 5.3 | AD-VER-1, §6.2 |
| FR-VER-4 | Reject with a policy reason | VER-S3, 5.2, 5.3, 5.5 | AD-VER-1, §6.2 |
| FR-VER-5 | Access to legal identity only through admin review | VER-S2, VER-S4, 5.2, 5.3, 5.4 | AD-VER-2, §6.2 |
| FR-VER-6 | Reapplication policy | VER-S3, 5.1, 5.5 | AD-VER-3, §6.2 |
| FR-VER-7 | Applicant status view | VER-S1, VER-S3, 5.2 | AD-VER-3, §6.2 |
| FR-VER-8 | Rejection-reason policy settings | VER-S3, 5.5 | AD-VER-1, §6.2 |
| FR-VER-9 | Business payment instructions for orders | ORD-S1, 5.2, 6.1 | §6.2 (R-4) |
| FR-CAT-1 | Browse and filter the catalog by collector attributes | CAT-S1, 2.1 | §6.3 (R-4) |
| FR-CAT-2 | One stable identity per card or product | CAT-S1, 2.1 | AD-CAT-1, §6.3 |
| FR-CAT-3 | Feed ingestion with idempotent upsert and quarantine | CAT-S3, 2.3 | AD-CAT-1, §6.3 |
| FR-CAT-4 | Attribute changes keep the identity | CAT-S3, 2.3 | AD-CAT-1, §6.3 |
| FR-CAT-5 | Reference prices as a distinct value object | CAT-S2, 2.2 | AD-CAT-2, §6.3 |
| FR-CAT-6 | Price provenance for the card detail | CAT-S2, 2.2 | AD-CAT-2, §6.3 |
| FR-CAT-7 | Freshness and feed outage | CAT-S4, VAL-S3, 2.2, 2.3, 10.1, 10.2 | AD-CAT-2, §6.3 |
| FR-CAT-8 | Official exchange rate (TRM) | CAT-S2, CAT-S4, 2.2, 2.3 | AD-CAT-3, §6.3 |
| FR-INV-1 | Create a card or sealed-product listing | INV-S1, INV-S2, INV-S4, 4.1 | AD-INV-1, §6.4 |
| FR-INV-2 | Create a bundle | INV-S1, 4.1 | AD-INV-1, §6.4 |
| FR-INV-3 | Reserve inventory atomically in the caller's transaction | INV-S2, INV-S3, ORD-S1, ORD-S3, TRD-S3, 4.3, 6.1, 8.1, 8.4 | AD-INV-2, §6.4 |
| FR-INV-4 | Shared-quantity reconciliation | INV-S2, TRD-S3, 4.2, 4.3, 8.4 | AD-INV-1, §6.4 |
| FR-INV-5 | Release a reservation | ORD-S1, 4.3 | AD-INV-2, §6.4 |
| FR-INV-6 | Aborted caller transaction restores quantity | INV-S3, 4.3 | AD-INV-2, §6.4, §6.6 |
| FR-INV-7 | Purchasability, verified badge and commission pause | COM-S1, COM-S3, COM-S4, INV-S4, MSG-S3, ORD-S3, VER-S2, 2.2, 4.1, 4.2, 4.3, 5.2, 6.1, 6.3, 7.1 | AD-INV-3, §6.4 |
| FR-INV-8 | Withdraw on rejection, restore on approval | INV-S4, VER-S2, VER-S3, 4.2, 4.3 | AD-INV-3, §6.4 |
| FR-INV-9 | Edit, restock and deactivate | 4.2 | AD-INV-1, §6.4 |
| FR-INV-10 | Listing detail and owner view | REP-S4, 2.2, 4.2, 11.3 | §6.4 |
| FR-DSC-1 | One browse query for both seller kinds | CAT-S1, DSC-S1, 2.1, 3.1, 3.2, 9.3 | AD-DSC-1, §6.5 |
| FR-DSC-2 | Correct geodesic distance and an inclusive boundary | DSC-S1, 3.1, 3.2 | AD-DSC-1, §6.5 |
| FR-DSC-3 | Unusable locations are excluded and explained | DSC-S1, 3.1, 3.2 | AD-DSC-1, §6.5 |
| FR-DSC-4 | Pickup is derived on read | DSC-S2, 3.1, 3.2 | AD-DSC-1, AD-DSC-2, §6.5 |
| FR-DSC-5 | Deterministic ranking with an explanation for each row | DSC-S3, 2.2, 3.1, 3.2 | AD-DSC-1, §6.5 |
| FR-DSC-6 | Moderation and state exclusion take effect immediately | DSC-S4, REP-S4, 3.1, 3.2, 11.3 | AD-DSC-1, §6.5 |
| FR-DSC-7 | Card detail composition | CAT-S2, 2.2, 3.2 | AD-DSC-2, §6.5 |
| FR-ORD-1 | Purchase and reserve at creation | ORD-S1, ORD-S3, 6.1, 6.4 | AD-ORD-1, §6.6 |
| FR-ORD-2 | Upload or replace the comprobante | ORD-S2, 6.2, 7.1 | AD-ORD-3, §6.6 |
| FR-ORD-3 | Buyer confirms "I paid" | ORD-S2, 6.2 | AD-ORD-2, §6.6 |
| FR-ORD-4 | Business confirms payment received | ORD-S2, 6.3 | AD-ORD-2, §6.6 |
| FR-ORD-5 | Buyer confirms item received; the order closes | ORD-S4, 6.2, 6.3, 6.4 | AD-ORD-2, §6.6 |
| FR-ORD-6 | Visibility and fact queries | ORD-S2, ORD-S4, 1.3, 6.2, 6.3 | AD-ORD-3, §6.6 |
| FR-ORD-7 | Buyer cancels before paying | ORD-S1, 6.1, 6.2 | AD-ORD-2, §6.6 |
| FR-ORD-8 | Expire unpaid orders | ORD-S4, 6.2, 6.4 | AD-ORD-2, §6.6 |
| FR-ORD-9 | Closed-purchase query | ORD-S4, REP-S1, 6.2, 11.1 | AD-ORD-3, §6.6 |
| FR-ORD-10 | Admin order lookup and support contact | IDN-S4, 1.3, 6.2 | AD-ORD-3, §6.6 |
| FR-COM-1 | Open an account on approval | COM-S1, VER-S2, 7.1, 7.2 | AD-COM-1*, §6.7 |
| FR-COM-2 | Request a top-up (manual V1 behind a port) | COM-S1, 7.1, 7.3 | AD-COM-3, §6.7 |
| FR-COM-3 | Admin confirms or rejects a top-up | COM-S1, COM-S4, 7.1, 7.3 | AD-COM-1, AD-COM-3, §6.7 |
| FR-COM-4 | Deduct commission exactly once per order | COM-S2, COM-S3, 6.3, 7.2, 7.5 | AD-SYS-3, AD-COM-1, AD-COM-2, §6.7 |
| FR-COM-5 | Commission amount and rounding rule | COM-S2, 7.2, 7.4, 7.5 | AD-SYS-3, AD-COM-2, §6.7 |
| FR-COM-6 | Threshold events without flapping | COM-S3, COM-S4, 7.1, 7.2, 7.3, 7.5 | AD-COM-1, §6.7 |
| FR-COM-7 | Configure the commission rate | COM-S4, 7.4 | AD-COM-2, §6.7 |
| FR-COM-8 | Ledger views and reconciliation | COM-S2, COM-S4, 7.2, 7.4 | AD-COM-1, §6.7 |
| FR-COM-9 | Low-balance notice | COM-S3, 7.1 | AD-COM-3, §6.7 |
| FR-TRD-1 | Make an offer on an open-to-trade listing | TRD-S1, 8.1, 8.4 | AD-TRD-1, §6.8 |
| FR-TRD-2 | Turn-taking: reject, counter, withdraw | TRD-S2, 8.2, 8.3 | AD-TRD-1, §6.8 |
| FR-TRD-3 | Visibility | TRD-S2, 8.2, 8.3, 8.4 | AD-TRD-1, §6.8 |
| FR-TRD-4 | Accept and reserve | TRD-S3 | AD-TRD-2, §6.8 |
| FR-TRD-5 | Competing offers become unfulfillable | TRD-S3, TRD-S4, 8.3 | AD-TRD-2, §6.8 |
| FR-TRD-6 | Contact handoff reuses the listings service | MSG-S4, TRD-S3, TRD-S4, 8.1, 8.2, 12.3 | AD-MSG-1, §6.9 |
| FR-TRD-7 | Mutual completion (computed) | TRD-S4, 8.3 | AD-TRD-3, §6.8 |
| FR-TRD-8 | Cancel an accepted trade before confirmation | TRD-S4, 8.2, 8.3 | AD-TRD-3, §6.8 |
| FR-TRD-9 | Expire open offers | TRD-S1, 8.1, 8.2, 8.3, 8.4 | AD-TRD-1, §6.8 |
| FR-MSG-1 | Generate an external contact message (listings service) | MSG-S1, MSG-S4, ORD-S3, TRD-S3, 8.2, 12.1, 12.3 | AD-MSG-1, §6.9 |
| FR-MSG-2 | Deterministic rendering and edge-safe encoding | MSG-S1, MSG-S4, 12.1 | AD-MSG-1, §6.9 |
| FR-MSG-3 | Protect sellers' phone numbers | MSG-S1, MSG-S4, 1.2, 12.1, 12.3 | AD-MSG-1, §6.9 |
| FR-MSG-4 | In-app messaging eligibility | MSG-S2, MSG-S3, 5.2, 12.2 | AD-MSG-2, §6.9 |
| FR-MSG-5 | Send a message | MSG-S2, 12.2, 12.3 | AD-MSG-2, §6.9 |
| FR-MSG-6 | Verification changes between compose and send | MSG-S3, 12.2 | AD-MSG-2, §6.9 |
| FR-MSG-7 | Inbox and read state | MSG-S2, MSG-S3, 12.2, 12.3 | AD-MSG-3, §6.9 |
| FR-MSG-8 | Mute a conversation (buyer side) | MSG-S2, 12.2 | AD-MSG-3, §6.9 |
| FR-COL-1 | Named collections | COL-S1, 9.1, 9.2 | AD-COL-1, §6.10 |
| FR-COL-2 | Add an entry manually | COL-S2, COL-S4, 9.2 | AD-COL-1, §6.10 |
| FR-COL-3 | Add an entry by link | COL-S2, 9.1, 9.2 | AD-COL-1, §6.10 |
| FR-COL-4 | Move and copy between collections | COL-S1, COL-S4, 9.1 | AD-COL-1, §6.10 |
| FR-COL-5 | Binder layout, sorting and completion | COL-S1, 9.1 | AD-COL-1, §6.10 |
| FR-COL-6 | Wishlist, separate from collections | COL-S3, 9.3 | §6.10 (R-4) |
| FR-COL-7 | Exactly one post-purchase prompt per closed order | COL-S4, ORD-S4, 6.2, 9.4 | AD-COL-2, §6.10 |
| FR-VAL-1 | Current value in integer COP | VAL-S1, 10.1, 10.3 | AD-VAL-1, §6.3, §6.11 |
| FR-VAL-2 | Period trend with a defined zero baseline | VAL-S2, VAL-S4, 10.1, 10.2, 10.3 | AD-VAL-2, §6.11 |
| FR-VAL-3 | Unpriced and stale items | VAL-S3, 10.1 | AD-VAL-1, §6.11 |
| FR-VAL-4 | Value history series | VAL-S4, 10.2, 10.3 | AD-VAL-2, §6.11 |
| FR-VAL-5 | Money-shape separation | VAL-S1, 10.1, 10.3 | AD-VAL-1, §6.11 |
| FR-REP-1 | Gated review of a business | ORD-S4, REP-S1, 11.1 | AD-REP-1, §6.12 |
| FR-REP-2 | Ungated review of an individual seller | ORD-S4, REP-S2, 11.1 | AD-REP-1, §6.12 |
| FR-REP-3 | Aggregate reputation with a stated rounding rule | REP-S2, REP-S3, 11.2 | AD-REP-2, §6.12 |
| FR-REP-4 | Hide and unhide a review | DSC-S4, REP-S4, 11.1, 11.2, 11.3, 11.4 | AD-REP-3, §6.12 |
| FR-REP-5 | Hide and unhide a listing (listings host) | REP-S4, 11.3, 11.4 | AD-REP-3, §6.12 |
| FR-REP-6 | Moderation queue and audit view | DSC-S4, REP-S4, 1.3, 7.4, 11.3, 11.4 | AD-REP-3, §6.12 |
| FR-REP-7 | Profile page with reviews | REP-S1, REP-S2, REP-S3, 11.1, 11.2 | AD-REP-2, §6.12 |

### Missing Requirements (initial run)

- **UX:** none. All 96 FRs are cited by at least one scenario or page spec.
- **ARCHITECTURE:** 4 FRs are served by the architecture but not cited by ID:
  - FR-CAT-1 (`catalog.browse`).
  - FR-COL-6 (wishlist and `getAvailabilitySummary`).
  - FR-VER-2 (`verification.queue`).
  - FR-VER-9 (`getBusinessPaymentInstructions` / `updatePaymentInstructions`).

  Each has a procedure in its module's §6 table, so these are citation gaps, not missing designs. R-4 adds the citations.
- **NFRs:** 7 of 56 are not cited in ARCHITECTURE: NFR-COM-3, NFR-REP-1, NFR-SYS-9, NFR-SYS-11, NFR-TRD-2, NFR-VER-3, NFR-VER-4.
  - For five of them the mechanism already exists, so only the citation is missing.
  - NFR-SYS-9 (latency) and NFR-SYS-11 (accessibility) had no test-harness rule in ARCHITECTURE. R-4 added one for each, as AD-SYS-6 rules 7 and 8 (see §8).

### Coverage Statistics

| Measure | Initial run | After R-1..R-6 |
| --- | --- | --- |
| FRs cited in UX | 96 / 96 (100%) | 96 / 96 (100%) |
| FRs cited in ARCHITECTURE | 92 / 96 (95.8%) | 96 / 96 (100%) |
| NFRs cited in ARCHITECTURE | 49 / 56 (87.5%) | 56 / 56 (100%) |
| IDs cited downstream but absent from the PRD | 0 | 0 |

---

## Step 4: UX Alignment Assessment

### UX Document Status

Found and final: DESIGN.md, EXPERIENCE.md, the microcopy registry, 48 scenarios and 43 page specs.

### A. UX ↔ PRD Alignment

- Every FR is cited by a scenario or page spec. Every module has its 4 scenarios, as the Annex requires.
- The UX cites no ID that the PRD lacks.
- The PRD's UX-bearing NFRs (NFR-SYS-11 accessibility, the es-CO voice rules) are carried by the EXPERIENCE.md Accessibility Floor and Voice and Tone sections.
- **The false positives were checked by hand.** The UX cites four backticked tokens that are not registry codes, and none is a defect:
  - `CommissionBalanceExhausted` and `CommissionBalanceReplenished` are events (ADD-§5), not codes.
  - `DataMismatch` and `IncompleteDocuments` are rejection-reason keys from the VER 5.5 reason policy, not codes.

### B. UX ↔ Architecture Alignment

- Every procedure a page spec calls exists in its module's ARCH §6 table. Every AD-SYS-1 code the UX shows is registered.
- The upload flows match AD-SYS-8. Every upload goes through the same checks: size ≤ 5 MiB, magic bytes, then the malware scanner. Admins view uploads only inside the sandboxed viewer.
- The scheduled behaviour the UX promises (expiry, reminders, digests) matches ARCH §13.

### Alignment Issues

1. **[FOUND DURING THIS ASSESSMENT, fix R-5] The microcopy registry is incomplete.**
   - AD-SYS-1 needs one es-CO template per code. The registry covers 72/83 DomainErrors and 11/12 DecisionCodes.
   - 12 codes have no template. Four of them already have copy under an unkeyed "situation" row: collection limit, round limit, unchanged counter and rate start in the past.
   - `ComprobanteInvalidFile` has type and size variants but lacks the scanner cause that AD-SYS-8 rule 6.3 can raise.
2. **[FOUND DURING THIS ASSESSMENT, fix R-6a] VER 5.5 cites the wrong code.** Page 5.5 L113 cites `RequestValidationFailed` for deactivating the last active rejection reason. The Phase 3 PRD sync made that code `LastActiveReasonRequired`. Under AD-SYS-1 rule 7, `RequestValidationFailed` comes only from the tRPC input parser. The page keeps its copy; only the cited code changes.
3. **[FOUND DURING THIS ASSESSMENT, fix R-6b] CAT 2.3 lacks the event panel.**
   - ARCH §7.3 and AD-SYS-2 put failed-delivery listing and `admin.events.replay` "on page 2.3's event panel".
   - The page spec has four tabs (Ejecuciones · Cuarentena · Revisiones · TRM) and no event panel.
   - The TRM tab also has no state for `FxRateSourceMismatch`, which ARCH §8.2 says "is logged on 2.3".
4. **[FOUND DURING THIS ASSESSMENT, fix R-6c] One rail item has no destination.** EXPERIENCE.md L73 has admin rail item "10. Entregas fallidas" (with the NFR-SYS-6 badge), but no page spec is its destination. The fix points it to the new 2.3 panel.
5. **[FOUND DURING THIS ASSESSMENT, fix R-6d] DSC 3.1 has no too-broad-filter state.** The listing search page spec has no page state for `SearchFilterTooBroad` (AD-DSC-2).

All five issues were fixed by R-5 and R-6 (applied, §8).

### Warnings

- UX carries 16 `[ASSUMPTION]` tags and ARCHITECTURE carries 21. All were triaged at their phase gates, and none is blocking.
- Epics and stories do not exist, so this gate cannot check story-level acceptance criteria. That check belongs to the build phase.

---

## Step 5: Epic Quality Review

**Not applicable, which is distinct from passed.** No epics or stories exist by design. The workflow's epic checks (user value, independence, forward dependencies, story sizing, acceptance criteria) have no subject. They must run when epics are created.

---

## 6. Cross-Module Consistency (task statement, Phase 4 instruction 2)

| Check | Result | Evidence (audit rule) |
| --- | --- | --- |
| One owner per table | **PASS.** 47 tables, each defined by exactly one module. Four shared-kernel infrastructure tables are named in AD-SYS-2. | R7 |
| One owner per event | **PASS.** 7 events, one publisher each. ADD-§5, ARCH §7.1 and the §6 ports agree. | R8 |
| One owner per DomainError / DecisionCode | **PASS.** 83 + 12 codes, no duplicate rows, and ARCH §8 owners agree with ADD-§3. | R6 |
| Every consumed interface is published by its owner | **PASS.** All 43 consumed neighbour calls parsed from the §6 ports are offered by the owning module. | R7 |
| No dependency edge outside AD-1 | **PASS.** 13 of the 13 allowed compile-time edges are used, none falls outside AD-1, and every event subscription rides an AD-1 edge. | R7, R8 |
| All review findings triaged | **PASS.** 4 reviews, 119 findings, 119 dispositioned. | R1 |
| Items deferred to Phase 3 closed | **PASS.** 17 EC items closed in ARCH §12.2 and EC-33 deferred to v2 (§14). The PRD review's F-14 (malware scan) and F-17 (pooler) are closed by AD-SYS-8 and AD-SYS-4. Note that the PRD review's F-14 is a different finding from the architecture review's F-14 in §10. | R2 |

The only cross-module gap on the initial run was naming, not ownership: PRD §4.2 still named three tables that ARCHITECTURE had replaced. R-3 fixed it, and the post-remediation run shows no mismatch (§9).

---

## 7. Terminal Readiness Audit

The audit is a deterministic script (`readiness.py`, rules R1–R11) run against the package. Its full output from the initial run follows, unedited.

```text
==============================================================================
R1  Review triage completeness (Phases 1-3)
==============================================================================
reviews/review-prd-adversarial.md
  status: triaged — resolved at Phase 1 gate (2026-09-23)
  findings: 30  dispositioned: 30  {'Accept': 28, 'Gate': 1, 'Defer': 1}
reviews/review-ux-edge-cases.md
  status: triaged — adopted in full at the Phase 2 gate (2026-09-27)
  findings: 53  dispositioned: 53  {'Accept': 30, 'Reject': 9, 'Defer': 14}
reviews/review-arch-adversarial.md
  status: triaged — Phase 3 gate, 2026-09-27
  findings: 17  dispositioned: 17  {'Accept': 14, 'Defer': 1, 'Reject': 2}
reviews/review-arch-edge-cases.md
  status: triaged — Phase 3 gate, 2026-09-27
  findings: 19  dispositioned: 19  {'Accept': 17, 'Defer': 2}

==============================================================================
R2  Items deferred to Phase 3 are closed in ARCHITECTURE.md
==============================================================================
  EC-07  closed in §12.2
  EC-08  closed in §12.2
  EC-11  closed in §12.2
  EC-14  closed in §12.2
  EC-29  closed in §12.2
  EC-30  closed in §12.2
  EC-32  closed in §12.2
  EC-34  closed in §12.2
  EC-35  closed in §12.2
  EC-36  closed in §12.2
  EC-37  closed in §12.2
  EC-38  closed in §12.2
  EC-39  closed in §12.2
  EC-40  closed in §12.2
  EC-41  closed in §12.2
  EC-42  closed in §12.2
  EC-43  closed in §12.2
  EC-33  deferred to v2, listed in §14
  PRD F-14 (malware scan)            closed: AD-SYS-8 / G-4
  PRD F-17 (pooler/interactive tx)   closed: AD-SYS-4

==============================================================================
R3  PRD open questions and blocking assumptions
==============================================================================
  OQ-1   resolved  **Resolved at gate:** No (as recommended)
  OQ-2   resolved  **Resolved in Phase 3:** AD-SYS-2, AD-SYS-3 (ARCHITECTURE §12.1)
  OQ-3   resolved  **Resolved at gate:** charge on whichever comes first, business confir
  OQ-4   resolved  **Resolved in Phase 3:** AD-SYS-2, ARCHITECTURE §7.3
  OQ-5   resolved  **Resolved at gate:** adopted
  OQ-6   resolved  **Resolved in Phase 3:** as recommended, AD-TRD-3 rule 5
  OQ-7   resolved  **Resolved in Phase 3:** yes, produced only by the input parser (AD-SY
  OQ-8   resolved  **Resolved in Phase 3:** as recommended, AD-DSC-2
  OQ-9   OPEN      Team, pre-launch
  OQ-10  resolved  **Resolved in Phase 3:** as recommended, AD-INV-1
  OQ-11  resolved  **Resolved at gate:** defaults adopted as configuration
  OQ-12  resolved  **Resolved at gate:** defaults adopted; legal review before launch rem
  assumptions indexed: 58; marked blocking=Yes: none

==============================================================================
R4  FR and NFR coverage: PRD -> UX -> ARCHITECTURE
==============================================================================
  CAT:  8 FRs | UX  8/8 | ARCH  7/8 | ARCH-miss ['FR-CAT-1']
  COL:  7 FRs | UX  7/7 | ARCH  6/7 | ARCH-miss ['FR-COL-6']
  COM:  9 FRs | UX  9/9 | ARCH  9/9
  DSC:  7 FRs | UX  7/7 | ARCH  7/7
  IDN:  7 FRs | UX  7/7 | ARCH  7/7
  INV: 10 FRs | UX 10/10 | ARCH 10/10
  MSG:  8 FRs | UX  8/8 | ARCH  8/8
  ORD: 10 FRs | UX 10/10 | ARCH 10/10
  REP:  7 FRs | UX  7/7 | ARCH  7/7
  TRD:  9 FRs | UX  9/9 | ARCH  9/9
  VAL:  5 FRs | UX  5/5 | ARCH  5/5
  VER:  9 FRs | UX  9/9 | ARCH  7/9 | ARCH-miss ['FR-VER-2', 'FR-VER-9']
  total FRs: 96  (defined as headings/bold: 96)
  total NFRs: 56  cited in ARCH: 49/56  miss ['NFR-COM-3', 'NFR-REP-1', 'NFR-SYS-9', 'NFR-SYS-11', 'NFR-TRD-2', 'NFR-VER-3', 'NFR-VER-4']
  ids cited in ARCHITECTURE but absent from PRD: none
  ids cited in UX but absent from PRD: none
  ids cited in addendum but absent from PRD: none

==============================================================================
R5  Scenario coverage (Annex: 4 scenarios per module)
==============================================================================
  IDN: scenarios 4  page specs 3
  CAT: scenarios 4  page specs 3
  DSC: scenarios 4  page specs 2
  INV: scenarios 4  page specs 3
  VER: scenarios 4  page specs 5
  ORD: scenarios 4  page specs 4
  COM: scenarios 4  page specs 5
  TRD: scenarios 4  page specs 4
  COL: scenarios 4  page specs 4
  VAL: scenarios 4  page specs 3
  REP: scenarios 4  page specs 4
  MSG: scenarios 4  page specs 3
  total scenarios 48  page specs 43  modules 12

==============================================================================
R6  One owner per DomainError / DecisionCode
==============================================================================
  addendum: 83 DomainErrors, 12 DecisionCodes, duplicate rows: none
  owners: {'identity': 20, 'catalog': 6, 'listings': 19, 'orders': 12, 'commission': 6, 'trading': 12, 'messaging': 3, 'collections': 11, 'reviews': 4, 'shared-kernel': 2}
  ARCH §8.1/§8.2 owners agree with addendum: True
  PRD §4.2 lists 72 codes; owner mismatches vs addendum: none; not in addendum: none
  DomainErrors in addendum but not listed in PRD §4.2 (11): ['CollectionLimitReached', 'CommissionRateNotFutureDated', 'EventDeliveryNotReplayable', 'InvalidCatalogEntry', 'InvalidDocumentFile', 'LastActiveReasonRequired', 'SearchFilterTooBroad', 'TopUpNotFound', 'TopUpProofInvalidFile', 'TradeCounterUnchanged', 'TradeRoundLimitReached']
  codes named in ARCH procedure tables: 77; unregistered: none
  registered DomainErrors not named in any ARCH procedure table (6): ['AuthRateLimited', 'BusinessCannotInitiate', 'EventDeliveryNotReplayable', 'IndividualSellerProfileIncomplete', 'SearchFilterTooBroad', 'SellerNotVerified']
  registry codes cited in UX: 83/95
  code-like backticked UX tokens not in the registry: ['CommissionBalanceExhausted', 'CommissionBalanceReplenished', 'DataMismatch', 'IncompleteDocuments']
  code-like backticked ARCH tokens not in the registry: ['CommissionBalanceExhausted', 'CommissionBalanceReplenished', 'DuplicateDeductionSentinel', 'HttpOnly']
  code-like backticked PRD tokens not in the registry: ['CommissionBalanceExhausted', 'CommissionBalanceReplenished', 'DataMismatch']

==============================================================================
R7  Module sections: tables, published interfaces, dependency edges
==============================================================================
  tables defined in module data models: 47; defined by more than one module: none
  shared-kernel infrastructure tables named in AD-SYS-2: ['EventDelivery', 'EventReplayLog', 'FailedDeliveryDigest', 'OutboxEvent']
  PRD §4.2 table names not defined as an ARCH table: ['Bundle', 'ContactRequestCounter', 'ConversationReadState', 'PrivacyConsent']
     Bundle                       explained in ARCH
     ContactRequestCounter        NOT explained in ARCH
     ConversationReadState        NOT explained in ARCH
     PrivacyConsent               NOT explained in ARCH
  PRD §4.2 vs ARCH table host mismatches: none
  consumed neighbour calls parsed: 43
  compile-time edges used: 13 of 13 allowed; outside AD-1: none
  AD-1 edges not used by any consumed port: none

==============================================================================
R8  Events: one publisher each, subscriptions ride AD-1 edges, catalog agreement
==============================================================================
  BusinessApplicationApproved        ADD-§5 identity    §7.1 identity    §6 ports ['identity']
  BusinessApplicationRejected        ADD-§5 identity    §7.1 identity    §6 ports ['identity']
  CommissionBalanceExhausted         ADD-§5 commission  §7.1 commission  §6 ports ['commission']
  CommissionBalanceReplenished       ADD-§5 commission  §7.1 commission  §6 ports ['commission']
  OrderClosed                        ADD-§5 orders      §7.1 orders      §6 ports ['orders']
  OrderPaymentConfirmedByBusiness    ADD-§5 orders      §7.1 orders      §6 ports ['orders']
  TradeAccepted                      ADD-§5 trading     §7.1 trading     §6 ports ['trading']
  subscription collections <- OrderClosed                        publisher orders     edge OK
  subscription commission  <- BusinessApplicationApproved        publisher identity   edge OK
  subscription commission  <- OrderClosed                        publisher orders     edge OK
  subscription commission  <- OrderPaymentConfirmedByBusiness    publisher orders     edge OK
  subscription listings    <- BusinessApplicationApproved        publisher identity   edge OK
  subscription listings    <- CommissionBalanceExhausted         publisher commission edge OK
  subscription listings    <- CommissionBalanceReplenished       publisher commission edge OK

==============================================================================
R9  AI decision log
==============================================================================
  entries: 19 (last #19)  tags: {'REJECTED': 1, 'CORRECTED': 3, 'IMPROVED': 1}

==============================================================================
R10 Document status and stale forward references
==============================================================================
  planning/prd.md              status=draft    updated=2026-09-27
  planning/addendum.md         status=draft    updated=2026-09-23
  planning/ARCHITECTURE.md     status=final    updated=2026-09-27
  ux/DESIGN.md                 status=final    updated=2026-09-26
  ux/EXPERIENCE.md             status=final    updated=2026-09-27
  ux/microcopy-es-CO.md        status=final    updated=2026-09-26
  planning/prd.md:169: …y this PRD are marked **(new)**, and their final names are confirmed in Phase 3. `ADD-§3` gives the trigger condition for every code.…
  planning/prd.md:186: …Whether a boundary code may be owned by `shared-kernel` is confirmed in Phase 3 (OQ-7). |…
  planning/prd.md:1777: …der layout. There is no separate binder table [ASSUMPTION, confirmed in Phase 3].…
  planning/prd.md:295: …- *(Phase 3 decides where the log lives; OQ-4.)*…
  planning/prd.md:1363: …n lost to a subscriber failure is recoverable (NFR-SYS-6). Phase 3 resolves the mechanism (OQ-2).…
  planning/prd.md:314: …es (applicant documents, comprobantes, top-up proofs) is deferred to Phase 3 as an architecture decision candidate. Until then, admins open uploads on…
  planning/prd.md:186: …s. Whether a boundary code may be owned by `shared-kernel` is confirmed in Phase 3 (OQ-7). |…
  planning/addendum.md:339: …s are idempotent by the listed key. Delivery durability is subject to OQ-2 and OQ-4.…
  [ASSUMPTION] tags: {'prd': 59, 'addendum': 3, 'ARCHITECTURE': 21, 'UX': 16}

==============================================================================
R11 Every registered code has an es-CO template (AD-SYS-1)
==============================================================================
  microcopy keys: 96; DomainErrors with a template: 72/83; DecisionCodes: 11/12
  DomainErrors without a template: ['CollectionLimitReached', 'CommissionRateNotFutureDated', 'EventDeliveryNotReplayable', 'InvalidCatalogEntry', 'InvalidDocumentFile', 'LastActiveReasonRequired', 'SearchFilterTooBroad', 'TopUpNotFound', 'TopUpProofInvalidFile', 'TradeCounterUnchanged', 'TradeRoundLimitReached']
  DecisionCodes without a template: ['FxRateSourceMismatch']
  microcopy keys that are not registry codes (UI-state keys, expected): 9

==============================================================================
SUMMARY
==============================================================================
  findings: {'MAJOR': 16, 'MINOR': 12, 'REVIEW': 12}
  [MAJOR] R4: FR-CAT-1 not cited by any AD/section in ARCHITECTURE.md
  [MAJOR] R4: FR-COL-6 not cited by any AD/section in ARCHITECTURE.md
  [MAJOR] R4: FR-VER-2 not cited by any AD/section in ARCHITECTURE.md
  [MAJOR] R4: FR-VER-9 not cited by any AD/section in ARCHITECTURE.md
  [MINOR] R4: NFR-COM-3 not cited in ARCHITECTURE.md
  [MINOR] R4: NFR-REP-1 not cited in ARCHITECTURE.md
  [MINOR] R4: NFR-SYS-9 not cited in ARCHITECTURE.md
  [MINOR] R4: NFR-SYS-11 not cited in ARCHITECTURE.md
  [MINOR] R4: NFR-TRD-2 not cited in ARCHITECTURE.md
  [MINOR] R4: NFR-VER-3 not cited in ARCHITECTURE.md
  [MINOR] R4: NFR-VER-4 not cited in ARCHITECTURE.md
  [REVIEW] R6: UX cites `CommissionBalanceExhausted`, which is not a registry code
  [REVIEW] R6: UX cites `CommissionBalanceReplenished`, which is not a registry code
  [REVIEW] R6: UX cites `DataMismatch`, which is not a registry code
  [REVIEW] R6: UX cites `IncompleteDocuments`, which is not a registry code
  [MINOR] R7: PRD §4.2 names table ContactRequestCounter; ARCHITECTURE.md defines no such table and does not say what replaced it
  [MINOR] R7: PRD §4.2 names table ConversationReadState; ARCHITECTURE.md defines no such table and does not say what replaced it
  [MINOR] R7: PRD §4.2 names table PrivacyConsent; ARCHITECTURE.md defines no such table and does not say what replaced it
  [MINOR] R10: planning/prd.md frontmatter status is 'draft', not final
  [MINOR] R10: planning/addendum.md frontmatter status is 'draft', not final
  [REVIEW] R10: planning/prd.md:169 forward reference to Phase 3 / an OQ: 'confirmed in Phase 3'
  [REVIEW] R10: planning/prd.md:186 forward reference to Phase 3 / an OQ: 'confirmed in Phase 3'
  [REVIEW] R10: planning/prd.md:1777 forward reference to Phase 3 / an OQ: 'confirmed in Phase 3'
  [REVIEW] R10: planning/prd.md:295 forward reference to Phase 3 / an OQ: 'Phase 3 decides'
  [REVIEW] R10: planning/prd.md:1363 forward reference to Phase 3 / an OQ: 'Phase 3 resolves'
  [REVIEW] R10: planning/prd.md:314 forward reference to Phase 3 / an OQ: 'deferred to Phase 3'
  [REVIEW] R10: planning/prd.md:186 forward reference to Phase 3 / an OQ: 'is confirmed in Phase 3'
  [REVIEW] R10: planning/addendum.md:339 forward reference to Phase 3 / an OQ: 'subject to OQ-2'
  [MAJOR] R11: CollectionLimitReached (collections) has no es-CO template in ux/microcopy-es-CO.md
  [MAJOR] R11: CommissionRateNotFutureDated (commission) has no es-CO template in ux/microcopy-es-CO.md
  [MAJOR] R11: EventDeliveryNotReplayable (shared-kernel) has no es-CO template in ux/microcopy-es-CO.md
  [MAJOR] R11: InvalidCatalogEntry (collections) has no es-CO template in ux/microcopy-es-CO.md
  [MAJOR] R11: InvalidDocumentFile (identity) has no es-CO template in ux/microcopy-es-CO.md
  [MAJOR] R11: LastActiveReasonRequired (identity) has no es-CO template in ux/microcopy-es-CO.md
  [MAJOR] R11: SearchFilterTooBroad (listings) has no es-CO template in ux/microcopy-es-CO.md
  [MAJOR] R11: TopUpNotFound (commission) has no es-CO template in ux/microcopy-es-CO.md
  [MAJOR] R11: TopUpProofInvalidFile (commission) has no es-CO template in ux/microcopy-es-CO.md
  [MAJOR] R11: TradeCounterUnchanged (trading) has no es-CO template in ux/microcopy-es-CO.md
  [MAJOR] R11: TradeRoundLimitReached (trading) has no es-CO template in ux/microcopy-es-CO.md
  [MAJOR] R11: FxRateSourceMismatch (catalog) has no es-CO template in ux/microcopy-es-CO.md
```

### Verification of the audit's findings

The following were checked by hand:

- **R6 `[REVIEW]` tokens: 4 false positives** (see Step 4.A). No fix needed.
- **R6 informational: 6 registered DomainErrors are not named in any ARCH procedure table.** This is correct by design:
  - ARCH §8 says existing registry rows stay valid without being mentioned again. That covers `AuthRateLimited`, `BusinessCannotInitiate`, `IndividualSellerProfileIncomplete` and `SellerNotVerified`, which were inherited from Plan-1.
  - The two new codes are bound in AD-SYS-2 (`EventDeliveryNotReplayable`) and AD-DSC-2 (`SearchFilterTooBroad`).

  No fix needed.
- **R6 informational: 11 DomainErrors are missing from PRD §4.2.** This is a genuine sync gap, folded into R-3.
- **R7: `Bundle` is explained in ARCH.** Not a finding.
- **R10 `prd.md:186` is listed twice** because two patterns matched it. That leaves 7 unique stale references.
- **An earlier run (not reproduced here) flagged NFR-SYS-7 and NFR-SYS-8 as uncited.** That was a parser false positive: AD-SYS-8 Binds cites them as "NFR-SYS-2, 7, 8". The script now expands comma lists, and the run above reflects the fix.

---

## 8. Blocker Resolution Log

**Classification.** No finding is a *critical collision*: no conflicting owners, no forbidden edges and no contradictory rules. Every finding is a gap. The initial verdict was therefore **CONCERNS**, not FAIL. The rubric asks for a verified PASS, so every gap got a fix; none was waived.

**Gate decisions (team, 2026-09-27):**

1. Apply R-1..R-6.
2. For R-6b, place the event panel as a fifth tab, «Entregas», on page 2.3.

All six fixes were applied on 2026-09-27 and verified by the post-remediation audit (§9).

| Fix | Findings closed | Change | Files | Status |
| --- | --- | --- | --- | --- |
| R-1 | R10 ×2 (MINOR) | Set the frontmatter to `status: final`, `updated: 2026-09-27`. | `planning/prd.md`, `planning/addendum.md` | Applied |
| R-2 | R10 ×7 (REVIEW) | Rewrite stale forward references to cite the Phase 3 resolution (details below). | `planning/prd.md`, `planning/addendum.md` | Applied |
| R-3 | R7 ×3 (MINOR), R6 informational (11 codes) | PRD §4.2: map the three replaced table names to what replaced them, and add the 11 new codes with their owners (details below). | `planning/prd.md` | Applied |
| R-4 | R4 ×4 FR (MAJOR), R4 ×7 NFR (MINOR) | Add the missing FR/NFR IDs to the existing ARCH §6 Responsibility paragraphs and AD Binds lines. For NFR-SYS-9 and NFR-SYS-11, also add two test-harness rules (details below). | `planning/ARCHITECTURE.md` | Applied |
| R-5 | R11 ×12 (MAJOR), `ComprobanteInvalidFile` scanner variant | Add or re-key the es-CO templates (details below). | `ux/microcopy-es-CO.md` | Applied |
| R-6 | Step 4 alignment issues 2–5 | Change the UX specs to match ARCHITECTURE (details below). | 5.5 and 2.3 page specs, `ux/EXPERIENCE.md`, DSC 3.1 page spec | Applied |

### R-2: Stale forward references

| Location | Current text (gist) | Replacement cites |
| --- | --- | --- |
| prd.md:169 | new codes' "final names are confirmed in Phase 3" | ARCH §8.1 (names confirmed) |
| prd.md:186 | shared-kernel ownership "confirmed in Phase 3 (OQ-7)" | AD-SYS-1 rule 7, OQ-7 resolved |
| prd.md:295 | "Phase 3 decides where the log lives; OQ-4" | AD-SYS-2, ARCH §7.3 |
| prd.md:314 | malware scan "deferred to Phase 3" | AD-SYS-8 / G-4; ClamAV-class deferred (ARCH §14) |
| prd.md:1363 | "Phase 3 resolves the mechanism (OQ-2)" | AD-SYS-2, AD-SYS-3 |
| prd.md:1777 | binder table "[ASSUMPTION, confirmed in Phase 3]" | ARCH §6.10 (confirmed; tag removed) |
| addendum.md:339 | "Delivery durability is subject to OQ-2 and OQ-4" | AD-SYS-2, ARCH §7.3 |

### R-3: PRD §4.2 sync

- **Table names.**
  - `ContactRequestCounter` → `ContactRequestLog`.
  - `ConversationReadState` → `ConversationParticipant.lastReadSeq`.
  - `PrivacyConsent` → `User.signupConsentAt` / `User.signupConsentVersion`.

  NFR-SYS-12's wording is aligned to match.
- **New codes.** Add the 11 codes to their owners' rows in §4.2:
  - identity: `InvalidDocumentFile`, `LastActiveReasonRequired`
  - listings: `SearchFilterTooBroad`
  - commission: `CommissionRateNotFutureDated`, `TopUpNotFound`, `TopUpProofInvalidFile`
  - trading: `TradeCounterUnchanged`, `TradeRoundLimitReached`
  - collections: `CollectionLimitReached`, `InvalidCatalogEntry`
  - shared-kernel: `EventDeliveryNotReplayable`

### R-4: Citations added to ARCHITECTURE.md

| ID | Where it was added | Mechanism |
| --- | --- | --- |
| FR-VER-2 | §6.2 Responsibility paragraph (with NFR-VER-3) | `verification.queue` (existing) |
| FR-VER-9 | §6.2 Responsibility paragraph | `getBusinessPaymentInstructions` / `updatePaymentInstructions` (existing) |
| FR-CAT-1 | §6.3 Responsibility paragraph | `catalog.browse` (existing) |
| FR-COL-6 | §6.10 Responsibility paragraph | `collections.wishlist.*` over `listings.getAvailabilitySummary` (existing) |
| NFR-REP-1 | AD-REP-1, AD-REP-2 and AD-REP-3 Binds | paid-but-not-closed refusal (AD-REP-1); hide-versus-post aggregate race (AD-REP-2, AD-REP-3) (existing) |
| NFR-COM-3 | AD-COM-2 and AD-COM-3 Binds | deduction handler, top-up confirmation (existing) |
| NFR-TRD-2 | AD-TRD-1 and AD-TRD-2 Binds | non-accept actions and accept (existing) |
| NFR-VER-3 | AD-VER-2 Binds | signed-URL issue (existing) |
| NFR-VER-4 | AD-SYS-8 Binds | upload pipeline, 5 MB limit; the 1–3 document cap is `documentKeys` in §6.2 (existing) |
| NFR-SYS-9 | AD-SYS-6 Binds, **new rule 7** | Latency benchmarks run against Docker Compose Postgres with the PRD §3 seed (or the scale seed an NFR names). They follow the PRD §7 measurement protocol (A-2), and each asserts its p95 target. |
| NFR-SYS-11 | AD-SYS-6 Binds, **new rule 8** | Each page spec gets an axe check that allows zero serious or critical violations. EXPERIENCE.md owns the behaviour, and the manual keyboard pass is a release checklist item. |

**Disclosure.** The initial draft of R-4 mapped NFR-SYS-9 to AD-SYS-4 and NFR-SYS-11 to AD-SYS-1. When the fix was applied, neither AD turned out to contain a mechanism that tests those NFRs. A citation alone would have been hollow, so R-4 instead added AD-SYS-6 rules 7 and 8. This is a small binding in the test harness, not only a citation. It does not change any module design, and it is recorded in the decision log.

### R-5: es-CO templates

Buyer and seller copy uses *tú*; admin and VER copy uses *usted*. The copy shows no codes. Each row was added to its owner's section of the registry:

- §1: `InvalidDocumentFile` and `LastActiveReasonRequired`.
- §2: `SearchFilterTooBroad`, `FxRateSourceMismatch` and `EventDeliveryNotReplayable`.
- §4: the `ComprobanteInvalidFile` scanner variant.
- §5: `TopUpNotFound`, `TopUpProofInvalidFile` and `CommissionRateNotFutureDated`.
- §6: `TradeRoundLimitReached` and `TradeCounterUnchanged`.
- §8: `CollectionLimitReached` and `InvalidCatalogEntry`.

| Key | es-CO message | Change |
| --- | --- | --- |
| `CollectionLimitReached` | "Llegaste al máximo de 50 colecciones. Elimina o une alguna para crear otra." | re-key the "Collection limit" row |
| `TradeRoundLimitReached` | "Llegaron a 10 rondas. Ahora solo puedes aceptar o rechazar." | re-key the "Round limit" row |
| `TradeCounterUnchanged` | "No cambiaste nada. Si estos términos te sirven, usa «Aceptar»." | re-key the "Unchanged counter (8.2)" row |
| `CommissionRateNotFutureDated` | "La fecha de inicio no puede estar en el pasado. Elija una fecha y hora desde ahora." | re-key the "Rate start in the past" row and extend it in *usted* |
| `InvalidDocumentFile` (type) | "Este archivo no es un PDF ni una imagen JPG o PNG. Suba su documento en uno de esos formatos." | new |
| `InvalidDocumentFile` (size) | "El archivo pesa {peso} MB y el máximo es 5 MB. Suba una versión más liviana del documento." | new |
| `InvalidDocumentFile` (scanner) | "No pudimos aceptar este archivo porque no pasó la revisión de seguridad. Suba otra copia del documento." | new |
| `TopUpProofInvalidFile` (type) | "Este archivo no es una imagen JPG o PNG ni un PDF. Sube una foto o captura del comprobante de la recarga." | new, mirrors `ComprobanteInvalidFile` |
| `TopUpProofInvalidFile` (size) | "El archivo pesa {peso} MB y el máximo es 5 MB. Sube una captura o una foto más liviana." | new |
| `TopUpProofInvalidFile` (scanner) | "No pudimos aceptar este archivo porque no pasó la revisión de seguridad. Sube otra captura del comprobante." | new |
| `ComprobanteInvalidFile` (scanner) | "No pudimos aceptar este archivo porque no pasó la revisión de seguridad. Sube otra captura del comprobante." | new variant (AD-SYS-8 rule 6.3) |
| `TopUpNotFound` | "No encontramos esta recarga." Action: Volver a Recargas | new (admin, Not-available page) |
| `LastActiveReasonRequired` | "Debe quedar al menos un motivo activo. Active otro motivo antes de desactivar este." | new |
| `SearchFilterTooBroad` | "Estos filtros incluyen demasiadas cartas para buscar publicaciones. Elige una expansión, un tipo o un nombre para acotar la búsqueda." | new |
| `InvalidCatalogEntry` | "No encontramos esa carta en el catálogo. Búscala de nuevo por nombre o número." | new |
| `FxRateSourceMismatch` | "La TRM del {dia} volvió con un valor distinto ({nueva}) al guardado ({guardada}). Conservamos el valor guardado; revise la fuente si el cambio persiste." | new (DecisionCode, shown on 2.3) |
| `EventDeliveryNotReplayable` | "Esta entrega ya no está fallida ({estado}), así que no se puede reintentar. La lista se actualizó." | new (admin, 2.3 event panel) |

### R-6: UX specs aligned to ARCHITECTURE

- **(a) VER 5.5, L113:** now cites `LastActiveReasonRequired` in place of `RequestValidationFailed`. The copy is unchanged.
- **(b) CAT 2.3** (team decision: a fifth tab):
  - A fifth tab, **Entregas** (object `sys-event-deliveries`), was added. It lists the failed `EventDelivery` rows (event, subscriber, attempts, last error class, time), and each row has a **Reintentar** action that calls `admin.events.replay`.
  - These states were added: empty ("No hay entregas fallidas."), replay success, and `EventDeliveryNotReplayable`.
  - The TRM tab gained an `FxRateSourceMismatch` log row and page state.
  - A technical note records that the tab is owned by `shared-kernel` and only hosted on 2.3.
- **(c) EXPERIENCE.md L73:** admin rail item 10 "Entregas fallidas" now links to the 2.3 Entregas tab. Its NFR-SYS-6 badge counts the failed deliveries.
- **(d) DSC 3.1:** a "Filter too broad" page-state row for `SearchFilterTooBroad` was added.

---

## 9. Post-Remediation Audit

After R-1..R-6 were applied, `readiness.py`, `trace.py` and the PRD extract were re-run on 2026-09-27. The full `readiness.py` output follows, unedited.

```text
==============================================================================
R1  Review triage completeness (Phases 1-3)
==============================================================================
reviews/review-prd-adversarial.md
  status: triaged — resolved at Phase 1 gate (2026-09-23)
  findings: 30  dispositioned: 30  {'Accept': 28, 'Gate': 1, 'Defer': 1}
reviews/review-ux-edge-cases.md
  status: triaged — adopted in full at the Phase 2 gate (2026-09-27)
  findings: 53  dispositioned: 53  {'Accept': 30, 'Reject': 9, 'Defer': 14}
reviews/review-arch-adversarial.md
  status: triaged — Phase 3 gate, 2026-09-27
  findings: 17  dispositioned: 17  {'Accept': 14, 'Defer': 1, 'Reject': 2}
reviews/review-arch-edge-cases.md
  status: triaged — Phase 3 gate, 2026-09-27
  findings: 19  dispositioned: 19  {'Accept': 17, 'Defer': 2}

==============================================================================
R2  Items deferred to Phase 3 are closed in ARCHITECTURE.md
==============================================================================
  EC-07  closed in §12.2
  EC-08  closed in §12.2
  EC-11  closed in §12.2
  EC-14  closed in §12.2
  EC-29  closed in §12.2
  EC-30  closed in §12.2
  EC-32  closed in §12.2
  EC-34  closed in §12.2
  EC-35  closed in §12.2
  EC-36  closed in §12.2
  EC-37  closed in §12.2
  EC-38  closed in §12.2
  EC-39  closed in §12.2
  EC-40  closed in §12.2
  EC-41  closed in §12.2
  EC-42  closed in §12.2
  EC-43  closed in §12.2
  EC-33  deferred to v2, listed in §14
  PRD F-14 (malware scan)            closed: AD-SYS-8 / G-4
  PRD F-17 (pooler/interactive tx)   closed: AD-SYS-4

==============================================================================
R3  PRD open questions and blocking assumptions
==============================================================================
  OQ-1   resolved  **Resolved at gate:** No (as recommended)
  OQ-2   resolved  **Resolved in Phase 3:** AD-SYS-2, AD-SYS-3 (ARCHITECTURE §12.1)
  OQ-3   resolved  **Resolved at gate:** charge on whichever comes first, business confir
  OQ-4   resolved  **Resolved in Phase 3:** AD-SYS-2, ARCHITECTURE §7.3
  OQ-5   resolved  **Resolved at gate:** adopted
  OQ-6   resolved  **Resolved in Phase 3:** as recommended, AD-TRD-3 rule 5
  OQ-7   resolved  **Resolved in Phase 3:** yes, produced only by the input parser (AD-SY
  OQ-8   resolved  **Resolved in Phase 3:** as recommended, AD-DSC-2
  OQ-9   OPEN      Team, pre-launch
  OQ-10  resolved  **Resolved in Phase 3:** as recommended, AD-INV-1
  OQ-11  resolved  **Resolved at gate:** defaults adopted as configuration
  OQ-12  resolved  **Resolved at gate:** defaults adopted; legal review before launch rem
  assumptions indexed: 58; marked blocking=Yes: none

==============================================================================
R4  FR and NFR coverage: PRD -> UX -> ARCHITECTURE
==============================================================================
  CAT:  8 FRs | UX  8/8 | ARCH  8/8
  COL:  7 FRs | UX  7/7 | ARCH  7/7
  COM:  9 FRs | UX  9/9 | ARCH  9/9
  DSC:  7 FRs | UX  7/7 | ARCH  7/7
  IDN:  7 FRs | UX  7/7 | ARCH  7/7
  INV: 10 FRs | UX 10/10 | ARCH 10/10
  MSG:  8 FRs | UX  8/8 | ARCH  8/8
  ORD: 10 FRs | UX 10/10 | ARCH 10/10
  REP:  7 FRs | UX  7/7 | ARCH  7/7
  TRD:  9 FRs | UX  9/9 | ARCH  9/9
  VAL:  5 FRs | UX  5/5 | ARCH  5/5
  VER:  9 FRs | UX  9/9 | ARCH  9/9
  total FRs: 96  (defined as headings/bold: 96)
  total NFRs: 56  cited in ARCH: 56/56
  ids cited in ARCHITECTURE but absent from PRD: none
  ids cited in UX but absent from PRD: none
  ids cited in addendum but absent from PRD: none

==============================================================================
R5  Scenario coverage (Annex: 4 scenarios per module)
==============================================================================
  IDN: scenarios 4  page specs 3
  CAT: scenarios 4  page specs 3
  DSC: scenarios 4  page specs 2
  INV: scenarios 4  page specs 3
  VER: scenarios 4  page specs 5
  ORD: scenarios 4  page specs 4
  COM: scenarios 4  page specs 5
  TRD: scenarios 4  page specs 4
  COL: scenarios 4  page specs 4
  VAL: scenarios 4  page specs 3
  REP: scenarios 4  page specs 4
  MSG: scenarios 4  page specs 3
  total scenarios 48  page specs 43  modules 12

==============================================================================
R6  One owner per DomainError / DecisionCode
==============================================================================
  addendum: 83 DomainErrors, 12 DecisionCodes, duplicate rows: none
  owners: {'identity': 20, 'catalog': 6, 'listings': 19, 'orders': 12, 'commission': 6, 'trading': 12, 'messaging': 3, 'collections': 11, 'reviews': 4, 'shared-kernel': 2}
  ARCH §8.1/§8.2 owners agree with addendum: True
  PRD §4.2 lists 83 codes; owner mismatches vs addendum: none; not in addendum: none
  DomainErrors in addendum but not listed in PRD §4.2 (0): []
  codes named in ARCH procedure tables: 77; unregistered: none
  registered DomainErrors not named in any ARCH procedure table (6): ['AuthRateLimited', 'BusinessCannotInitiate', 'EventDeliveryNotReplayable', 'IndividualSellerProfileIncomplete', 'SearchFilterTooBroad', 'SellerNotVerified']
  registry codes cited in UX: 95/95
  code-like backticked UX tokens not in the registry: ['CommissionBalanceExhausted', 'CommissionBalanceReplenished', 'DataMismatch', 'IncompleteDocuments']
  code-like backticked ARCH tokens not in the registry: ['CommissionBalanceExhausted', 'CommissionBalanceReplenished', 'DuplicateDeductionSentinel', 'HttpOnly']
  code-like backticked PRD tokens not in the registry: ['CommissionBalanceExhausted', 'CommissionBalanceReplenished', 'DataMismatch']

==============================================================================
R7  Module sections: tables, published interfaces, dependency edges
==============================================================================
  tables defined in module data models: 47; defined by more than one module: none
  shared-kernel infrastructure tables named in AD-SYS-2: ['EventDelivery', 'EventReplayLog', 'FailedDeliveryDigest', 'OutboxEvent']
  PRD §4.2 table names not defined as an ARCH table: ['Bundle']
     Bundle                       explained in ARCH
  PRD §4.2 vs ARCH table host mismatches: none
  consumed neighbour calls parsed: 43
  compile-time edges used: 13 of 13 allowed; outside AD-1: none
  AD-1 edges not used by any consumed port: none

==============================================================================
R8  Events: one publisher each, subscriptions ride AD-1 edges, catalog agreement
==============================================================================
  BusinessApplicationApproved        ADD-§5 identity    §7.1 identity    §6 ports ['identity']
  BusinessApplicationRejected        ADD-§5 identity    §7.1 identity    §6 ports ['identity']
  CommissionBalanceExhausted         ADD-§5 commission  §7.1 commission  §6 ports ['commission']
  CommissionBalanceReplenished       ADD-§5 commission  §7.1 commission  §6 ports ['commission']
  OrderClosed                        ADD-§5 orders      §7.1 orders      §6 ports ['orders']
  OrderPaymentConfirmedByBusiness    ADD-§5 orders      §7.1 orders      §6 ports ['orders']
  TradeAccepted                      ADD-§5 trading     §7.1 trading     §6 ports ['trading']
  subscription collections <- OrderClosed                        publisher orders     edge OK
  subscription commission  <- BusinessApplicationApproved        publisher identity   edge OK
  subscription commission  <- OrderClosed                        publisher orders     edge OK
  subscription commission  <- OrderPaymentConfirmedByBusiness    publisher orders     edge OK
  subscription listings    <- BusinessApplicationApproved        publisher identity   edge OK
  subscription listings    <- CommissionBalanceExhausted         publisher commission edge OK
  subscription listings    <- CommissionBalanceReplenished       publisher commission edge OK

==============================================================================
R9  AI decision log
==============================================================================
  entries: 21 (last #21)  tags: {'REJECTED': 1, 'CORRECTED': 3, 'IMPROVED': 1}

==============================================================================
R10 Document status and stale forward references
==============================================================================
  planning/prd.md              status=final    updated=2026-09-27
  planning/addendum.md         status=final    updated=2026-09-27
  planning/ARCHITECTURE.md     status=final    updated=2026-09-27
  ux/DESIGN.md                 status=final    updated=2026-09-26
  ux/EXPERIENCE.md             status=final    updated=2026-09-27
  ux/microcopy-es-CO.md        status=final    updated=2026-09-27
  [ASSUMPTION] tags: {'prd': 58, 'addendum': 3, 'ARCHITECTURE': 21, 'UX': 16}

==============================================================================
R11 Every registered code has an es-CO template (AD-SYS-1)
==============================================================================
  microcopy keys: 108; DomainErrors with a template: 83/83; DecisionCodes: 12/12
  DomainErrors without a template: none
  DecisionCodes without a template: none
  microcopy keys that are not registry codes (UI-state keys, expected): 9

==============================================================================
SUMMARY
==============================================================================
  findings: {'REVIEW': 4}
  [REVIEW] R6: UX cites `CommissionBalanceExhausted`, which is not a registry code
  [REVIEW] R6: UX cites `CommissionBalanceReplenished`, which is not a registry code
  [REVIEW] R6: UX cites `DataMismatch`, which is not a registry code
  [REVIEW] R6: UX cites `IncompleteDocuments`, which is not a registry code
```

### Result against each initial finding

| Initial finding | Post-remediation result |
| --- | --- |
| R4: 4 FRs not cited in ARCH (MAJOR) | 96/96 FRs cited in ARCH in every module; `trace.py` reports 0 "not cited" rows |
| R4: 7 NFRs not cited in ARCH (MINOR) | 56/56 NFRs cited |
| R7: 3 PRD §4.2 table names not in ARCH (MINOR) | Only `Bundle` remains, and it is explained in ARCH. No host mismatch |
| R6 informational: 11 codes missing from PRD §4.2 | PRD §4.2 lists all 83 codes, with no owner mismatch |
| R10: `status: draft` on prd.md and addendum.md (MINOR) | Both `status=final`, `updated=2026-09-27` |
| R10: 7 stale forward references (REVIEW) | None |
| R11: 12 codes without an es-CO template (MAJOR) | 83/83 DomainErrors and 12/12 DecisionCodes have a template |
| Step 4 alignment issues 2–5 | Fixed by R-6. The registry codes cited in UX are 95/95 |

**Remaining findings:** 4 REVIEW, all verified false positives (Step 4.A): two event names and two rejection-reason keys. **MAJOR: 0. MINOR: 0.** The collision checks (R6, R7, R8) are unchanged: one owner per table, event and code, 13/13 edges, and none outside AD-1.

**Verdict: PASS.**

---

## 10. Deferred Items and Ops Checklist

### Team-owned deferrals

| ID | Item | Why deferred | Owner | Revisit condition |
| --- | --- | --- | --- | --- |
| F-14 (`review-arch-adversarial.md`) | A meaningful oversell metric | The ADD-§10 formula (`reserved > quantity`) has no column to read under AD-INV-2. A real check needs a stocked total per unit, which means a stock-movement ledger. Oversell prevention itself is covered by the CHECK constraint and the NFR-INV race tests (ARCH §14). `oversell-check` stays a placeholder (ARCH §13). | Team (Martín Gómez, Mateo Rubio) | Before launch, together with the ADD-§10 PRD-sync edit |
| AEC-18 (`review-arch-edge-cases.md`) | Retry of rows skipped for missing FX (`deferredNoFx`) | Skipped rows are counted, not stored. A rerun of the same file picks them up (ARCH §15.3). | Team | With the production feed (OQ-9) |
| AEC-19 (`review-arch-edge-cases.md`) | Scheduled-workflow liveness | GitHub disables scheduled workflows in a public repository after 60 days with no repository activity. The hourly tick would then stop, and the system would fall back silently to the "G-3 rejected" behaviour: longer expiry and TRM lag, but correct results. | Team | Before launch and at every release; see the ops checklist |

### Other open or deferred items (not blocking)

| ID | Item | Owner | Revisit condition |
| --- | --- | --- | --- |
| OQ-9 | Choose the price feed. The source is left unnamed on purpose. | Team | Before launch |
| OQ-12 | Legal review of the ADD-§9.4 retention periods. The defaults are adopted as configuration. | Team | Before launch |
| ClamAV-class scanning | The V1 binding is `StructuralScanner` (G-4); admins view uploads only in the sandboxed viewer. | Team | Before production launch, or when uploads exceed 1,000 per month (ARCH §14) |
| EC-33 and the other ARCH §14 rows | As listed in ARCH §14, each with its revisit condition. | Team | Per ARCH §14 |

### Pre-launch ops checklist

- [ ] **AEC-19:**
  - [ ] The GitHub Actions workflow with the hourly tick `5 12-23,0-1 * * *` is enabled. *(Post-issue: the schedule is now `17 12-23,0-1 * * *`, decision log #37.)*
  - [ ] An alert fires when no tick is logged for 2 h inside that window.
  - [ ] The repository shows activity at least every 60 days, or someone re-enables the workflow after a pause.
- [ ] `JOBS_SECRET` is set in Vercel environment variables and in GitHub Actions secrets, and it matches.
- [ ] The two Vercel crons are configured: `daily-morning` `0 12 * * *` and `daily-night` `30 5 * * *`.
- [ ] Runtime uses the Supabase transaction pooler (port 6543); migrations use the direct connection (port 5432).
- [ ] The `ver-documents`, `order-comprobantes` and `topup-proofs` Storage buckets are private.
- [ ] The separate `retention` DB role exists with `DELETE` only as AD-SYS-8 rule 10 defines. `retention-purge` runs under it.
- [ ] The application role has `UPDATE`/`DELETE` revoked on the append-only audit tables, and the migration test asserting the grants passes.
- [ ] H (harness) consoles are deployed only to non-production environments.

---

## Summary and Recommendations

### Overall Readiness Status

**PASS**, verified by the post-remediation audit (§9). The initial run was CONCERNS.

The package is consistent where a collision would matter:

- one owner per table, event and code;
- every consumed interface is published;
- no edge outside AD-1;
- every review finding is triaged.

The initial run found 42 document-level gaps. All 42 were closed by R-1..R-6, and the re-run shows 0 MAJOR and 0 MINOR findings.

### Critical Issues Requiring Immediate Action

None remain. The two gaps that would have stalled the build are closed:

1. **12 codes without an es-CO template.** R-5 added them, so all 95 codes now have a template.
2. **The missing 2.3 event panel.** R-6b added the «Entregas» tab.

### Recommended Next Steps

1. Before launch, work through the ops checklist (§10), including AEC-19, and resolve OQ-9 and OQ-12.
2. When epics and stories are created, run the Step 5 epic checks against them.
3. Revisit F-14, AEC-18 and AEC-19 under the conditions in §10.

### Final Note

This assessment found 42 issues across 5 categories:

| Category | Issues |
| --- | --- |
| Traceability citations | 11 |
| Microcopy registry | 13 |
| UX ↔ ARCH alignment | 5 |
| PRD ↔ ARCH sync | 4 |
| Document status and stale references | 9 |

None was a critical collision, and all 42 are fixed. Every fix is a document edit that changes no module design. The one addition to the architecture is two test-harness rules (AD-SYS-6 rules 7 and 8), disclosed under R-4.

**Assessor:** `bmad-check-implementation-readiness` workflow, Claude Opus 5.5, with deterministic audit scripts (R1–R11 and the FR trace). The gate decisions are left to human adjudication in §11.

---

## 11. Sign-off

The gate is signed only by the team; the assessor adds no signature of its own.

**Joint work.** Martín Gómez and Mateo Rubio built the Plan-2 package together, and its deliverables cannot be separated by author. The signatures are therefore split by scope: each person signs some scopes and the other signs the rest.

| Scope | Signed by (on behalf of the team) | Verdict | Date |
| --- | --- | --- | --- |
| PRD and addendum (`planning/prd.md`, `planning/addendum.md`) | Martín Gómez | PASS | 2026-09-27 |
| UX (`DESIGN.md`, `EXPERIENCE.md`, microcopy registry, 48 scenarios, 43 page specs) | Mateo Rubio | PASS | 2026-09-27 |
| Architecture (`planning/ARCHITECTURE.md`) | Martín Gómez | PASS | 2026-09-27 |
| Cross-module consistency (§6) and blocker resolution (§8–§9) | Mateo Rubio | PASS | 2026-09-27 |
| Deferred items and ops checklist (§10) | Martín Gómez | Accepted | 2026-09-27 |
| Overall gate verdict | Mateo Rubio | PASS | 2026-09-27 |

**Conditions attached to the sign-off:**

- The pre-launch ops checklist (§10) is completed before production launch, including AEC-19.
- OQ-9 and OQ-12 are resolved before launch.
- F-14, AEC-18 and AEC-19 are revisited under their §10 conditions.
- When epics and stories are created, the Step 5 epic checks are run against them.

## 12. Post-sign-off amendments (2026-09-27)

These changes were made after the sign-off in §11. None changes the gate verdict. The captured terminal output in §7 and §9 is left as it was run; this section records what was wrong in it and what the corrected run shows.

**Erratum: R9 over-counted the decision-log tags.** The R9 check counted every `[REJECTED]`, `[CORRECTED]` or `[IMPROVED]` string anywhere in `ai-log/decision-log.md`. That included the purpose paragraph (which names all three tags) and a second mention inside entry #12. The real count at 21 entries was **one tagged entry** (#12, `[CORRECTED]`). With a correct counter, the §9 run would have raised **R9 MAJOR** ("fewer than 3 tags"), and the verdict in §9 would have been CONCERNS until it was fixed. The counter now reads tags from entry headings only.

**Fix applied.** Decision-log entries #22–#25 record four AI proposals that the team rejected at the phase gates, each with its technical rationale, plus an index of tagged entries at the top of the log:

| Entry | Tag | AI proposal | Review finding |
| --- | --- | --- | --- |
| #22 | `[REJECTED]` | Hide a paused shop's listings from browse | F-16, `review-arch-adversarial.md` |
| #23 | `[REJECTED]` | Lock purchasability on every reserve | F-17, `review-arch-adversarial.md` |
| #24 | `[REJECTED]` | Empty state on headless consoles | EC-09, `review-ux-edge-cases.md` |
| #25 | `[REJECTED]` | Rounding guard for the valuation total | EC-23, `review-ux-edge-cases.md` |

**Re-run after the fix (R9 output, corrected counter):**

```
==============================================================================
R9  AI decision log
==============================================================================
  entries: 25 (last #25)  tags: {'CORRECTED': 1, 'REJECTED': 4}
```

Every other rule gives output identical to §9: 0 MAJOR, 0 MINOR, and the same 4 REVIEW items.

**PRD trace and wording fixes** (no change to any requirement's behaviour):

- FR-IDN-7 now names its CAPs: CAP-15 and CAP-28 for admin gating; authentication is cross-cutting to every authenticated CAP. It previously read "(all)". The Step 2 inventory row above is updated to match.
- FR-INV-6 now traces to CAP-17 and CAP-25, the same CAPs as the reserve it rolls back (FR-INV-3, FR-INV-5). The inventory row above is updated.
- FR-IDN-2's trigger names the actor ("a buyer who wants to sell as an individual") instead of "the user", and the FR-IDN consent rule says "the `User` row".

**UX:** the R and D page specs that had no explicit "Empty" row now state it, or state why it does not apply: 2.2, 3.1, 4.1, 7.1, 8.1 and 11.1. H consoles stay out of scope, per EXPERIENCE.md State Patterns (EC-09, decision-log #24).

**Verdict:** PASS stands. The §11 signatures were given before these amendments; the team re-confirms them or re-signs at its discretion.
