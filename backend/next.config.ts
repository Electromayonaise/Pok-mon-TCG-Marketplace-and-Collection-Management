// Next.js configuration. The app is API-only until the front-end phase (decision log #3): route
// handlers under app/api serve tRPC and the health probes. `standalone` gives the Docker image a
// self-contained server; the readiness probe reads the migration files at run time, so they are
// traced into it explicitly.
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: { '/api/health/ready': ['./_bmad-output/planning-artifacts/detailed-design/schemas/*.sql'] },
};

export default config;
