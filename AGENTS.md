# AGENTS.md

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
 ├── size (bytes — from torrent.length on start, or remote listing on sync)
 ├── origin, quality, language (from torrent search metadata)
 ├── remoteLocation (optional — remote storage path)
 └── error: string | null

ActivityLog
 ├── userId FK → User
 ├── type: INFO | SUCCESS | WARNING | ERROR
 ├── action: USER_LOGIN | DOWNLOAD_START | ...
 ├── title, metadata (JSON)
 └── createdAt

MediaRequest
 ├── userId FK → User
 ├── mediaId FK → Media
 ├── status: pending | validated | cancelled
 ├── dismissed: boolean (legacy compat)
 └── createdAt

IndexerManager → multiple configs (Jackett, Prowlarr, Stremio addons/presets)
```

**Flow:** Browse TMDB → Search torrents → Start download (upserts Media + creates Download) → WebTorrent streams to disk → Play via `/streaming/:id/direct` (byte-range; movi-player handles MKV/HEVC natively).

### Request Management

Users can request media they want downloaded. Requests flow through statuses:
- **pending** → initial state, awaiting admin action or download
- **validated** → automatically set when the associated download completes, or manually by admin
- **cancelled** → admin rejects the request (can be reopened)

When a download completes (torrent finishes), all pending requests for that media are auto-validated (not deleted).

Routes: `GET /requests` (admin — all, filterable by type + status), `GET /requests/mine`, `GET /requests/user/:id`, `PATCH /:id/cancel`, `PATCH /:id/validate`, `PATCH /:id/reopen`, `DELETE /:id`.

### Letterboxd Sync

Users can import/sync their Letterboxd watchlist and ratings:
- Import pulls all rated/watched films from a Letterboxd username
- Sync refreshes existing data (new ratings, new films)
- Letterboxd username stored on user profile
- Media data (duration, categories, ratings) enriched during sync via TMDB

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
- Semicolons (Biome default / codebase convention)
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
│       ├── middlewares/    # Logger, rate limiter, timeout, error handler (CSRF via hono/csrf in app.ts)
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
pnpm dev          # Start both API + web 
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
- Guards: `authGuard` (session), `requireRole(min)`, `requireDownloadExists`, `requireDownloadOwner`, `requireRequestOwner`, `requireMediaExists`
- Validation: `zValidator("json" | "query" | "param", schema)`

### Auth

- First registration creates **owner**; subsequent registrations are forbidden
- Session cookie (httpOnly, 7 days)
- Role hierarchy: owner(4) > admin(3) > member(2) > viewer(1)
- **Viewer** can: browse media, access `/downloads`, play files, create/delete own requests
- **Member** can: all viewer actions + start downloads, search torrents, manage **own** downloads (pause/resume/delete/transfer)
- **Admin** can: all member actions + manage all requests (cancel/validate), manage users, mutate any download
- Session rotation after 24h + in-memory session cache (60s TTL; respects DB session expiry; cleared on role/password/delete)

### Shared library (household model)

Seedarr is designed for a **trusted household / self-hosted instance**:

- Any authenticated user can **list and stream** all downloads (read access is shared).
- File download tokens (`POST /downloads/:id/fileToken`) are available to any authenticated user for any existing download — intentional for shared playback.
- Profile media lists via `GET /media?userId=` (likes, watchlist, history, calendar) are visible to other authenticated users (no per-profile privacy flags).
- **Mutations** that change torrent state or delete files require **download ownership** (or admin).

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

- **API response types** (entities returned by endpoints): import from `@seedarr/sdk`
- **Request/query DTOs** (Zod inputs, enums): import from `@seedarr/contracts`
- **Never** recreate API types or import from `@seedarr/api` directly

### Database migrations

- Generated SQL lives in `apps/api/src/db/drizzle/` (tracked in git; may be ignored by Cursor indexing via `.cursorignore`)
- Use `pnpm db:generate` + `pnpm db:migrate` for schema changes; `pnpm db:push` is **dev only**

### Icons

- **Lucide React** with `Icon` suffix: `HomeIcon`, `SettingsIcon`

## AI Agent Constraints

- Run `pnpm check` to validate changes (lint, typecheck, tests)
- Keep internal reasoning brief. Focus directly on file modifications.
- Do not read unrelated files. Rely on exact file paths provided.
- Give the answer/code immediately. Explanations should follow, not precede.
- Do not repeat all provided code when making adjustments; show targeted diffs/snippets.
- Do not edit generated files (`routeTree.gen.ts`).