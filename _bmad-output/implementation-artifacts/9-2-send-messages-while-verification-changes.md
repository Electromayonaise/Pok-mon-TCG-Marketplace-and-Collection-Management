---
title: 'Story 9.2: Send messages while verification changes'
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

**Problem:** `MsgServiceV2.sendMessage` throws `NotImplementedError`: a buyer cannot write to a business, and the R-09 (P0) compose→send race is unproven.

**Approach:** MSG-1 as written in contracts.md §9 and AD-MSG-2, in one transaction: P2–P5 first-fail, then the conversation upsert, the `lastSeq` allocation, a savepointed message insert and the audit row. P1 `canBuy` is the `canBuy` procedure builder's, as ORD-1's is.

## Boundaries & Constraints

**Always:**
- **P2:** body NFC-normalized, 1–2,000 characters; `clientMessageId` `^[A-Za-z0-9_-]{1,64}$`; exactly one target shape → `RequestValidationFailed`.
- **P3 (reply):** the sender is a participant of `conversationId`, else `ConversationNotVisibleToCaller` (403), identical for an unknown id.
- **P4 (start):** the sender's `sellerKind = 'business'` → `BusinessCannotInitiate` (409). **D2 (approved):** messaging reads the sender's kind through an identity-exported reader on the one repository (R-14), the `requireAdmin` pattern of #32: identity exports `sellerKindOf(repo, tx, userId)`; messaging raises its own code. No port, fake or bound-test change.
- **P5:** `identity.requireMessagingEligibility` in the send transaction (Story 9.1, D3 lock) — buyer sending → the recipient business; business replying → its own status. `NotBusinessAccount` propagates unchanged, zero writes.
- **Q1–Q2:** `INSERT "Conversation" … ON CONFLICT ("buyerId","businessId") DO NOTHING`, select, two participant rows `ON CONFLICT DO NOTHING`; `UPDATE … "lastSeq" = "lastSeq" + 1 … RETURNING`; `SAVEPOINT send_insert` + insert with `recipientVerificationAtSend`. A `23505` on the idempotency key → `ROLLBACK TO SAVEPOINT`, roll the transaction back (undoing the seq increment) and return the original message (EC-14).
- **Q3:** audit `messaging.message.sent` on `Message:id`, data `{ conversationId, seq }` — never the body. No event.
- **Q4:** decision `allowed` / `allowedWithNotice` (`RecipientNotYetVerified`), `{ rule: 'FR-MSG-4', inputs: { recipientStatus } }`.
- Clock read once. Lock order: advisory none; identity's application row (`FOR SHARE`) is read before the `Conversation` row update; VER-1 never touches `Conversation`, so no cycle.
- **Wiring:** `messaging.send` in `composition.ts` with the real identity (`requireMessagingEligibility`, `getDisplayNames`, `getBusinessName`).
- **NFR-MSG-2 benchmark:** `[NFR-MSG-2.send]` in `_bmad-output/test-artifacts/nfr/msg_latency.test.ts` (shared harness, real composition), 50 warm-up and 500 measured sends, p95 ≤ 500 ms; bound to 9.2 in `epics.source.mjs` / `epics.md`; refresh the MSG rows of `nfr-evidence.md`.
- §13 stored-only `MessageSent` row if the `allowed` decision needs a code.

**Ask First:** a DTO, port or bound-test change; SERIALIZABLE.

**Never:** the body in an audit row, event, log or citation (AD-SYS-8 rule 3); a read of identity tables by messaging SQL.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First message | Approved | 1 conversation, 2 participants, seq 1 | N/A |
| Pending | — | notice | N/A |
| Retry same id | sent | original returned, zero writes | N/A |
| 20 concurrent | one pair | 1 conversation, seqs 1..20 | N/A |
| Rejected mid-send | 100 × | sent before, or refused | `NotBusinessAccount`, zero writes |
| Business starts | — | nothing written | `BusinessCannotInitiate` |
| Outsider replies | — | — | `ConversationNotVisibleToCaller` |

</frozen-after-approval>

## Code Map

- `src/modules/messaging/domain/msg.ts` -- `sendEligibility`, `normalizeBody` (pure)
- `src/modules/messaging/ports/msg.v2.ts`, `infra/pg.ts` (new `PgMsgRepository`) -- conversation, seq, message SQL
- `src/modules/messaging/application/msg.v2.ts`, `index.ts` -- `sendMessage`
- `src/modules/identity/application/*.ts`, `index.ts` -- exported `sellerKindOf`
- `src/server/composition.ts` (+ test), `test-support/solu2/fixtures.ts` (`wiring` repo gains `PgMsgRepository`)
- `_bmad-output/test-artifacts/nfr/msg_latency.test.ts`, `nfr-evidence.md`, `epics.source.mjs` / `epics.md`

## Tasks & Acceptance

**Execution:**
- [x] domain + src domain tests
- [x] repository, service, identity reader; src tests (body never audited, pool of 1)
- [x] wiring + HTTP case; the benchmark and its binding
- [x] `sprint-status.yaml` -- 9.2 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 9.2 `done`, when its 5 bound tests and `[NFR-MSG-2.send]` run, then they pass; `[MSG-3.MEC]` runs 100 repetitions against Postgres and its runtime is recorded here (TG-7). Story 9.4's three tests are early greens, restored by the 9.4 commit (#23).

## Verification

- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/msg_contracts.test.ts -t "MSG-1|MSG-3"` -- expected: pass

## Implementation Notes

- Code review is batched with the rest of Epic 9 at its close (decision #22).
- **D2:** identity exports `sellerKindOf(repo, tx, userId)` beside `requireAdmin` (`application/admin.ts`); `MsgRepository = MsgTablesRepository & AdminFactsReader`, so messaging raises its own `BusinessCannotInitiate` with no read of an identity table and no port change.
- P5 checks the pair's business on both paths: the recipient on a start, the conversation's business on a reply (so a buyer's reply and a business's own reply both follow the business's current status, AD-MSG-2 rule 2).
- **Retry:** after P5, a non-locking read of the sender's `clientMessageId` in the pair returns the original message with the decision stored at send (`recipientVerificationAtSend`), and writes nothing. A concurrent retry that loses the unique key raises an internal `DuplicateSend` after `ROLLBACK TO SAVEPOINT send_insert`, so the whole transaction rolls back (the seq increment too) and one new transaction returns the winner (Q-fail).
- **Bound-test Given (approved, decision log Impl-1 #34):** `[MSG-3.MEC]` rejected the business with `"rejectionReasonCode" = 'DataMismatch'` but never seeded that `RejectionReason`, so every repetition failed on the FK (23503). One line seeds it before the loop; what is measured and the assertions are unchanged.
- `messaging.send` is wired (the canBuy builder is P1) with MSG's identity port bound to IDN (`getDisplayNames`) and VER (`getBusinessName`, `requireMessagingEligibility`). §13 gains the stored-only `MessageSent` row.
- **TG-7 runtime** (local Postgres 16, `fsync=off`): `[MSG-3.MEC]` 100 repetitions in 572 ms.
- Measured: `[NFR-MSG-2.send]` p95 6.6 ms (p50 3.0).

### Review Findings

Epic 9 close review (2026-10-30, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `787392b..7be44bf` (code paths, the two bound-test Givens and the NFR file). Totals for the epic: 3 decisions, 7 patches, 4 deferrals, 10 dismissed. Martín resolved the decisions with every recommendation and approved every patch (decision log Impl-1 #34).

- [x] [Review][Decision→Patch] contracts.md MSG-1 P5, MSG-3 MEC and AD-MSG-2 rule 2 said the refusal carries the composed body back; the ErrorBody has no such field and the body is regulated — the contract now says the client keeps its own text and the refusal never echoes it; no code change
- [x] [Review][Patch] A retry whose original committed before a rejection got `NotBusinessAccount` (EC-14 broken) — the sender's `clientMessageId` is looked up right after P3, before P4 and P5 [src/modules/messaging/application/msg.v2.ts]
- [x] [Review][Patch] The audit row's data carried `recipientStatus` beyond the approved `{ conversationId, seq }` [src/modules/messaging/application/msg.v2.ts]
- [x] [Review][Defer] whitespace or NUL bodies; zod's UTF-16 bound against P2's code points; the raw `{status}` token in the es-CO text (deferred-work.md)
