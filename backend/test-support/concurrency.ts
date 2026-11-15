// Barrier helper for single-winner proofs: N calls start together, every outcome is kept.
// No assertion lives here (test-quality.md example 3): it only collects results.

export interface RaceOutcome<T> {
  fulfilled: T[];
  rejected: unknown[];
}

export async function race<T>(n: number, attempt: (i: number) => Promise<T>): Promise<RaceOutcome<T>> {
  let open!: () => void;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  const runs = Array.from({ length: n }, (_, i) => gate.then(() => attempt(i)));
  open();
  const settled = await Promise.allSettled(runs);
  return {
    fulfilled: settled.filter((s): s is PromiseFulfilledResult<Awaited<T>> => s.status === 'fulfilled').map((s) => s.value),
    rejected: settled.filter((s): s is PromiseRejectedResult => s.status === 'rejected').map((s) => s.reason),
  };
}

/** The `code` of a DomainError-shaped rejection, or the error name otherwise. */
export function codeOf(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) return String((error as { code: unknown }).code);
  return error instanceof Error ? error.name : String(error);
}
