// `/coleccion/<collectionId>` (page 9.1, the binder; Story 11.5, decision log Impl-2 #17). Rendered on the server from
// `collections.binder` (S-FR-COL-5) with the sort in the URL (`?orden=`), so a reload or a shared link shows the same
// order: the server's keys, then the entry id. A page holds rows × cols pockets (`?pagina=`); after an add, `?entrada=`
// opens the page that holds the new entry. A link-added image is loaded by the browser only, https only, with no
// referrer and lazily (S-12). A foreign or unknown id gets the Not-available page, the same for both.
import { headers } from 'next/headers.js';
import { redirect } from 'next/navigation.js';
import type { BinderEntryDTO, GetBinderResponse, ListCollectionsResponse } from '../../../src/modules/collections/index.js';
import { callProcedure } from '../../_server/runtime.js';
import { pageFromQuery, safeImage, SORT_OPTIONS, sortFromQuery, sourceBadge } from '../binder.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mi colección · TEZG' };

type Props = { params: Promise<{ collectionId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function Pocket({ entry }: { entry: BinderEntryDTO }) {
  const image = safeImage(entry.imageUrl);
  return (
    <li aria-label={entry.title} className="pocket-slot">
      <div className="pocket">
        {/* S-12: a plain <img>, so the browser loads the https image directly and never through a server proxy. */}
        {image
          ? <img src={image} alt="" referrerPolicy="no-referrer" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span>{entry.title}</span>}
      </div>
      <p className="pocket-cap">
        <span className="pocket-title">{entry.title}</span>
        <br />
        <span className="meta">{sourceBadge(entry)}{entry.qty > 1 ? ` · ×${entry.qty}` : ''}</span>
      </p>
    </li>
  );
}

export default async function BinderPage({ params, searchParams }: Props) {
  const { collectionId } = await params;
  const query = await searchParams;
  const sort = sortFromQuery(query.orden);
  const requestHeaders = await headers();
  const binder = await callProcedure<GetBinderResponse>('collections.binder', { collectionId, sort, setId: null }, requestHeaders);
  if (!binder.ok && binder.error.code === 'NotAuthenticated') redirect(`/ingresar?siguiente=${encodeURIComponent(`/coleccion/${collectionId}`)}`);
  if (!binder.ok) {
    const notFound = binder.error.code === 'CollectionNotFound' || binder.error.code === 'RequestValidationFailed';
    return (
      <section aria-labelledby="binder-title">
        <h1 id="binder-title">Mi colección</h1>
        <div className="xb refusal" role="alert">
          <p>{notFound ? 'No encontramos esta colección en tu cuenta.' : 'No pudimos cargar tu colección en este momento. Ya quedó registrado; vuelve a intentarlo en unos segundos.'}</p>
          <p><a href="/coleccion">Ver mis colecciones</a></p>
        </div>
      </section>
    );
  }
  const listed = await callProcedure<ListCollectionsResponse>('collections.list', {}, requestHeaders);
  const name = (listed.ok ? listed.data.collections.find((c) => c.collectionId === collectionId)?.name : undefined) ?? 'Colección';
  const { rows, cols, entries } = binder.data;
  const size = rows * cols;
  const pages = Math.max(1, Math.ceil(entries.length / size));
  const added = typeof query.entrada === 'string' ? entries.findIndex((e) => e.entryId === query.entrada) : -1;
  const page = Math.min(added >= 0 ? Math.floor(added / size) + 1 : pageFromQuery(query.pagina), pages);
  const shown = entries.slice((page - 1) * size, page * size);
  const orden = sort.join(',');
  const pageHref = (n: number) => `/coleccion/${collectionId}?orden=${encodeURIComponent(orden)}&pagina=${n}`;

  return (
    <section aria-labelledby="binder-title">
      <h1 id="binder-title">Mi colección</h1>
      <p className="meta"><a href="/coleccion">Colecciones</a></p>
      <h2>{name} <span className="meta">· {entries.length === 1 ? '1 carta' : `${entries.length} cartas`}</span></h2>
      <div role="status" aria-label="Aviso" className={added >= 0 ? 'xb done' : 'sr-only'}>{added >= 0 ? `Agregaste ${entries[added]!.title} a «${name}».` : ''}</div>
      <div style={{ display: 'flex', gap: 'var(--s3)', flexWrap: 'wrap', alignItems: 'end', marginBottom: 'var(--s4)' }}>
        <form method="get" aria-label="Organizar" style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'end' }}>
          <p style={{ margin: 0 }}>
            <label className="f" htmlFor="binder-sort">Ordenar por</label>
            <select className="f" id="binder-sort" name="orden" defaultValue={sort[0]}>
              {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </p>
          <button className="btn btn-secondary" type="submit">Ordenar</button>
        </form>
        <a className="btn btn-primary" href={`/coleccion/${collectionId}/agregar`}>Agregar carta por enlace</a>
      </div>
      {entries.length === 0
        ? <p className="empty">Esta colección está vacía. Agrega tu primera carta.</p>
        : (
          <>
            <ol aria-label={`Página ${page} de ${pages}`} className="binder" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, listStyle: 'none', padding: 0 }}>
              {shown.map((e) => <Pocket key={e.entryId} entry={e} />)}
              {Array.from({ length: size - shown.length }, (_, i) => <li key={`empty-${i}`} aria-hidden="true"><div className="pocket empty-pocket" /></li>)}
            </ol>
            <nav aria-label="Páginas del álbum" style={{ display: 'flex', gap: 'var(--s4)', marginTop: 'var(--s4)' }}>
              {page > 1 ? <a href={pageHref(page - 1)}>‹ Anterior</a> : <span className="meta">‹ Anterior</span>}
              <span className="meta">Página {page} de {pages}</span>
              {page < pages ? <a href={pageHref(page + 1)}>Siguiente ›</a> : <span className="meta">Siguiente ›</span>}
            </nav>
          </>
        )}
    </section>
  );
}
