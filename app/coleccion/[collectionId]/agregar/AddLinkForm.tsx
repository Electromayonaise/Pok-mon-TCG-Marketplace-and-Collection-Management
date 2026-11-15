/// <reference lib="dom" />
'use client';
// The "Por enlace" form of page 9.2 (Story 11.5, decision log Impl-2 #17; S-FR-COL-3). It posts to
// `collections.addExternal` and shows every refusal in place, in es-CO (microcopy-es-CO.md §8): the parser's
// RequestValidationFailed issues and the service's InvalidExternalLink both name their field, so each maps to the copy
// under that field, and nothing typed is lost. The server repeats every rule and never opens the link (FR-COL-3). On
// success the browser goes to the binder page that holds the new entry.
import { useState, type FormEvent } from 'react';
import type { AddExternalEntryResponse } from '../../../../src/modules/collections/index.js';
import type { ErrorBody } from '../../../../src/shared-kernel/explanation.js';
import { mutate } from '../../../_client/api.js';

type Field = 'url' | 'title' | 'imageUrl' | 'qty' | 'acquiredAt';

const FIELD_COPY: Record<Field, string> = {
  url: 'El enlace debe empezar por https:// y tener menos de 2.048 caracteres.',
  title: 'Escribe un nombre para la carta (hasta 120 caracteres).',
  imageUrl: 'El enlace de la imagen también debe empezar por https://.',
  qty: 'La cantidad debe estar entre 1 y 999.',
  acquiredAt: 'La fecha no puede ser posterior a hoy.',
};
const FIELDS = Object.keys(FIELD_COPY) as Field[];
const COLLECTION_GONE = 'No encontramos esta colección en tu cuenta.';
const NOT_CONFIRMED = 'No sabemos si la carta se guardó porque se perdió la conexión. Actualiza para ver el estado actual; si no se guardó, puedes repetirla sin riesgo.';
const SERVER_ERROR = 'No pudimos guardar la carta en este momento. Ya quedó registrado; vuelve a intentarlo en unos segundos.';

/** Today in Bogotá as YYYY-MM-DD, the form's default acquisition date. */
const todayInBogota = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(Date.now());

/** The fields a refusal names: the parser's issues, or the service's cited field. */
function refusedFields(error: ErrorBody | null): Field[] {
  if (error === null) return [];
  const named = error.code === 'RequestValidationFailed'
    ? (error.issues ?? []).map((i) => i.field)
    : error.code === 'InvalidExternalLink' ? [String(error.decision.citations[0]?.inputs.field ?? '')] : [];
  return FIELDS.filter((f) => named.includes(f));
}

export function AddLinkForm({ collectionId, collectionName }: { collectionId: string; collectionName: string }) {
  const [values, setValues] = useState<Record<Field, string>>({ url: '', title: '', imageUrl: '', qty: '1', acquiredAt: todayInBogota() });
  const [invalid, setInvalid] = useState<Field[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setBanner(null);
    const answer = await mutate<AddExternalEntryResponse>('collections.addExternal', {
      collectionId, url: values.url.trim(), title: values.title, imageUrl: values.imageUrl.trim() === '' ? null : values.imageUrl.trim(),
      qty: Number(values.qty), acquiredAt: values.acquiredAt,
    });
    if (answer.ok) {
      window.location.assign(`/coleccion/${collectionId}?entrada=${answer.data.entryId}`);
      return;
    }
    setPending(false);
    const fields = refusedFields(answer.error);
    setInvalid(fields);
    if (fields.length === 0) setBanner(answer.status === 0 ? NOT_CONFIRMED : answer.error?.code === 'CollectionNotFound' ? COLLECTION_GONE : SERVER_ERROR);
  }

  const input = (field: Field, label: string, props: { type: string; autoComplete?: string; inputMode?: 'numeric' }) => (
    <p>
      <label className="f" htmlFor={`link-${field}`}>{label}</label>
      <input
        className={`f${invalid.includes(field) ? ' invalid' : ''}`} id={`link-${field}`} name={field} {...props} value={values[field]}
        aria-invalid={invalid.includes(field)} aria-describedby={invalid.includes(field) ? `link-${field}-error` : undefined}
        onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
      />
      {invalid.includes(field) ? <span id={`link-${field}-error`} className="field-error">{FIELD_COPY[field]}</span> : null}
    </p>
  );

  return (
    <form className="card" onSubmit={submit} noValidate aria-label="Agregar carta por enlace">
      {invalid.length > 1
        ? <div className="xb refusal" role="alert"><p className="h">Revisa estos campos:</p><ul>{invalid.map((f) => <li key={f}><a href={`#link-${f}`}>{FIELD_COPY[f]}</a></li>)}</ul></div>
        : null}
      {banner ? <div className="xb refusal" role="alert"><p>{banner}</p></div> : null}
      {input('url', 'Enlace de la carta', { type: 'url', autoComplete: 'url' })}
      {input('title', 'Nombre de la carta', { type: 'text' })}
      {input('imageUrl', 'Enlace de la imagen (opcional)', { type: 'url' })}
      <p className="meta">TEZG no abre este enlace: solo guardamos el nombre, el enlace y la imagen que indiques.</p>
      {input('qty', 'Cantidad', { type: 'number', inputMode: 'numeric' })}
      {input('acquiredAt', 'Fecha de adquisición', { type: 'date' })}
      <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? 'Agregando…' : `Agregar a «${collectionName}»`}</button>
      {' '}
      <a className="btn btn-secondary" href={`/coleccion/${collectionId}`}>Cancelar</a>
    </form>
  );
}
