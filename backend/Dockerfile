# The TEZG service image: Next.js standalone output plus the migration runner. Built and started
# by `docker compose up` (docker-compose.yml), which migrates the database before serving.
FROM node:22.12.0-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# postinstall (prisma generate, the lint toolchain) is a development convenience; the build
# generates the Prisma client itself once the schema is copied in.
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate && npx next build

FROM node:22.12.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
# The standalone server already carries pg and the migration SQL (next.config.ts traces both).
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/scripts/db-migrate.mjs ./scripts/
COPY --from=build /app/scripts/lib/migrations.mjs ./scripts/lib/
USER node
EXPOSE 3000
CMD ["sh", "-c", "node scripts/db-migrate.mjs && exec node server.js"]
