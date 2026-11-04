// `/ingresar` (Story 9.6, decision log Impl-2 #15): sign in with email and password. There is no sign-up page in the
// Impl-2 slice; accounts come from the API (Story 2.6) or, in the E2E journeys, from seeded rows.
import { SignInForm } from './SignInForm.js';

export const metadata = { title: 'Ingresar · TEZG' };

export default function SignInPage() {
  return (
    <section className="frame-r" aria-labelledby="signin-title">
      <h1 id="signin-title">Ingresar</h1>
      <p className="meta">Ingresa con el correo y la contraseña de tu cuenta de TEZG.</p>
      <SignInForm />
    </section>
  );
}
