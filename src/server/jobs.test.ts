// The job route's order of checks without a database (Story 1.6; ARCHITECTURE §4, §13; S-9; decision log Impl-2 #24):
// the bearer, the method, the job and the trigger are each refused before a run, and a run's outcome becomes the
// answer without its error reaching the body. The route is served with the real identity gate's bearer check and the
// real JobRunner over in-memory ports; the Postgres side is proven in atdd/sys_jobs.test.ts.
import { describe, expect, it } from 'vitest';
import { VirtualClock } from '../../test-support/clock.js';
import { SequentialIds } from '../../test-support/ids.js';
import { IdentityGateV2, type IdentityGateDeps } from '../modules/identity/index.js';
import { JobRunner, type JobRunRepository, type JobWork } from '../shared-kernel/jobs.js';
import type { Tx } from '../shared-kernel/ports.js';
import { JOB_NAMES, serveJob, type JobName } from './jobs.js';

const SECRET = 'jobs-route-secret-0123456789abcdef0123456789';

/** The route's deps: `work` replaces the jobs' work; `rows` and `log` record what the route caused. */
function route(work: Partial<Record<JobName, JobWork>> = {}) {
  const rows: { job: string; trigger: string; outcome: string }[] = [];
  const repo: JobRunRepository = {
    insertJobRun: async (_tx, row) => { rows.push({ job: row.job, trigger: row.trigger, outcome: row.outcome }); },
    finishJobRun: async (_tx, _id, end) => { rows.at(-1)!.outcome = end.outcome; },
  };
  const clock = new VirtualClock(Date.parse('2026-10-01T15:00:00.000Z'));
  const runner = new JobRunner({ repo, locks: { tryHold: async () => ({ release: async () => undefined }) }, transactions: { run: async (fn) => fn({} as Tx) }, clock, ids: new SequentialIds('j') });
  const idle: JobWork = { singleFlight: 'runner', triggers: ['tick'], run: async () => ({ skipped: false, result: { done: true } }) };
  const lines: { message: string; data: Record<string, unknown> | undefined }[] = [];
  const log = { info: () => undefined, error: (message: string, data?: Record<string, unknown>) => { lines.push({ message, data }); } };
  const deps = {
    secret: SECRET, clock, runner, log,
    identity: new IdentityGateV2({} as IdentityGateDeps),
    work: Object.fromEntries(JOB_NAMES.map((j) => [j, work[j] ?? idle])) as Record<JobName, JobWork>,
  };
  const call = async (path: string, o: { method?: string; authorization?: string | null } = {}) => {
    const authorization = o.authorization === undefined ? `Bearer ${SECRET}` : o.authorization;
    const res = await serveJob(new Request(`http://localhost${path}`, { method: o.method ?? 'POST', headers: authorization === null ? {} : { authorization } }), deps);
    const text = await res.text();
    return { status: res.status, text, body: JSON.parse(text) as { job?: string; outcome?: string; result?: unknown; error?: { code: string; issues?: { field: string; issue: string }[] } } };
  };
  return { rows, lines, call };
}

describe('serveJob — every refusal comes before a run (S-9, AD-SYS-1)', () => {
  it('a missing or wrong bearer is 401 NotAuthenticated even for an unknown job, and nothing runs', async () => {
    const { rows, call } = route();
    for (const authorization of [null, 'Bearer wrong', `Basic ${SECRET}`]) {
      const res = await call('/api/jobs/nightly-everything?trigger=tick', { authorization });
      expect([res.status, res.body.error?.code]).toEqual([401, 'NotAuthenticated']);
    }
    expect(rows).toEqual([]);
  });

  it('a GET is 400 on the request; an unknown job is 404 on the field job without echoing the path; nothing runs', async () => {
    const { rows, call } = route();
    const get = await call('/api/jobs/trm-fetch?trigger=tick', { method: 'GET' });
    expect([get.status, get.body.error?.issues]).toEqual([400, [{ field: 'la solicitud', issue: 'usa POST' }]]);
    const unknown = await call('/api/jobs/drop-everything?trigger=tick');
    expect([unknown.status, unknown.body.error?.issues]).toEqual([404, [{ field: 'job', issue: 'no es una tarea programada' }]]);
    expect(unknown.text).not.toContain('drop-everything');
    expect(rows).toEqual([]);
  });

  it('a missing trigger, or one this job does not take, is 400 on trigger naming the triggers it takes', async () => {
    const nightly: JobWork = { singleFlight: 'runner', triggers: ['daily-night'], run: async () => ({ skipped: false, result: null }) };
    const { rows, call } = route({ 'expiry-materialize': nightly });
    for (const path of ['/api/jobs/expiry-materialize', '/api/jobs/expiry-materialize?trigger=tick', '/api/jobs/expiry-materialize?trigger=admin']) {
      const res = await call(path);
      expect([res.status, res.body.error?.issues]).toEqual([400, [{ field: 'trigger', issue: 'debe ser daily-night' }]]);
    }
    expect(rows).toEqual([]);
  });
});

describe('serveJob — the run becomes the answer', () => {
  it('a run is 200 with the job, its trigger, its run id, its outcome and its result; a trailing slash names the same job', async () => {
    const { rows, call } = route();
    const res = await call('/api/jobs/outbox-sweep/?trigger=tick');
    expect([res.status, res.body]).toEqual([200, { job: 'outbox-sweep', trigger: 'tick', runId: 'j00000000000000000000001', outcome: 'succeeded', result: { done: true } }]);
    expect(rows).toEqual([{ job: 'outbox-sweep', trigger: 'tick', outcome: 'succeeded' }]);
  });

  it('a failed run is 500 Unexpected whose body holds no trace of the error; the log names the run and the error code only', async () => {
    const broken: JobWork = { singleFlight: 'runner', triggers: ['tick'], run: async () => { throw new Error('connect ECONNREFUSED 10.0.0.7:5432'); } };
    const { rows, lines, call } = route({ 'trm-fetch': broken });
    const res = await call('/api/jobs/trm-fetch?trigger=tick');
    expect([res.status, res.body.error?.code]).toEqual([500, 'Unexpected']);
    expect(res.text).not.toMatch(/ECONNREFUSED|10\.0\.0\.7/);
    expect(rows).toEqual([{ job: 'trm-fetch', trigger: 'tick', outcome: 'failed' }]);
    expect(lines).toEqual([{ message: 'job.failed', data: { job: 'trm-fetch', trigger: 'tick', runId: 'j00000000000000000000001', errorCode: 'Unexpected' } }]);
  });
});
