// ATDD — Story 9.6, the concurrency and visibility half of S-FR-MSG-7 / S-FR-MSG-8 (contracts.md §15 MSG; AD-MSG-3
// rules 1 and 4). Flow A + Flow D (decision log Impl-2 #15): written before the inbox, the thread, markRead and
// setMuted existed; red on NotImplementedError until Story 9.6 is done.
import { describe, expect, it } from 'vitest';
import { MsgServiceV2 } from '../../../src/modules/messaging/index.js';
import type { IdentityForMsg } from '../../../src/modules/messaging/index.js';
import { codeOf, race } from '../../../test-support/concurrency.js';
import { useTestDatabase } from '../../../test-support/db.js';
import { caught, httpOf } from '../../../test-support/errors.js';
import { business, conversation, fake, id, rows, T0, user, wiring } from '../../../test-support/solu2/fixtures.js';

const db = useTestDatabase();

function msgService() {
  const identity = fake<IdentityForMsg>('identity', {
    getDisplayNames: async ({ userIds }) => ({ names: userIds.map((u) => ({ userId: u, displayName: `Nombre ${u.slice(0, 4)}` })) }),
    getBusinessName: async () => ({ businessName: 'Cartas Andrés' }),
  });
  return new MsgServiceV2({ ...wiring(db), identity });
}

/** Camila (buyer) and Andrés (Approved business) share conversation c1 with `lastSeq` messages. */
async function pair(lastSeq: number): Promise<void> {
  await user(db, { id: id('camila') });
  await business(db, id('andres'), 'Approved');
  await conversation(db, { id: id('c1'), buyerId: id('camila'), businessId: id('andres'), lastSeq });
}
const readState = (userId: string) =>
  db.query<{ lastReadSeq: string; mutedAt: string | null }>(`SELECT "lastReadSeq", "mutedAt" FROM "ConversationParticipant" WHERE "conversationId" = $1 AND "userId" = $2`, [id('c1'), userId]);
const lastReadOf = async (userId: string) => Number((await readState(userId))[0]!.lastReadSeq);

/** A seeded linear congruential generator, so a failing round replays with the same seqs. */
function seeded(seed: number): (bound: number) => number {
  let s = seed >>> 0;
  return (bound) => {
    s = (Math.imul(s, 1_664_525) + 1_013_904_223) >>> 0;
    return s % bound;
  };
}

describe('Story 9.6 — stale tabs racing markRead (S-FR-MSG-7, AD-MSG-3 rule 1)', () => {
  it('[S-FR-MSG-7.C1] 50 concurrent markRead calls with random seqs, 20 rounds: lastReadSeq ends at the highest seq sent, clamped to lastSeq, and never decreases', async () => {
    await pair(10);
    const svc = msgService();
    const random = seeded(96);
    let expected = 0;
    for (let round = 0; round < 20; round++) {
      // New messages arrive between rounds; seqs reach past lastSeq (a tab ahead of the server) and back to 0 (a stale tab).
      const lastSeq = 10 + 5 * round;
      await db.query(`UPDATE "Conversation" SET "lastSeq" = $2, "lastMessageAt" = $3 WHERE id = $1`, [id('c1'), lastSeq, T0]);
      const seqs = Array.from({ length: 50 }, () => random(lastSeq + 8));
      const { fulfilled, rejected } = await race(50, (i) => svc.markRead({ actorId: id('camila'), conversationId: id('c1'), seq: seqs[i]! }));
      // A rejected call fails the test with its own error, so the cause is never hidden behind a count.
      if (rejected.length > 0) throw rejected[0];
      expected = Math.max(expected, Math.min(Math.max(...seqs), lastSeq));
      expect(await lastReadOf(id('camila'))).toBe(expected);
      for (const [i, r] of fulfilled.entries()) {
        // Each answer is the state after its own statement: never below what it asked for, never past lastSeq.
        expect(r.lastReadSeq).toBeGreaterThanOrEqual(Math.min(seqs[i]!, lastSeq));
        expect(r.lastReadSeq).toBeLessThanOrEqual(lastSeq);
        expect(r.unread).toBe(lastSeq - r.lastReadSeq);
      }
    }
    // Only the reader's own row moves: the business's read state is untouched (AD-MSG-3 rule 4).
    expect(await lastReadOf(id('andres'))).toBe(0);
  }, 120_000);
});

describe('Story 9.6 — a non-participant sees nothing and writes nothing (S-FR-MSG-7, S-FR-MSG-8)', () => {
  it('[S-FR-MSG-7.f2] a non-participant never sees the conversation in its inbox, and thread, markRead and mute are ConversationNotVisibleToCaller (403) with zero writes', async () => {
    await pair(3);
    await user(db, { id: id('julian') });
    const svc = msgService();
    const before = { participants: await rows(db, 'ConversationParticipant'), audit: await rows(db, 'audit_events') };

    expect(await svc.listInbox({ actorId: id('julian'), cursor: null })).toMatchObject({ rows: [], nextCursor: null, unreadTotal: 0 });
    const refusals = [
      await caught(() => svc.getThread({ actorId: id('julian'), conversationId: id('c1'), afterSeq: 0 })),
      await caught(() => svc.markRead({ actorId: id('julian'), conversationId: id('c1'), seq: 3 })),
      await caught(() => svc.setMuted({ actorId: id('julian'), conversationId: id('c1'), muted: true })),
    ];
    expect(refusals.map(codeOf)).toEqual(['ConversationNotVisibleToCaller', 'ConversationNotVisibleToCaller', 'ConversationNotVisibleToCaller']);
    expect(refusals.map(httpOf)).toEqual([403, 403, 403]);
    // The refusal of a real conversation is the refusal of an unknown id: nothing tells an outsider it exists.
    const unknown = await caught(() => svc.getThread({ actorId: id('julian'), conversationId: id('ghost'), afterSeq: 0 }));
    expect(JSON.stringify(refusals[0]).replace(id('c1'), 'X')).toBe(JSON.stringify(unknown).replace(id('ghost'), 'X'));

    expect(await rows(db, 'ConversationParticipant')).toEqual(before.participants);
    expect(await rows(db, 'audit_events')).toEqual(before.audit);
    // The participants still see it.
    expect((await svc.listInbox({ actorId: id('camila'), cursor: null })).rows.map((r) => r.conversationId)).toEqual([id('c1')]);
  });
});
