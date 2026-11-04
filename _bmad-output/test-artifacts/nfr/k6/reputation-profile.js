// k6 load at a fixed arrival rate on the public reads (Story 13.5, decision log Impl-2 #18 and #21; test-design.md
// §7.4; NFR-REP-2, NFR-SYS-9), against the production build serving the PRD §3 seed (`npm run nfr:k6`). Two
// constant-arrival-rate scenarios, one per endpoint and tagged by it: 100 iterations a second each for 60 s (6,000 per
// endpoint, 12,000 in all), each iteration one request, so the load is a defined rate rather than whatever a
// closed-loop burst reaches on the machine. `profile` reads one reviewed seller's profile (`reputation.profile`, the
// aggregate and its first page), round-robin over the 68; `browse` reads one catalog page (`catalog.browse`, pages
// 1-20). Each scenario starts 25 VUs and may grow to 50 (100 in all). No sleep: k6 starts iterations on its schedule.
// A starved run (the machine cannot keep the rate with 50 VUs per endpoint) drops iterations, and the
// `dropped_iterations` thresholds (< 1 % of the planned iterations) fail it rather than let a lighter load pass.
// `setup()` warms the freshly started server first (its first requests and its database pool), with 25 concurrent
// reads of each endpoint five times over, tagged `endpoint:warmup` so the per-endpoint figures leave them out: without
// it the first second's cold answers hold all 50 VUs and drop about 60 iterations per endpoint at the start alone.
/* global __ENV -- k6's runtime global: the environment. */
import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3200';

/** The seed's fixed ids (test-support/ids.ts): the name, an `x`, then zeros to 24 characters. */
const seedId = (name) => `${name}x`.padEnd(24, '0');
/** The seed's 68 reviewed sellers: 8 businesses and 60 individual sellers (test-support/solu2/seed-marketplace.ts). */
const SELLERS = [
  ...Array.from({ length: 8 }, (_, b) => seedId(`biz${b}`)),
  ...Array.from({ length: 60 }, (_, i) => seedId(`indiv${i}`)),
];

/** Counts every answer, and adds 1 for each 5xx, so the per-endpoint threshold always has samples. */
const serverErrors = new Counter('server_errors_5xx');

/** The fixed rate: per endpoint, RATE iterations a second for DURATION_S seconds; the dropped-iteration budget is 1 %. */
const RATE = 100;
const DURATION_S = 60;
const PLANNED = RATE * DURATION_S;
const DROPPED_BUDGET = PLANNED / 100;

/** One endpoint's scenario: its exported function of the same name, at the fixed rate, its metrics tagged by it. */
const atRate = (endpoint) => ({
  executor: 'constant-arrival-rate',
  exec: endpoint,
  rate: RATE,
  timeUnit: '1s',
  duration: `${DURATION_S}s`,
  preAllocatedVUs: 25,
  maxVUs: 50,
  tags: { endpoint },
});

export const options = {
  scenarios: {
    profile: atRate('profile'),
    browse: atRate('browse'),
  },
  // The warm-up's http.batch sends its 50 reads at once (k6's default is 6 a host).
  batch: 50,
  batchPerHost: 50,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    'http_req_duration{endpoint:profile}': ['p(95)<300', 'p(99)<800'],
    'http_req_duration{endpoint:browse}': ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
    'http_req_failed{endpoint:profile}': ['rate<0.01'],
    'http_req_failed{endpoint:browse}': ['rate<0.01'],
    'http_reqs{endpoint:profile}': ['count>0'],
    'http_reqs{endpoint:browse}': ['count>0'],
    server_errors_5xx: ['count==0'],
    'server_errors_5xx{endpoint:profile}': ['count==0'],
    'server_errors_5xx{endpoint:browse}': ['count==0'],
    dropped_iterations: [`count<${2 * DROPPED_BUDGET}`],
    'dropped_iterations{scenario:profile}': [`count<${DROPPED_BUDGET}`],
    'dropped_iterations{scenario:browse}': [`count<${DROPPED_BUDGET}`],
  },
};

const query = (procedure, input) => `${BASE_URL}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`;

function read(endpoint, url) {
  const res = http.get(url, { tags: { endpoint } });
  serverErrors.add(res.status >= 500 ? 1 : 0, { endpoint });
  check(res, { [`${endpoint} answers 200`]: (r) => r.status === 200 }, { endpoint });
  return res;
}

/** The warm-up before the scenarios: WARMUP_ROUNDS batches of 25 concurrent reads of each endpoint (50 at once), in turn. */
const WARMUP_ROUNDS = 5;
export function setup() {
  const tags = { endpoint: 'warmup' };
  for (let round = 0; round < WARMUP_ROUNDS; round += 1) {
    http.batch(Array.from({ length: 50 }, (_, i) => {
      const n = round * 25 + (i >> 1);
      return i % 2 === 0
        ? ['GET', query('reputation.profile', { userId: SELLERS[n % SELLERS.length], page: 1 }), null, { tags }]
        : ['GET', query('catalog.browse', { filters: {}, page: 1 + (n % 20), pageSize: 24 }), null, { tags }];
    }));
  }
}

/** One reviewed seller's profile per iteration, round-robin over the 68 by the scenario's iteration number. */
export function profile() {
  const n = exec.scenario.iterationInTest;
  read('profile', query('reputation.profile', { userId: SELLERS[n % SELLERS.length], page: 1 }));
}

/** One catalog page per iteration, pages 1-20 in turn. */
export function browse() {
  const n = exec.scenario.iterationInTest;
  read('browse', query('catalog.browse', { filters: {}, page: 1 + (n % 20), pageSize: 24 }));
}
