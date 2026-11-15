// Home: the entry point of the UI slice, and the page the E2E smoke journey reads. It shows the
// readiness probe's verdict, so a browser run proves the server, the database and its migrations.
import { db } from '../src/server/db.js';
import { readiness } from '../src/server/health.js';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { ready } = await readiness(db().pool);
  return (
    <section className="card" aria-labelledby="home-title">
      <h1 id="home-title">TEZG</h1>
      <p>Compra, intercambia y organiza tus cartas Pokémon TCG.</p>
      <p role="status" className={`si ${ready ? 'confirmed' : 'error'}`}>{ready ? 'Servicio listo' : 'Servicio no disponible'}</p>
    </section>
  );
}
