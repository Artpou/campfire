---
title: Architecture
description: High-level overview of the Seedarr monorepo.
---

## Stack

| Layer | Technology |
| --- | --- |
| Package manager | pnpm workspaces + Turbo |
| API | Hono + TypeScript (port 3002) |
| Web app | React 19 + TanStack Router + Vite (port 3000) |
| Website | Astro + Starlight + Tailwind (port 4321) |
| Database | SQLite (libsql / better-sqlite3) |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS v4 (theme tokens per app) |
| Torrents | WebTorrent |
| Player | movi-player (WASM) |

## Monorepo layout

```text
apps/
├── api/       # Hono backend
├── web/       # React media app (+ local shadcn UI)
└── website/   # Landing + documentation (+ local UI)
packages/
├── contracts/ # Shared Zod DTOs
├── sdk/       # Hono RPC client
├── shared/    # Cross-app helpers
└── typescript-config/
```

## Domain flow

Browse TMDB → Search torrents → Start download (upserts Media + creates Download) → WebTorrent streams to disk → Play via progressive / direct streaming.

Integrations are **modules** under Settings (TMDB, indexers, storage, social). See [Modules](/guides/modules/) and [TMDB](/guides/tmdb/).

## Roles

`owner` > `admin` > `member` > `viewer`

Any authenticated user can list and stream downloads. Mutations that change torrent state or delete files require download ownership or admin.

See the root [`AGENTS.md`](https://github.com/Artpou/seedarr/blob/main/AGENTS.md) for the full domain model and coding patterns.
