# CLAUDE.md

> Single source of truth for Cursor, Claude Code, and Gemini AI agents.

## Project Vision

**Seedarr** — a self-hosted media manager inspired by Stremio/Overseerr. Browse TMDB catalog, search torrents via Jackett/Prowlarr, download and stream movies/TV shows in real-time with subtitle support.

## Domain Model

```
User (owner|admin|member|viewer)
 ├── Session (7-day token, httpOnly cookie)
 ├── likes → Media[]
 ├── watchList → Media[]
 ├── watchProgress → { mediaId, position, duration, completed, downloadId }
 └── downloads → Download[]

Media (PK = TMDB id)
 ├── type: movie | tv
 ├── metadata: title, poster, backdrop, release_date, duration, categories...
 └── enriched at read time: likes count, watchlist count, latest download, progress

Download
 ├── userId FK → User
 ├── mediaId FK → Media (set on creation via TMDB upsert)
 ├── torrent: JSON blob (TorrentLiveData — progress, speed, files, peers...)
 ├── origin, quality, language (from torrent search metadata)
 └── error: string | null

ActivityLog
 ├── userId FK → User
 ├── type: INFO | SUCCESS | WARNING | ERROR
 ├── action: USER_LOGIN | DOWNLOAD_START | ...
 ├── title, metadata (JSON)
 └── createdAt

IndexerManager → multiple configs (Jackett, Prowlarr, Stremio addons/presets)
```

**Flow:** Browse TMDB → Search torrents → Start download (upserts Media + creates Download) → WebTorrent streams to disk → Play via `/streaming/:id/direct` (byte-range; movi-player handles MKV/HEVC natively).

## Tech Stack

- **Package Manager**: pnpm v11+ (workspaces + catalog)
- **Monorepo**: Turbo
- **Runtime**: Node.js v22+ (tsx for API)
- **API**: Hono with TypeScript (port 3002)
- **Web**: React 19 + TanStack Router + Vite (port 3000)
- **Database**: SQLite — libsql (prod), better-sqlite3 (tests)
- **ORM**: Drizzle ORM + drizzle-zod
- **Validation**: Zod with `@hono/zod-validator`
- **Styling**: Tailwind CSS v4 + Radix UI primitives (shadcn pattern)
- **State**: TanStack Query (server) + Zustand (auth + user preferences)
- **Torrent**: WebTorrent
- **Video Player**: movi-player (WASM — native MKV/HEVC/AV1/HDR in browser)
- **Live remux** (optional): ffmpeg for progressive MP4 while downloading
- **Linting**: Biome (not ESLint/Prettier)
- **i18n**: Lingui v5 (en, fr)
- **Testing**: Vitest (API route + integration tests, web route helper tests)

## Coding Standards

### TypeScript

- Strict mode enabled
- **Never use `any`** — use `unknown` if type is truly unknown
- Import types and API client from `@seedarr/sdk` in frontend
- Infer types from Zod schemas: `z.infer<typeof schema>`
- Explicit return types on all service methods

### Code Style (Biome)

- 2 space indentation
- 120 character line width
- No semicolons
- Double quotes for strings

### File Naming

- `kebab-case` for files: `user-service.ts`, `movie-card.tsx`
- `PascalCase` for components: `MovieCard`, `Button`
- `camelCase` for functions/variables
- `SCREAMING_SNAKE_CASE` for constants
- Feature folders: singular noun (`media/`, `auth/`)

### Patterns

- Functional components with hooks
- Tailwind-first styling (no inline styles)
- Small, focused components — extract reusable logic into hooks
- Use `cn()` for conditional classes

## Project Structure

```
apps/
├── api/                    # Hono backend
│   └── src/
│       ├── modules/        # Feature modules
│       │   └── [module]/
│       │       ├── [module].schema.ts   # Drizzle table + types
│       │       ├── [module].route.ts    # Route definitions
│       │       ├── [module].service.ts  # Business logic
│       │       └── [module].route.test.ts
│       ├── helpers/        # Shared utilities
│       ├── errors/         # HTTPException subclasses in single file (401/403/404/400/409/503)
│       ├── middlewares/    # Logger, rate limiter, CSRF, error handler
│       ├── auth/           # Password (scrypt) + session utils
│       └── db/             # Drizzle config, schema aggregation, migrations
└── web/                    # React frontend
    └── src/
        ├── features/       # Feature modules (media, movies, tv, torrent, downloads, subtitles, user, indexers-manager, settings)
        │   └── [feature]/
        │       ├── components/
        │       ├── hooks/          # *.queries.ts (queryOptions + mutations)
        │       └── helpers/        # Pure helpers (role, formatting...)
        ├── shared/         # UI primitives (shadcn), app-topbar, hooks, helpers
        ├── routes/         # TanStack Router file-based routes
        └── lib/            # Core utilities (cn)
packages/
├── sdk/                    # @seedarr/sdk — Hono RPC client, unwrap, types re-export
├── contracts/              # @seedarr/contracts — dtos shared between api and app
└── shared/                 # @seedarr/shared — formatBytes, formatTime, presets, slugify, toLatin
```

## Dev Workflow

```bash
pnpm dev          # Start both API + web (+ Drizzle Studio)
pnpm --filter @seedarr/api dev   # API only (port 3002)
pnpm --filter @seedarr/web dev            # Web only (port 3000)
pnpm check        # Full validation: lint + check-types + test + knip
pnpm lint:fix     # Auto-fix with Biome
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Apply migrations
pnpm db:push      # Push schema directly (dev only)
pnpm --filter @seedarr/api db:studio   # Open Drizzle Studio
```

## API Patterns

### Service Hierarchy

```
AuthenticatedService        → user in context, createRouter() factory
├── IdentifiableService<T>  → get/getMany/list with pagination
│   ├── DownloadService, MediaService, UserService, IndexerManagerService
│   └── TMDBService<S>      → MovieService, TVService (createTMDBRouter)
├── ActivityLogService, StorageConfigService
└── TorrentService, SubtitleService
```

`createRouter()` applies `authGuard` + injects `c.var.service` automatically.

### DTO Pattern

Use @seedarr/contracts to share dto between app and api

### Route Conventions

- RESTful: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`
- Guards: `authGuard` (session), `requireRole(min)`, `requireDownloadOwnership`
- Validation: `zValidator("json" | "query" | "param", schema)`

### Auth

- First registration creates **owner**; subsequent registrations are forbidden
- Session cookie (httpOnly, 7 days)
- Role hierarchy: owner(4) > admin(3) > member(2) > viewer(1)
- Session rotation after 24h + in-memory session cache (60s TTL)

## Frontend Patterns

### Routing

- File-based: `_app.*` (authenticated), `_auth.*` (public)
- Auth check in `_app.tsx` `beforeLoad` → redirect `/login`
- Prefer wrapping route content in `<Container>` (some pages like discover use custom layouts)

### Data Layer

- `unwrap(api.endpoint.$method(params))` for all API calls (queries **and** mutations)
- Colocated `*.queries.ts` per feature (queryOptions + mutations)
- Colocated query keys per feature: `mediaQueries.key`, `downloadQueries.key`, `movieQueries.key`, etc.

### Type Imports

- **Always** import from `@seedarr/sdk` and `@seedarr/contracts`
- **Never** recreate API types or import from `@seedarr/api` directly

### Icons

- **Lucide React** with `Icon` suffix: `HomeIcon`, `SettingsIcon`

## AI Agent Constraints

- Use `pnpm check` globally without `cd` if you need to check something (lint, test...)
- Keep your internal reasoning/thoughts brief. Focus directly on targeted file modifications.
- Do not read unrelated files. Rely on exact file paths provided by the user.
- Be casual unless otherwise specified
- Suggest solutions that I didn’t think about—anticipate my needs
- Treat me as an expert
- Be accurate and thorough
- Give the answer immediately. Provide detailed explanations and restate my query in your own words if necessary after giving the answer
- Consider new technologies and contrarian ideas, not just the conventional wisdom
- You may use high levels of speculation or prediction, just flag it for me
- If your content policy is an issue, provide the closest acceptable response and explain the content policy issue afterward
- No need to mention your knowledge cutoff
- No need to disclose you’re an AI
- Split into multiple responses if one response isn’t enough to answer the question.
- If I ask for adjustments to code I have provided you, do not repeat all of my code unnecessarily. Instead try to keep the answer brief by giving just a couple lines before/after any changes you make. Multiple code blocks are ok.
