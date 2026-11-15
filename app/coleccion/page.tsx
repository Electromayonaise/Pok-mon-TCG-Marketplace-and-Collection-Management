// `/coleccion` (page 9.1, collections list; Story 11.5, decision log Impl-2 #17): the owner's collections with their
// entry counts (`collections.list`), each opening its binder at `/coleccion/<collectionId>`. Without a session the
// visitor goes to `/ingresar` and comes back here.
import { headers } from 'next/headers.js';
import { redirect } from 'next/navigation.js';
import type { ListCollectionsResponse } from '../../src/modules/collections/index.js';
import { callProcedure } from '../_server/runtime.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mi colección · TEZG' };

export default async function CollectionsPage() {
  const result = await callProcedure<ListCollectionsResponse>('collections.list', {}, await headers());
  if (!result.ok && result.error.code === 'NotAuthenticated') redirect('/ingresar?siguiente=/coleccion');
  return (
    <section aria-labelledby="collections-title">
      <h1 id="collections-title">Mi colección</h1>
      {!result.ok
        ? <div className="xb refusal" role="alert"><p>No pudimos cargar tus colecciones en este momento. Ya quedó registrado; vuelve a intentarlo en unos segundos.</p></div>
        : result.data.collections.length === 0
          ? <p className="empty">Aún no tienes colecciones. Agrega tu primera carta y la guardaremos en «General».</p>
          : (
            <ul aria-label="Colecciones" className="trace">
              {result.data.collections.map((c) => (
                <li key={c.collectionId}>
                  <a href={`/coleccion/${c.collectionId}`}>{c.name}</a> <span className="meta">· {c.entryCount === 1 ? '1 carta' : `${c.entryCount} cartas`}</span>
                </li>
              ))}
            </ul>
          )}
    </section>
  );
}
