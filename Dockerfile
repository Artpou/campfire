# Stage 1: Base image
FROM node:22-slim AS base
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

ENV HUSKY=0
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @seedarr/api build
RUN pnpm --filter @seedarr/web build

RUN pnpm --filter @seedarr/api --prod deploy --legacy /app/isolated

# Stage 3: Runner
FROM node:22-slim AS runner
ARG VERSION=dev
ARG CHANNEL=beta
WORKDIR /app
ENV NODE_ENV=production
ENV SEEDARR_VERSION=$VERSION
ENV SEEDARR_CHANNEL=$CHANNEL
ENV WEB_DIST_PATH=/app/web/dist

LABEL org.opencontainers.image.version=$VERSION
LABEL org.opencontainers.image.source=https://github.com/Artpou/seedarr

# Static ffmpeg (~50 MB) instead of apt packages (~250–500 MB of shared libs)
COPY --from=mwader/static-ffmpeg:8.1.1 /ffmpeg /usr/local/bin/
COPY --from=mwader/static-ffmpeg:8.1.1 /ffprobe /usr/local/bin/

# Runtime dirs for DB + downloads (named volumes); app files owned by non-root `node`
RUN mkdir -p /data /downloads && chown -R node:node /app /data /downloads

COPY --from=builder --chown=node:node /app/isolated ./
COPY --from=builder --chown=node:node /app/apps/api/dist-server ./dist-server
COPY --from=builder --chown=node:node /app/apps/api/src/db/drizzle ./src/db/drizzle
COPY --from=builder --chown=node:node /app/apps/web/dist ./web/dist
COPY --from=builder --chown=node:node /app/apps/api/docker-migrate.mjs ./docker-migrate.mjs

USER node

EXPOSE 3002

CMD ["sh", "-c", "node docker-migrate.mjs && exec node dist-server/server.js"]
