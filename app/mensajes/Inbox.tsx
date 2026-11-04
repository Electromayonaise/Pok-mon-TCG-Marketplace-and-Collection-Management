/// <reference lib="dom" />
'use client';
// The interactive inbox of page 12.2 (Story 9.6, decision log Impl-2 #15; AD-MSG-3):
//   - the conversation list with each one's unread badge and the total unread (muted conversations excluded);
//   - opening a conversation reads its thread (100 messages per call, `seq > afterSeq`) and marks it read up to the
//     last seq shown, so its badge clears and the total drops;
//   - a mute toggle per conversation; a business's mute is the server's explained no-op, shown as a notice;
//   - "Ver más conversaciones" pages with the inbox cursor, and the open view polls every 30 s while visible.
// Every number shown comes from the server's answer; nothing is computed here but the display.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GetThreadResponse, InboxRowDTO, ListInboxResponse, MarkReadResponse, SetMutedResponse, ThreadMessageDTO } from '../../src/modules/messaging/index.js';
import { fecha, hora, mutate, query } from '../_client/api.js';

const THREAD_PAGE = 100;
const POLL_MS = 30_000;
const LOAD_ERROR = 'No pudimos cargar tus mensajes en este momento. Ya quedó registrado; vuelve a intentarlo en unos segundos.';
const NOT_VISIBLE = 'No encontramos esta conversación en tu cuenta.';
const MUTE_NOT_CONFIRMED = 'No sabemos si tu cambio se guardó porque se perdió la conexión. Actualiza para ver el estado actual; si no se guardó, puedes repetirlo sin riesgo.';

interface OpenThread { conversationId: string; messages: ThreadMessageDTO[]; lastSeq: number }

export function Inbox({ initial }: { initial: ListInboxResponse }) {
  const [rows, setRows] = useState<InboxRowDTO[]>(initial.rows);
  const [nextCursor, setNextCursor] = useState<string | null>(initial.nextCursor);
  const [unreadTotal, setUnreadTotal] = useState(initial.unreadTotal);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<OpenThread | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The conversation the latest open asked for: an answer for an older one is dropped.
  const opening = useRef<string | null>(null);

  /** The first page and the total again from the server, merged over the rows of later pages already shown. */
  const refresh = useCallback(async () => {
    const fresh = await query<ListInboxResponse>('messaging.inbox', { cursor: null });
    if (!fresh.ok) return;
    setUnreadTotal(fresh.data.unreadTotal);
    setRows((shown) => {
      const ids = new Set(fresh.data.rows.map((r) => r.conversationId));
      return [...fresh.data.rows, ...shown.filter((r) => !ids.has(r.conversationId))];
    });
  }, []);

  const updateRow = (conversationId: string, change: Partial<InboxRowDTO>) =>
    setRows((shown) => shown.map((r) => (r.conversationId === conversationId ? { ...r, ...change } : r)));

  /** Reads the messages after `afterSeq`, 100 per call, until a short page. */
  async function readThread(conversationId: string, afterSeq: number): Promise<{ messages: ThreadMessageDTO[]; lastSeq: number } | 'notVisible' | 'error'> {
    const messages: ThreadMessageDTO[] = [];
    let after = afterSeq;
    let lastSeq = afterSeq;
    for (;;) {
      const page = await query<GetThreadResponse>('messaging.thread', { conversationId, afterSeq: after });
      if (!page.ok) return page.error?.code === 'ConversationNotVisibleToCaller' ? 'notVisible' : 'error';
      messages.push(...page.data.messages);
      lastSeq = page.data.lastSeq;
      if (page.data.messages.length < THREAD_PAGE) return { messages, lastSeq };
      after = page.data.messages[page.data.messages.length - 1]!.seq;
    }
  }

  /** AD-MSG-3 rule 1: the read mark moves to the last seq shown, never past it. */
  async function markShown(conversationId: string, seq: number) {
    if (seq === 0) return;
    const read = await mutate<MarkReadResponse>('messaging.markRead', { conversationId, seq });
    if (!read.ok) return;
    updateRow(conversationId, { unread: read.data.unread });
    await refresh();
  }

  async function open(conversationId: string) {
    opening.current = conversationId;
    setSelected(conversationId);
    setThread(null);
    setThreadError(null);
    const result = await readThread(conversationId, 0);
    if (opening.current !== conversationId) return;
    if (result === 'notVisible' || result === 'error') {
      setThreadError(result === 'notVisible' ? NOT_VISIBLE : LOAD_ERROR);
      return;
    }
    setThread({ conversationId, ...result });
    await markShown(conversationId, result.messages.at(-1)?.seq ?? 0);
  }

  async function toggleMute(row: InboxRowDTO) {
    const answer = await mutate<SetMutedResponse>('messaging.setMuted', { conversationId: row.conversationId, muted: !row.muted });
    if (!answer.ok) {
      setNotice(answer.error?.decision.humanMessage ?? MUTE_NOT_CONFIRMED);
      return;
    }
    updateRow(row.conversationId, { muted: answer.data.muted });
    setNotice(answer.data.decision.humanMessage);
    await refresh();
  }

  async function more() {
    if (nextCursor === null) return;
    const page = await query<ListInboxResponse>('messaging.inbox', { cursor: nextCursor });
    if (!page.ok) {
      setNotice(LOAD_ERROR);
      return;
    }
    setRows((shown) => [...shown, ...page.data.rows.filter((r) => !shown.some((s) => s.conversationId === r.conversationId))]);
    setNextCursor(page.data.nextCursor);
    setUnreadTotal(page.data.unreadTotal);
  }

  // EXPERIENCE.md polling: every 30 s while the tab is visible, the inbox and the open thread's new messages.
  const openThread = useRef<OpenThread | null>(null);
  openThread.current = thread;
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refresh();
      const current = openThread.current;
      if (current === null) return;
      void readThread(current.conversationId, current.messages.at(-1)?.seq ?? 0).then(async (result) => {
        if (typeof result === 'string' || result.messages.length === 0 || openThread.current?.conversationId !== current.conversationId) return;
        setThread({ conversationId: current.conversationId, messages: [...current.messages, ...result.messages], lastSeq: result.lastSeq });
        await markShown(current.conversationId, result.messages.at(-1)!.seq);
      });
    }, POLL_MS);
    return () => clearInterval(timer);
    // readThread and markShown only call the API and the state setters, so the timer needs no other dependency.
  }, [refresh]);

  const selectedRow = rows.find((r) => r.conversationId === selected) ?? null;

  return (
    <>
      <p className="meta">Sin leer en total: <output aria-label="Mensajes sin leer en total" className="unread">{unreadTotal}</output></p>
      <div role="status" aria-label="Aviso" className={notice ? 'xb notice' : 'sr-only'}>{notice ?? ''}</div>
      <div className="panes">
        <div className="inbox">
          {rows.length === 0
            ? <p className="empty">Aún no tienes mensajes. Puedes escribirle a una tienda desde cualquiera de sus publicaciones.</p>
            : (
              <ul aria-label="Conversaciones" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {rows.map((row) => (
                  <li key={row.conversationId} aria-label={row.counterpartName}>
                    <button type="button" className="inbox-row btn-link" style={{ width: '100%', textAlign: 'left', textDecoration: 'none', color: 'inherit' }}
                      aria-current={row.conversationId === selected ? 'true' : undefined} onClick={() => void open(row.conversationId)}>
                      <span style={{ fontWeight: row.unread > 0 && !row.muted ? 600 : 400 }}>{row.counterpartName}</span>{' '}
                      {row.unread > 0 && !row.muted
                        ? <span className="unread"><span aria-hidden="true">{row.unread}</span><span className="sr-only">{row.unread} sin leer</span></span>
                        : null}
                      <span className="preview meta">{row.lastMessageAt ? fecha(row.lastMessageAt) : 'Sin mensajes aún'}{row.muted ? ' · Silenciada' : ''}</span>
                    </button>
                    <p style={{ padding: '0 var(--s4) var(--s2)', margin: 0 }}>
                      <button type="button" className="btn-link meta" onClick={() => void toggleMute(row)}>{row.muted ? 'Dejar de silenciar' : 'Silenciar conversación'}</button>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          {nextCursor !== null ? <p><button type="button" className="btn btn-secondary" onClick={() => void more()}>Ver más conversaciones</button></p> : null}
        </div>
        <div className="pane">
          {selected === null || selectedRow === null
            ? <p className="empty">Elige una conversación para ver sus mensajes.</p>
            : (
              <section aria-label={`Conversación con ${selectedRow.counterpartName}`}>
                <h2>{selectedRow.counterpartName}</h2>
                {threadError !== null
                  ? <div className="xb refusal" role="alert"><p>{threadError}</p></div>
                  : thread === null || thread.conversationId !== selected
                    ? <div className="skel box" aria-hidden="true" />
                    : thread.messages.length === 0
                      ? <p className="empty">Esta conversación aún no tiene mensajes.</p>
                      : (
                        <ol className="thread" aria-label="Mensajes" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {thread.messages.map((m) => (
                            <li key={m.messageId} className={`bubble ${m.mine ? 'own' : 'other'}`}>
                              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{m.body}</p>
                              <p className="meta">{m.mine ? `Enviado · ${hora(m.at)}` : hora(m.at)}</p>
                            </li>
                          ))}
                        </ol>
                      )}
              </section>
            )}
        </div>
      </div>
    </>
  );
}
