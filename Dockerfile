# Stage 1: Base image (Shared)
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
ENV HUSKY=0
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @basement/api build
RUN pnpm --filter web build

# Stage 3: Runner
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/drizzle.config.ts ./apps/api/drizzle.config.ts
COPY --from=builder /app/apps/api/src ./apps/api/src
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist

EXPOSE 3002

WORKDIR /app/apps/api

CMD ["sh", "-c", "./node_modules/.bin/drizzle-kit push && ./node_modules/.bin/tsx src/server.ts"]