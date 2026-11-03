// Driving adapter — the scheduled job routes `/api/jobs/<job>` (Story 1.6; ARCHITECTURE §4, §13;
// AD-SYS-4 rule 7; S-9). Red-phase stub (Flow A, decision log Impl-2 #11): the bound tests in
// `_bmad-output/test-artifacts/atdd/sys_jobs.test.ts` fail on NotImplementedError until the story
// is implemented.
import { NotImplementedError } from '../shared-kernel/errors.js';

/** The job routes of the registry (`operations.json` ingress, kind `job`). */
export const JOB_NAMES = ['trm-fetch', 'expiry-materialize', 'commission-reconcile', 'outbox-sweep'] as const;
export type JobName = (typeof JOB_NAMES)[number];
/** The schedulers that call a job route; `admin` runs come from the admin procedures, never this route. */
export type JobTrigger = 'tick' | 'daily-morning' | 'daily-night';

export interface JobRouteDeps {
  /** `JOBS_SECRET`; the bearer is compared in constant time (S-9). */
  secret: string;
}

/** Serves `POST /api/jobs/<job>?trigger=<trigger>` with `Authorization: Bearer <JOBS_SECRET>`. */
export async function serveJob(_req: Request, _deps: JobRouteDeps): Promise<Response> {
  throw new NotImplementedError('jobs.serveJob');
}
