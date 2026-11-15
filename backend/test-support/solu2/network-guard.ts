// NFR-SYS-3 / AD-SYS-6 rule 4: any socket to a host other than the test Postgres fails the
// test. Registered as a setupFile of the solu2-* projects, so it runs before every test file.
import net from 'node:net';
import { PG } from '../env.js';

const allowed = new Set([`${PG.host}:${PG.port}`, `localhost:${PG.port}`, `::1:${PG.port}`]);
const original = net.Socket.prototype.connect;

net.Socket.prototype.connect = function guarded(this: net.Socket, ...args: unknown[]) {
  const first = args[0] as { host?: string; port?: number; path?: string } | number | string;
  let host: string | undefined;
  let port: number | undefined;
  if (typeof first === 'object' && first !== null) {
    if ('path' in first && first.path) return (original as (...a: unknown[]) => net.Socket).apply(this, args); // Unix socket
    host = first.host ?? 'localhost';
    port = Number(first.port);
  } else {
    port = Number(first);
    host = typeof args[1] === 'string' ? (args[1] as string) : 'localhost';
  }
  if (!allowed.has(`${host}:${port}`)) {
    throw new Error(`network guard (NFR-SYS-3): outbound socket to ${host}:${port} refused; only the test Postgres is reachable`);
  }
  return (original as (...a: unknown[]) => net.Socket).apply(this, args);
} as typeof net.Socket.prototype.connect;
