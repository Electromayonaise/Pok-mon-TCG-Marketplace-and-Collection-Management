// Error inspection helpers. They extract data only; every expect() stays in the test body.
import { DOMAIN_ERRORS, HTTP_STATUS, type DomainErrorCode } from '../src/shared-kernel/codes.js';

/** Awaits a call that is expected to fail and returns what it threw (or what it returned, so the assertion shows it). */
export async function caught(call: () => unknown): Promise<unknown> {
  try {
    return await call();
  } catch (error) {
    return error;
  }
}

/** HTTP status of a DomainError per the registry (AD-SYS-1), or null for anything else. */
export function httpOf(error: unknown): number | null {
  const code = (error as { code?: string } | null)?.code;
  if (!code || !(code in DOMAIN_ERRORS)) return null;
  return HTTP_STATUS[DOMAIN_ERRORS[code as DomainErrorCode].trpc];
}

/** citations[0].inputs of a DomainError, or null. */
export function citedInputs(error: unknown): Record<string, unknown> | null {
  const citations = (error as { citations?: { inputs: Record<string, unknown> }[] } | null)?.citations;
  return citations?.[0]?.inputs ?? null;
}
