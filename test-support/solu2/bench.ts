// Measurement helpers for the Solu-2 NFR benchmarks (_bmad-output/test-artifacts/nfr/). They compute only;
// every expect() stays in the benchmark.

/** Nearest-rank percentile (p in 0–100) of a sample; NaN for an empty sample. */
export function percentile(samples: readonly number[], p: number): number {
  if (!samples.length) return Number.NaN;
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))]!;
}
