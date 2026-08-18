# Contributing to Seedarr

Thank you for your interest in contributing! This guide covers how to set up the development environment, understand the project structure, and follow our coding standards.

## Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/) v9.0.0 or higher
- (Optional) [FFmpeg](https://ffmpeg.org/) for live remux of progressive MP4 while downloading
- (Optional) A [TMDB API key](https://www.themoviedb.org/settings/api) — configure via **Settings → Modules** (or `TMDB_API_KEY` in `.env`)
- (Optional) A Prowlarr, Jackett, or Torrentio setup for torrent search

## Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/Artpou/seedarr.git
   cd seedarr
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env` and fill in the values you need:

   ```bash
   cp .env.example .env
   ```

   At minimum for local development:

   ```env
   API_PORT=3002
   WEB_URL=http://localhost:3000
   VITE_API_URL=http://localhost:3002
   TMDB_API_KEY=your_tmdb_api_key_here
   ```

4. **Initialize the database**

   ```bash
   pnpm db:push
   ```

5. **Start the development servers**

   ```bash
   pnpm dev
   ```

   The application will be available at:
   - **Web**: http://localhost:3000
   - **API**: http://localhost:3002
   - **Website** (landing + docs): `pnpm --filter @seedarr/website dev` → http://localhost:4321

## Tech Stack

- **Frontend**: React 19 + TanStack Router + Vite
- **Website**: Astro + Starlight + Tailwind (landing & documentation)
- **Backend**: Hono + Node.js (tsx runtime)
- **Database**: SQLite with Drizzle ORM
- **Styling**: Tailwind CSS v4 + Radix UI
- **Type Safety**: TypeScript with Zod validation
- **Package Manager**: pnpm (workspaces + Turbo)
- **Linting**: Biome
- **Torrent**: WebTorrent
- **i18n**: Lingui v5 (en, fr)
- **Testing**: Vitest (API route tests + web route helper tests)

## Project Structure

```
.
└── apps/
    ├── api/                      # Hono backend (port 3002)
    │   └── src/
    │       ├── auth/             # Authentication utilities
    │       ├── db/               # Database schema & migrations
    │       ├── helpers/          # Utility functions
    │       ├── modules/          # Feature modules (routes & services)
    │       └── server.ts         # Hono app entry point
    │
    ├── web/                      # React frontend (port 3000)
    │   ├── public/               # Static assets
    │   └── src/
    │       ├── features/         # Feature-based modules
    │       ├── shared/           # Shared components and utilities (incl. shadcn UI)
    │       ├── routes/           # TanStack Router file-based routes
    │       ├── lib/              # Core utilities (cn)
    │       └── locales/          # i18n translations (en, fr)
    │
    └── website/                  # Landing page + Starlight docs (port 4321)

packages/
├── sdk/                          # @seedarr/sdk — Hono RPC client & types
├── contracts/                    # @seedarr/contracts — shared Zod DTOs between API and web
└── shared/                       # @seedarr/shared — cross-app utilities
```

### Key Directories

- **`apps/api/src/modules/`** — Each module contains routes, services, DTOs, and schema for a specific feature
- **`apps/web/src/features/`** — Feature-based architecture with components, hooks, and helpers co-located
- **`apps/web/src/shared/`** — Reusable components and utilities used across features
- **`apps/web/src/routes/`** — TanStack Router file-based routing (`_app.*` authenticated, `_auth.*` public)
- **`apps/website/`** — Public landing page and documentation site
- **`packages/contracts/`** — Request/query Zod DTOs shared by API validation and the web client
- **`packages/sdk/`** — Typed Hono RPC client (`unwrap`, response types) — import this from the frontend, never `@seedarr/api`

## Development Commands

```bash
# Run both API and web 
pnpm dev

# Run API only
pnpm --filter @seedarr/api dev

# Run web only
pnpm --filter @seedarr/web dev

# Full validation (run before committing)
pnpm check

# Lint all packages
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Type check
pnpm check-types

# Run tests
pnpm test

# Database commands
pnpm db:generate    # Generate migrations
pnpm db:push        # Push schema to database (dev only)
pnpm db:migrate     # Apply migrations
pnpm --filter @seedarr/api db:studio   # Open Drizzle Studio
```

**Always run `pnpm check` before submitting a pull request.**

## Coding Standards

### TypeScript

- Strict mode enabled
- Never use `any` — use `unknown` if the type is truly unknown
- Import types and API client from `@seedarr/sdk` in the frontend
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
- `camelCase` for functions and variables
- `SCREAMING_SNAKE_CASE` for constants
- Feature folders: singular noun (`media/`, `auth/`)

### Patterns

- Functional components with hooks
- Tailwind-first styling (no inline styles)
- Small, focused components — extract reusable logic into hooks
- Use `cn()` for conditional classes
- API types always come from `@seedarr/sdk`, never from `@seedarr/api` directly
- Lucide React icons with `Icon` suffix: `HomeIcon`, `SettingsIcon`

## Configuration

See [`.env.example`](.env.example) for all available environment variables.

For Docker deployment, refer to [`docker-compose.yml`](docker-compose.yml) and the [`Dockerfile`](Dockerfile).

## Submitting Changes

1. Create a branch for your change
2. Make your changes following the coding standards above
3. Run `pnpm check` to ensure everything passes
4. Open a pull request with a clear description of what changed and why

For architecture details and API patterns, see [`AGENTS.md`](AGENTS.md).
