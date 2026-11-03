// Driving adapter — the scheduled job routes `POST /api/jobs/<job>?trigger=<trigger>` (Story 1.6;
// ARCHITECTURE §4, §13; AD-SYS-4 rule 7; S-9; contracts.md §15 S-SYS.jobs). In order:
//   1. the `JOBS_SECRET` bearer, checked by identity in constant time, before anything is read or
//      written: a refusal is 401 `NotAuthenticated` and leaves no JobRun row;
//   2. the job name (404) and the trigger (400 `RequestValidationFailed`), also before any row;
//   3. one run through the JobRunner: one JobRun row, single-flight under `job:<name>`.
// A failed run answers 500 `Unexpected`; its error goes to the log, never to the body.
import type { IdentityGateV2 } from '../modules/identity/index.js';
import { JOB_TRIGGERS, jobErrorCode, type JobRunner, type JobTrigger, type JobWork } from '../shared-kernel/jobs.js';
import type { Clock } from '../shared-kernel/ports.js';
import { rejectRequest } from '../shared-kernel/request.js';
import { UnexpectedError } from '../shared-kernel/errors.js';
import type { Logger } from '../shared-kernel/regulated.js';
import { toErrorBody } from './trpc/errors.js';

/** The job routes of the registry (`operations.json` ingress, kind `job`). */
export const JOB_NAMES = ['trm-fetch', 'expiry-materialize', 'commission-reconcile', 'outbox-sweep'] as const;
export type JobName = (typeof JOB_NAMES)[number];
export type { JobTrigger };

export interface JobRouteDeps {
  /** `JOBS_SECRET`; an empty one refuses every request. */
  secret: string;
  clock: Clock;
  identity: Pick<IdentityGateV2, 'requireJobBearer'>;
  runner: JobRunner;
  work: Record<JobName, JobWork>;
  log?: Logger;
}

const json = (status: number, body: unknown) => Response.json(body, { status });
const isJob = (name: string): name is JobName => (JOB_NAMES as readonly string[]).includes(name);
const isTrigger = (t: string | null): t is JobTrigger => t !== null && (JOB_TRIGGERS as readonly string[]).includes(t);

/** Serves `POST /api/jobs/<job>?trigger=<trigger>` with `Authorization: Bearer <JOBS_SECRET>`. */
export async function serveJob(req: Request, deps: JobRouteDeps): Promise<Response> {
  const now = deps.clock.now();
  try {
    deps.identity.requireJobBearer(req.headers.get('authorization'), deps.secret);
    if (req.method !== 'POST') rejectRequest([{ field: 'la solicitud', issue: 'usa POST' }]);
    const url = new URL(req.url);
    const job = url.pathname.replace(/^.*\/api\/jobs\//, '').replace(/\/$/, '');
    if (!isJob(job)) return json(404, { error: toErrorBody(unknownJob(), now) });
    const work = deps.work[job];
    const trigger = url.searchParams.get('trigger');
    if (!isTrigger(trigger) || !work.triggers.includes(trigger)) rejectRequest([{ field: 'trigger', issue: `debe ser ${work.triggers.join(', ')}` }]);
    const run = await deps.runner.run(job, trigger, work);
    if (run.outcome === 'failed') {
      deps.log?.error('job.failed', { job, trigger, runId: run.runId, errorCode: jobErrorCode(run.error) });
      return json(500, { error: toErrorBody(new UnexpectedError(`job ${job} failed`), now) });
    }
    return json(200, { job, trigger, runId: run.runId, outcome: run.outcome, result: run.result });
  } catch (error) {
    const body = toErrorBody(error, now);
    return json(body.httpStatus, { error: body });
  }
}

/** The 404 body is a request issue on `job`, like every other refusal (AD-SYS-1); it never echoes the path. */
function unknownJob(): unknown {
  try {
    return rejectRequest([{ field: 'job', issue: 'no es una tarea programada' }]);
  } catch (error) {
    return error;
  }
}
