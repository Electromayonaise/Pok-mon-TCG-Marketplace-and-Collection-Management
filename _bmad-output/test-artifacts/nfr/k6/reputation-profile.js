// k6 burst on the public reads (Story 13.5, decision log Impl-2 #18; test-design.md §7.4; NFR-REP-2, NFR-SYS-9):
// 50 virtual users for a minute against the production build serving the PRD §3 seed (`npm run nfr:k6`). Each
// iteration reads one reviewed seller's profile (`reputation.profile`, the aggregate and its first page) and one
// catalog page (`catalog.browse`), tagged by endpoint. No sleep: the ramping-vus executor sets the load, and each
// user sends its next request when the last one answers, so the figures are latency under a closed-loop burst.
/* global __ENV, __VU, __ITER -- k6's runtime globals: the environment, the virtual user and its iteration. */
import http from 'k6/http';
import { check } from 'k6';
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

export const options = {
  scenarios: {
    burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '40s', target: 50 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
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
  },
};

const query = (procedure, input) => `${BASE_URL}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`;

function read(endpoint, url) {
  const res = http.get(url, { tags: { endpoint } });
  serverErrors.add(res.status >= 500 ? 1 : 0, { endpoint });
  check(res, { [`${endpoint} answers 200`]: (r) => r.status === 200 }, { endpoint });
  return res;
}

export default function () {
  const n = __VU * 1_000 + __ITER;
  read('profile', query('reputation.profile', { userId: SELLERS[n % SELLERS.length], page: 1 }));
  read('browse', query('catalog.browse', { filters: {}, page: 1 + (n % 20), pageSize: 24 }));
}
