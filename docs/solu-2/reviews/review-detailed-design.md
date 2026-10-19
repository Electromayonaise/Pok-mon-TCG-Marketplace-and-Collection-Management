---
title: Detailed-design review — contracts, schema, DTOs, OpenAPI, events, ports and simulated adapters
reviewed:
  - docs/solu-2/planning/detailed-design/contracts.md
  - docs/solu-2/planning/detailed-design/schemas/{001_tezg_schema.sql, operations.json, openapi.yaml, dto.ts, events.md, ui-states.json}
  - docs/solu-2/planning/detailed-design/{ports-and-adapters.md, ui-states.md}
  - src/shared-kernel/{external,events,audit,explanation}.ts, src/modules/*/{dto,application,ports}/*.v2.ts
  - test-support/simulated/index.ts
skills: bmad-review-adversarial-general · bmad-review-edge-case-hunter · Amelia (bmad-agent-dev) simulated-adapter audit
date: 2026-10-18
status: triaged — Phase 1–2 gate, 2026-10-18 (decision log Solu-2 #9)
---

# Detailed-design review

**Report 2 of 3** (task statement §5, "Phase 1–2 gate"). Three passes over the Phase 1–2 artifacts:
- **adversarial** (A): what is wrong, inconsistent or missing;
- **edge-case hunter** (E): unhandled branches and boundaries;
- **Amelia's simulated-adapter audit** (S): would a developer agent writing the ATDD suite against these adapters get a faithful simulation of the external system?

Each defect claimed in S was reproduced (the scanner and FX arithmetic in Node, the port mismatch by reading the generated `V2Deps`).

What the deterministic checks already prove is not repeated as a finding:
- the 37 core operations match `contracts.md`;
- the 188 code citations match the registry;
- the generated surface is current;
- `domain/` is pure;
- 43 pages and 327 states each have a backing DTO or code.

## Findings

### Simulated adapters (Amelia)

- **S-1 `SqlOutboxV2` does not implement the `Outbox` port that every `<Svc>V2Deps` asks for.** The deps say `outbox: Outbox`, the Solu-1 interface `enqueue(tx, { type, aggregateId, payload })`, which has no `schemaVersion`. The simulated adapter exposes `enqueue(tx, type, aggregateId, payload)` instead. Phase 3 could not bind it without a cast, and the R-1 envelope would never reach a production adapter through the port.
- **S-2 The simulated feed does not implement the ADD-§8.3 fault switches.** ADD-§8.3 defines:
  - `stale` = return the previous file unchanged;
  - `malformedRows` = serve the §8.2 defect file;
  - `renamedRows` = serve the file with 30 attribute changes and 5 reprints.

  The adapter rewrites `observedAt` for `stale`, nulls every second row's `number` for `malformedRows`, and has no `renamedRows`. That last switch is exactly what drives the CAT mandatory edge case.
- **S-3 The simulated scanner reports a file with no end marker as clean.**
  - A PNG without `IEND` gives `indexOf(-1) + 8 = 7`, so the "sanitized" rendition is the first 7 bytes.
  - A JPEG without `FF D9` gives `lastIndexOf(-1) + 2 = 1`, so the whole buffer, trailing payload included, is returned as clean.

  Reproduced: PNG 17 bytes → 7, JPEG → whole buffer. The S-5 fixture "a JPEG with a trailing payload must come back re-encoded" would pass for the wrong reason.
- **S-4 The FX fixture's `mismatch` switch parses `valor` as a float** (`Number(valor) + 1`). AD-CAT-3 rule 3 exists to forbid exactly that, and a test double that does it teaches the wrong pattern.
- **S-5 The storage double records no upload tickets.** It issues tickets for any key and keeps no record of them, so a test cannot assert that the owner composed `<purpose>/<actorId>/<cuid2>` from the session (AD-SYS-8 rule 8). Only signed reads are recorded.

### Contracts, DTOs, OpenAPI (adversarial)

- **A-1 Some contract signatures and DTOs disagree on the response shape.** Four of them have the same fields under different shapes or names:
  - CAT-3 returns `PriceProvenanceDTO[]` in the contract, but the DTO is `{ items: [...] }`;
  - REP-3 returns an array, but `GetAggregatesResponse` is `{ aggregates }`;
  - REP-2 returns `Decision`, but `HideReviewResponse` is `{ decision }`;
  - VAL-1 calls its result `ValuationDTO` and DSC-2 calls its result `CardDetailDTO`, while the DTOs are `ValueCollectionResponse` and `GetCardDetailResponse`.

  Annex B forbids field-name drift between contracts and DTOs.
- **A-2 The OpenAPI drops every value constraint the contracts state.** Examples: price 1,000–100,000,000, `qty` 1–999, radius 1–300, name 1–60, body 1–2,000, `page ≤ 417`, `pageSize ≤ 100`. The DTOs are plain `number`/`string`, so the schema says `integer ≥ 0` where the parser refuses 999. A client generated from `openapi.yaml` accepts input the server refuses.
- **A-3 Two queries write audit rows over GET.** `access.traceCapabilities` (a `CapabilityAuditRead` insert) and `verification.getApplicationForReview` (a `LegalIdentityAccessLog` insert) are `kind: query`, so the wire is GET. A GET may be prefetched by a link, an RSC or the browser, and each prefetch writes a legal-identity access row. That inflates NFR-VER-2's count and records "reads" no admin made.
- **A-4 Repository ports are missing from the v2 dependencies.** `<Svc>V2Deps` give every application service a raw `sql: Sql`. In the hexagon (Plan-2 §3), the repository is the outbound port and `infra/pg.ts` the driven adapter. With `Sql` in the application's deps, each story will write its SQL inside the application layer, which is the inversion the map claims not to have.
- **A-5 Better Auth's IP tracking must be off, and only a SQL comment says so.** `001_tezg_schema.sql` omits `Session.ipAddress` (S-7), but no contract, stack decision or story requirement says that Better Auth must run with IP tracking disabled. Better Auth's default writes that column, so the first sign-in would fail against the schema.

### Edge cases (edge-case hunter)

- **E-1 Several ingress entries share one operation and drop the field that tells them apart, with nothing recording the fixed value.** Seven pairs (wire field omitted → value the router must set):
  - `inventory.deactivate` / `reactivate` → `active`;
  - `inventory.admin.hide` / `unhide` → `hidden`;
  - `trading.reject` / `withdraw` → `action`;
  - `orders.mine` / `sales` → `side`;
  - `collections.moveEntry` / `copyEntry` → `mode`.

  The router must set that field per procedure. Nothing in the registry, the OpenAPI or the contracts records which value each procedure sets, so a wrongly wired `unhide` would hide.
- **E-2 The UI-state classifier fails open.** A state whose name matches neither the client nor the refusal pattern becomes `data`. A new page state named, say, "Blocked" would pass readiness check 2 as backed by the page's response DTOs, whatever it actually shows.
- **E-3 The H-console `dev.*` procedures** (`dev.*.race`, `explain`, `timeline`, `inspect`; ARCHITECTURE §9.2) are in neither the registry nor the OpenAPI. The 8 console pages are mapped to the core operations they drive, not to the procedures they call.
- **E-4 `ContactRequestLog.kind` admits `'trade'`, but no path writes it.** MSG-2 skips both the limiter and the log on the trade path (EC-37).

## Triage

Mateo accepted the recommendation in full at the Phase 1–2 gate on 2026-10-18 (decision log Solu-2 #9). He chose JSDoc constraint tags for A-2, a repository port per module for A-4, and to keep `dev.*` out of the OpenAPI for E-3. Every Accept is applied:
- `test-support/simulated/index.ts`: S-1..S-5;
- `src/shared-kernel/events.ts`: `OutboxV2`;
- `scripts/gen-solu2-api.mjs`: constraint tags, `fixed` inputs, repository ports and the DTO-naming check;
- `schemas/operations.json`: `fixed`, and the two audited reads as mutations;
- `schemas/ui-states.json` plus `scripts/check-ui-states.mjs`: the explicit data vocabulary;
- `contracts.md`: DTO lines and the Better Auth note;
- `ARCHITECTURE.md`: R-12..R-14.

The reproducible checks:
- the generator fails on an inapplicable tag (probe: `@minimum` on a string) and on a shared operation without distinct `fixed` inputs (the first run listed exactly the 10 E-1 procedures);
- the scanner now rejects a PNG without `IEND` and a JPEG without `FF D9`;
- `plusOnePeso("9999.99") = "10000.99"`.

| # | Recommendation | Fix / reason |
|---|---|---|
| S-1 | **Accept** | Add an `OutboxV2` port (`enqueue<T>(tx, type, aggregateId, payload)`, returning the envelope) to shared-kernel. `<Svc>V2Deps.outbox` becomes `OutboxV2`, and `SqlOutboxV2` implements it |
| S-2 | **Accept** | The feed fixture takes named files `{ current, previous, defects, renamed }`, and each switch serves one: `stale` → previous, `malformedRows` → defects, `renamedRows` → renamed |
| S-3 | **Accept** | A JPEG or PNG without its end marker is `rejected` (cause `scanner`). A test covers each |
| S-4 | **Accept** | `mismatch` adjusts `valor` by string/BigInt cents arithmetic, never `Number` |
| S-5 | **Accept** | The storage double records `issuedTickets` (key and expiry) |
| A-1 | **Accept** | Each core-operation signature in `contracts.md` names its registry DTO, so contract, DTO and OpenAPI use one name |
| A-2 | **Gate choice.** Recommended: **Accept** | JSDoc constraint tags (`@minimum`, `@maximum`, `@minLength`, `@maxLength`, `@pattern`) on the wire fields of the DTOs, copied into the schema by the generator, which fails on a tag it cannot apply. Alternative: defer to implementation, when zod becomes the source |
| A-3 | **Accept** | `access.traceCapabilities` and `verification.getApplicationForReview` become mutations (POST). An audited read is a state change |
| A-4 | **Gate choice.** Recommended: **Accept** | The generator emits a `<Svc>Repository` outbound port per module, empty with a doc comment; each story adds the methods its contract's SQL needs, and `infra/pg.ts` implements them. `<Svc>V2Deps` drop `sql: Sql`, keeping `transactions` for the `Tx` handle. The Definition of Done (Phase 4) checks that no `application/*.v2.ts` imports `Sql` |
| A-5 | **Accept** | Add Better Auth's `advanced.ipAddress.disableIpTracking = true` to the stack refinements (R-12) and to S-FR-IDN-7 |
| E-1 | **Accept** | Ingress entries carry `fixed: { field: value }`. The OpenAPI shows it as `x-fixed-input`, and the generator fails when the omitted fields and the fixed fields of two procedures sharing an operation are identical |
| E-2 | **Accept** | `ui-states.json` gets an explicit `data` vocabulary. A state that matches no class fails the check instead of defaulting to `data` |
| E-3 | **Gate choice.** Recommended: **Reject** | The `dev` router is mounted only when `TEZG_DEV_SURFACES=true`, and a build test asserts that production has no `dev.*` key (§9.2, S-11). The OpenAPI describes the ingress surface of the deployment. Adding test tooling to it would document endpoints that must not exist in production, and invite clients to call them. The consoles' states are backed by the operations they drive, which the mapping records with `dev: true` |
| E-4 | **Reject** | The column mirrors Plan-2's data model (§6.9). Narrowing it to `'purchase'` would diverge from Plan-2 for no safety gain: a stray `'trade'` row would only be counted under the same per-requester limits |
