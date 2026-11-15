// `/coleccion/<collectionId>/agregar` (page 9.2, tab "Por enlace"; Story 11.5, decision log Impl-2 #17): add a card by
// its link (S-FR-COL-3). The collection is read on the server (`collections.list`) for its name; a foreign or unknown
// id gets the Not-available page. The "Del catálogo" tab needs the catalog search page and is not in this slice.
import { headers } from 'next/headers.js';
import { redirect } from 'next/navigation.js';
import type { ListCollectionsResponse } from '../../../../src/modules/collections/index.js';
import { callProcedure } from '../../../_server/runtime.js';
import { AddLinkForm } from './AddLinkForm.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Agregar carta · TEZG' };

export default async function AddEntryPage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  const listed = await callProcedure<ListCollectionsResponse>('collections.list', {}, await headers());
  if (!listed.ok && listed.error.code === 'NotAuthenticated') redirect(`/ingresar?siguiente=${encodeURIComponent(`/coleccion/${collectionId}/agregar`)}`);
  const collection = listed.ok ? listed.data.collections.find((c) => c.collectionId === collectionId) : undefined;
  return (
    <section className="frame-r" aria-labelledby="add-title">
      <p className="meta"><a href={`/coleccion/${collectionId}`}>← {collection?.name ?? 'Mi colección'}</a></p>
      <h1 id="add-title">Agregar carta</h1>
      {collection
        ? <AddLinkForm collectionId={collectionId} collectionName={collection.name} />
        : (
          <div className="xb refusal" role="alert">
            <p>{listed.ok ? 'No encontramos esta colección en tu cuenta.' : 'No pudimos cargar tu colección en este momento. Ya quedó registrado; vuelve a intentarlo en unos segundos.'}</p>
            <p><a href="/coleccion">Ver mis colecciones</a></p>
          </div>
        )}
    </section>
  );
}
