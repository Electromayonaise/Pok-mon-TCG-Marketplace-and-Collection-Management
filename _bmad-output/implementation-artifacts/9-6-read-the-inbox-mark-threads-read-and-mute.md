---
title: 'Story 9.6: Read the inbox, mark threads read and mute'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: '2a6ad10'
review_loop_iteration: 0
flow: 'Impl-2 Flow A + D + E (test-design.md §7.1): the 4 Solu-2 bound tests plus 2 new red tests (a 50-call stale-tab hammer and the non-participant proof) committed before any inbox code; the UI slice /ingresar and /mensajes with a Playwright journey; one code review per epic batch (decision log Impl-2 #4)'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/C-UX-Scenarios/12-msg-messaging/12.2-inbox-thread/12.2-inbox-thread.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 9.2 stores messages, but nobody can read them: `listInbox`, `getThread`, `markRead` and `setMuted` throw NotImplemented, their four procedures are unwired, and the app has no page that signs a user in or shows an inbox.

**Approach:** the four use cases over MSG's own tables, pure read-state rules in the domain, the procedures `messaging.inbox`, `.thread`, `.markRead` and `.setMuted`, and a UI slice. Decisions approved by Mateo (decision log Impl-2 #15):
- **Page sizes:** 20 conversations per inbox page by `(lastMessageAt desc, id)` with an opaque keyset cursor (a foreign cursor is `RequestValidationFailed`); at most 100 messages with `seq > afterSeq` per thread call, ascending.
- **New red tests:** `[S-FR-MSG-7.C1]` (50 concurrent `markRead` calls with random seqs, 20 rounds: `lastReadSeq` ends at the highest seq sent, clamped to `lastSeq`, and never decreases) and `[S-FR-MSG-7.f2]` (a non-participant never sees the conversation, and thread, `markRead` and mute are `ConversationNotVisibleToCaller` with zero writes); R-26.
- **Sign-in:** `/ingresar` (email and password through Story 2.6's guard, es-CO errors, a 429 with its retry time) and `/mensajes`; the journey signs in through the page with a seeded, verified user.
- **Read marks:** opening a conversation calls `markRead` with the last seq shown; mute is a toggle.

## Boundaries & Constraints

**Always:** a participant check first on thread, `markRead` and mute, with one body for an outsider and an unknown id; `markRead` is one conditional statement, `LEAST(:seq, lastSeq)` and `WHERE "lastReadSeq" < …` (AD-MSG-3 rule 1); unread = `lastSeq − lastReadSeq`, and the total excludes muted conversations (rule 2); the other side's `lastReadSeq` is never selected (rule 4); a business's mute is an explained no-op with zero writes (C-GAP-4). **Ask First:** a change of the page sizes, or a read receipt of any kind. **Never:** an admin path to `"Message".body`; a write to another module's table.

</frozen-after-approval>

## Code Map

- `src/modules/messaging/domain/msg.ts` -- `INBOX_PAGE_SIZE`, `THREAD_PAGE_SIZE`, `isSeq`, `clampReadSeq`, `unreadOf`, `muteChange`, `encodeInboxCursor` / `decodeInboxCursor`; unit tests in `src/modules/messaging/msg-domain.test.ts`
- `src/modules/messaging/application/msg.v2.ts` -- `listInbox`, `getThread`, `markRead`, `setMuted`; `msg.v2.test.ts` -- paging and the cursor, ties and a conversation with no message, the 100-message thread, seq checks, the clamp, mute / repeat / unmute
- `src/modules/messaging/ports/msg.v2.ts` + `infra/pg.ts` -- `ParticipantView`, `readParticipantView`, `listInboxPage`, `unreadTotal`, `threadMessages`, `advanceReadSeq`, `setBuyerMutedAt`
- `src/server/composition.ts` -- the four procedures; `src/server/composition.test.ts` -- all four over HTTP
- `app/_server/runtime.ts` -- `callProcedure` (a server component calls a procedure in-process with the request's cookies); `app/_client/api.ts` -- the browser's `GET ?input=` / `POST` calls and the es-CO time format
- `app/ingresar/` -- the sign-in page; `app/mensajes/` -- the inbox page; `app/layout.tsx` -- the header links
- `contracts.md` -- S-FR-MSG-7's pages and tests; §13's stored-only `ConversationThreadShown`, `ConversationMuted`, `ConversationUnmuted`, `MuteNotAvailableToBusiness`
- `_bmad-output/test-artifacts/atdd/msg_contracts.test.ts` (4 bound tests), `atdd/msg_inbox.test.ts` (`[S-FR-MSG-7.C1]`, `[S-FR-MSG-7.f2]`)
- `_bmad-output/test-artifacts/e2e/inbox.spec.ts`, `e2e/pages/SignInPage.ts`, `e2e/pages/InboxPage.ts`, `e2e/support/inbox-seed.ts`

## Tasks & Acceptance

**Execution:**
- [x] red: the 2 new tests, bound in `epics.source.mjs` and cited in S-FR-MSG-7; R-26 in `test-design.md` §2; red run in `evidence/impl2/17-story-9.6-red.log` (commit `0291b05`)
- [x] green: domain rules and their unit tests (`domain/msg.ts` at 100 % branches), the repository, the service and its integration tests
- [x] the four procedures in the composition root, one HTTP test
- [x] the UI slice `/ingresar` and `/mensajes`, the page objects and the journey; `npx playwright test` green (`evidence/impl2/18-story-9.6-e2e.log`)
- [x] `contracts.md`, `deferred-work.md`, `nfr-evidence.md`, `sprint-status.yaml` (9.6 and Epic 9 `done`), `traceability-matrix.md`
- [x] `npm run test:ci` green with 9.6 `done`

**Acceptance Criteria:**
- Given Camila has 2 unread messages in each of two conversations, when she opens the one with Cartas Andrés, then she sees its messages, its badge clears and her total drops from 4 to 2; when she mutes the other, her total is 0, and a reload shows the same.
- Given 50 tabs marking random seqs at once, 20 times as messages arrive, then `lastReadSeq` is always the highest seq sent, clamped to `lastSeq`, and the business's read state never moves.
- Given a business mutes, then `muted: false` with `MuteNotAvailableToBusiness` (`allowedWithNotice`) and no row changes; given an outsider, then 403 `ConversationNotVisibleToCaller` with the body of an unknown id, and nothing written.
- Given a wrong password on `/ingresar`, then the es-CO error and no navigation.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd msg_inbox.test.ts msg_contracts.test.ts` -- expected: 23 passed, the 6 bound tests among them
- `npx vitest run --project impl1-unit src/modules/messaging src/server/composition.test.ts` -- expected: pass
- `npx playwright test` -- expected: 3 passed
- `npm run test:ci` -- expected: exit 0

**Red phase (Flow A):** `evidence/impl2/17-story-9.6-red.log`: the 6 tests fail on `NotImplemented` (`messaging.markRead`, `.setMuted`, `.listInbox`); `gate:atdd-red:impl1`: 20 red for the right reason, 0 not as expected.

**Green phase:** `evidence/impl2/19-story-9.6-green.log` (`test:ci`). The E2E run (`evidence/impl2/18-story-9.6-e2e.log`): the first run failed the wrong-password spec on a strict-mode violation, because Next's route announcer is a second `role="alert"`; `SignInPage` now finds its controls inside the named form.

## Implementation Notes

- **`markRead`:** the participant row is read first (the visibility check). When `LEAST(seq, lastSeq)` is not above the mark already read, nothing is written and the state read is the answer. Otherwise one `UPDATE … FROM "Conversation"` sets `LEAST(:seq, c."lastSeq")` under `WHERE "lastReadSeq" < LEAST(…)`. Under READ COMMITTED, a concurrent higher mark that committed first is re-checked against that `WHERE`, so it is never lowered. When the update matches nothing, a fresh read returns the committed state. No audit row: a read mark is the reader's own view state, not a decision.
- **Inbox order and cursor:** `ORDER BY COALESCE("lastMessageAt", '-infinity') DESC, id ASC`. A conversation with no message yet (only fixtures make one) sorts last. The cursor is `base64url("inbox|<actorId>|<lastMessageAt or ->|<id>")`, bound to the reader. The total unread is read in the same read-only transaction as the page, over every conversation, not only the page.
- **Names:** the buyer sees the business's name (P-VER.name, one call per distinct shop on the page), and the business sees the buyer's display name (P-IDN.names, one call). A shop with no application on file falls back to its display name.
- **Mute:** `UPDATE … WHERE role = 'buyer' AND ("mutedAt" IS NULL) = (:mutedAt IS NOT NULL)`, so repeating a mute keeps the first `mutedAt` and writes nothing. The four decisions are new stored-only §13 codes. C-GAP-4 needed no new error code, but a Decision needs a reason code.
- **Thread:** `afterSeq` must be a whole number from 0 (the tRPC parser accepts any number), or `RequestValidationFailed` on the field. The decision `ConversationThreadShown` cites `{ afterSeq, returned, lastSeq }`.
- **UI:** server components call procedures in-process (`callProcedure` builds a `Request` for `handleTrpc` with the request's cookie), so the page and the browser share one gate, parser and ErrorBody. Opening a conversation reads every thread page (100 at a time), then marks the last seq shown and re-reads the first inbox page for the total. A 30 s poll runs while the tab is visible. The client files reference the DOM lib (`tsconfig.json` has only ES2023). The sign-in page maps Better Auth's 401 to "El correo o la contraseña no coinciden…" (no registry code exists for it, see Story 2.6's deferral), and the guard's 429 to the §1 `AuthRateLimited` copy with `{hora}` from `citations[0].inputs.retryAt`.
- **E2E seed:** `e2e/support/inbox-seed.ts` writes the buyer, its `"Account"` (`providerId: 'credential'`, Better Auth's `hashPassword`), two Approved shops and two conversations into `tezg_e2e`, after it deletes them and every `"AuthThrottleEvent"` row (the throttle counts failures across runs on that database).
- **Deferred** (`deferred-work.md`): the inbox preview, the verification markers and the per-message notice line need DTO fields; there is no composer, no filter and no deep link; the business sees the mute toggle (its click gets the notice); names cost one identity call per shop; `/ingresar` has no return-to page, sign-out or sign-up.
