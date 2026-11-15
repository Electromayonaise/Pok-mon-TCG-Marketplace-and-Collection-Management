// `/mensajes` (page 12.2, Story 9.6, decision log Impl-2 #15): the inbox. The first page is read on the server through
// the composed app with the request's cookies (`messaging.inbox`); without a session the visitor goes to `/ingresar`.
// The client part opens threads, marks them read, mutes and pages through `/api/trpc`.
import { headers } from 'next/headers.js';
import { redirect } from 'next/navigation.js';
import type { ListInboxResponse } from '../../src/modules/messaging/index.js';
import { callProcedure } from '../_server/runtime.js';
import { Inbox } from './Inbox.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mensajes · TEZG' };

export default async function MessagesPage() {
  const result = await callProcedure<ListInboxResponse>('messaging.inbox', { cursor: null }, await headers());
  if (!result.ok && result.error.code === 'NotAuthenticated') redirect('/ingresar');
  return (
    <section aria-labelledby="inbox-title">
      <h1 id="inbox-title">Mensajes</h1>
      {result.ok
        ? <Inbox initial={result.data} />
        : <div className="xb refusal" role="alert"><p>No pudimos cargar tus mensajes en este momento. Ya quedó registrado; vuelve a intentarlo en unos segundos.</p></div>}
    </section>
  );
}
