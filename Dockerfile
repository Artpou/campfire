# Stage 1: Base image
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Stage 2: Builder
FROM base AS builder
RUN apt-get update && apt-get install -y python3 make g++ cmake && rm -rf /var/lib/apt/lists/*

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

ENV HUSKY=0
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @seedarr/api build
RUN pnpm --filter @seedarr/api build:runtime
RUN pnpm --filter web build

RUN pnpm --filter @seedarr/api --prod deploy --legacy /app/isolated

# Stage 3: Runner
FROM node:20-slim AS runner
ARG VERSION=dev
ARG CHANNEL=beta
WORKDIR /app
ENV NODE_ENV=production
ENV SEEDARR_VERSION=$VERSION
ENV SEEDARR_CHANNEL=$CHANNEL

LABEL org.opencontainers.image.version=$VERSION
LABEL org.opencontainers.image.source=https://github.com/Artpou/seedarr

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/isolated ./
COPY --from=builder /app/apps/api/dist-server ./dist-server
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/apps/api/src/db ./src/db
COPY --from=builder /app/apps/api/src/modules ./src/modules
COPY --from=builder /app/apps/web/dist ./web/dist

EXPOSE 3002

CMD ["sh", "-c", "./node_modules/.bin/drizzle-kit migrate && node dist-server/server.mjs"]
