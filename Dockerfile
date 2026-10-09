FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
ENV HUSKY=0 NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
COPY . .
RUN pnpm install --frozen-lockfile

# Explicitly invoked by the operator, never during the application build/start.
FROM dependencies AS migrate
CMD ["pnpm", "--filter", "@workspace/db", "exec", "prisma", "migrate", "deploy"]

FROM dependencies AS build
ARG BASE_URL=http://localhost:3000
ARG NEXT_PUBLIC_STORAGE_BASE_URL=/api/storage/uploads
ARG NEXT_PUBLIC_FF_API_ORIGIN=http://localhost:3000
ENV BASE_URL=${BASE_URL} \
    BETTER_AUTH_URL=${BASE_URL} \
    NEXT_PUBLIC_STORAGE_BASE_URL=${NEXT_PUBLIC_STORAGE_BASE_URL} \
    NEXT_PUBLIC_FF_API_ORIGIN=${NEXT_PUBLIC_FF_API_ORIGIN} \
    NEXT_PUBLIC_IS_CLOUD=false \
    STORAGE_PROVIDER=local
RUN pnpm build:packages && pnpm --filter @workspace/db db:gen && pnpm --filter web build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN mkdir -p /data/storage && chown node:node /data/storage
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
