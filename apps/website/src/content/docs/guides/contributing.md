---
title: Contributing
description: Set up the development environment and contribute to Seedarr.
---

Thank you for your interest in contributing! This guide covers how to set up the development environment and follow project conventions.

## Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/) v9.0.0 or higher
- (Optional) [FFmpeg](https://ffmpeg.org/) for live remux of progressive MP4 while downloading
- (Optional) A [TMDB API key](https://www.themoviedb.org/settings/api)
- (Optional) A Prowlarr or Jackett instance for torrent search

## Development setup

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

   Copy `.env.example` to `.env` and fill in the values you need. At minimum:

   ```bash
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

   - **Web**: http://localhost:3000
   - **API**: http://localhost:3002
   - **Website** (docs + landing): `pnpm --filter @seedarr/website dev` → http://localhost:4321

## Commands

```bash
pnpm check          # lint + types + tests + knip
pnpm lint:fix      # auto-fix with Biome
pnpm db:generate    # generate Drizzle migrations
pnpm db:migrate     # apply migrations
```

**Always run `pnpm check` before submitting a pull request.**

## Coding standards

- TypeScript strict mode — never use `any`
- Biome for lint/format (2-space indent, 120 cols, double quotes)
- `kebab-case` files, `PascalCase` components
- API types from `@seedarr/sdk`; request DTOs from `@seedarr/contracts`
- UI primitives stay app-local (`apps/web/src/shared/ui`, `apps/website/src/components/ui`)

For architecture details, see [Architecture](/reference/architecture/) and [`AGENTS.md`](https://github.com/Artpou/seedarr/blob/main/AGENTS.md) in the repository.
