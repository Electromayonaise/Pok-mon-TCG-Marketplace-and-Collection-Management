// Where a signed-in user goes after `/ingresar?siguiente=` (Story 11.5; Impl-2 code review F1): a page of this site
// only. The value is resolved against the page's origin and kept only when the resolved URL stays on that origin, so
// `//evil.com`, `/\evil.com`, `https://evil.com` and `javascript:` all fall back to the inbox. A value with whitespace
// or a control character is refused before resolving: the URL parser strips a tab or newline, so `/\t/evil.com`
// would otherwise resolve to `https://evil.com/`.
export const DEFAULT_DESTINATION = '/mensajes';

// eslint-disable-next-line no-control-regex
const WHITESPACE_OR_CONTROL = /[\s\u0000-\u001f\u007f-\u009f]/u;

/** `next` as `pathname + search + hash` when it is a path on `origin`, else `/mensajes`. */
export function destination(next: string | undefined, origin: string): string {
  if (next === undefined || !next.startsWith('/') || WHITESPACE_OR_CONTROL.test(next)) return DEFAULT_DESTINATION;
  let resolved: URL;
  try {
    resolved = new URL(next, origin);
  } catch {
    return DEFAULT_DESTINATION;
  }
  return resolved.origin === new URL(origin).origin ? `${resolved.pathname}${resolved.search}${resolved.hash}` : DEFAULT_DESTINATION;
}
