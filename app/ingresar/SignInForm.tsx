/// <reference lib="dom" />
'use client';
// The sign-in form (Story 9.6, decision log Impl-2 #15): email and password posted to Better Auth's
// `/api/auth/sign-in/email` through the AD-IDN-3 guard (Story 2.6, src/server/auth-routes.ts). A wrong password is
// Better Auth's 401; the guard's 429 carries the retry instant in its ErrorBody citation. On success the user goes
// to the page that sent them here (`?siguiente=`, a path on this site only; Story 11.5), else to the inbox.
import { useState, type FormEvent } from 'react';
import type { ErrorBody } from '../../src/shared-kernel/explanation.js';
import { hora } from '../_client/api.js';

const WRONG_CREDENTIALS = 'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.';
const MISSING_FIELDS = 'Escribe tu correo y tu contraseña para ingresar.';
const NOT_CONFIRMED = 'No sabemos si pudiste ingresar porque se perdió la conexión. Revisa tu conexión y vuelve a intentarlo.';
const SERVER_ERROR = 'No pudimos iniciar tu sesión en este momento. Ya quedó registrado; vuelve a intentarlo en unos segundos.';

/** The es-CO copy of a refused sign-in, from its status and the guard's ErrorBody (microcopy-es-CO.md §1, §10). */
function refusalText(status: number, error: ErrorBody | null): string {
  if (status === 429) {
    const retryAt = error?.decision.citations[0]?.inputs.retryAt;
    return typeof retryAt === 'string'
      ? `Hubo demasiados intentos de ingreso seguidos. Por seguridad, podrás intentarlo de nuevo a las ${hora(retryAt)}.`
      : 'Hubo demasiados intentos de ingreso seguidos. Por seguridad, espera unos minutos antes de intentarlo de nuevo.';
  }
  if (status === 401 || status === 400) return WRONG_CREDENTIALS;
  return status === 0 ? NOT_CONFIRMED : SERVER_ERROR;
}

/** Where a signed-in user goes: `next` when it is a path on this site (never `//host` or `/\host`), else the inbox. */
function destination(next: string | undefined): string {
  return next !== undefined && /^\/(?![/\\])/.test(next) ? next : '/mensajes';
}

export function SignInForm({ next }: { next?: string | undefined }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (email.trim() === '' || password === '') {
      setError(MISSING_FIELDS);
      return;
    }
    setPending(true);
    setError(null);
    let status = 0;
    let body: { error?: ErrorBody } | null = null;
    try {
      const res = await fetch('/api/auth/sign-in/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }) });
      status = res.status;
      body = (await res.json().catch(() => null)) as { error?: ErrorBody } | null;
    } catch {
      status = 0;
    }
    if (status === 200) {
      // A full navigation, so the next page renders on the server with the new session cookie.
      window.location.assign(destination(next));
      return;
    }
    setPending(false);
    setError(refusalText(status, body?.error ?? null));
  }

  return (
    <form className="card" onSubmit={submit} noValidate aria-label="Ingresar a TEZG" aria-describedby={error ? 'signin-error' : undefined}>
      <p>
        <label className="f" htmlFor="signin-email">Correo electrónico</label>
        <input className={`f${error ? ' invalid' : ''}`} id="signin-email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </p>
      <p>
        <label className="f" htmlFor="signin-password">Contraseña</label>
        <input className={`f${error ? ' invalid' : ''}`} id="signin-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </p>
      <p id="signin-error" role="alert" className="field-error">{error ?? ''}</p>
      <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? 'Ingresando…' : 'Ingresar'}</button>
    </form>
  );
}
