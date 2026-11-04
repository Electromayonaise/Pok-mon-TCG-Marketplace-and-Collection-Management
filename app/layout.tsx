// The app shell of the Impl-2 UI slice (decision log Impl-2 #2): es-CO, the DESIGN.md tokens, and
// one header. Pages are server components; their interactive parts are client components that call
// the public tRPC API.
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: 'TEZG', description: 'Mercado y colecciones de cartas Pokémon TCG' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CO">
      <body>
        <header className="app-header">
          <nav aria-label="Principal">
            <a className="brand" href="/">TEZG</a>
            <a href="/mensajes">Mensajes</a>
            <a href="/ingresar">Ingresar</a>
          </nav>
        </header>
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
