# CLAUDE.md

> Single source of truth for Cursor, Claude Code, and Gemini AI agents.

## Project Vision

Torrent streaming app with real-time playback, media library management, and Plex integration.

## Tech Stack

- **Package Manager**: pnpm v9.0.0+
- **Runtime**: Node.js v18+ (tsx for API)
- **API**: Hono with TypeScript (port 3002)
- **Web**: React 19 + TanStack Router + Vite (port 3000)
- **Database**: SQLite with Drizzle ORM
- **Validation**: Zod with `@hono/zod-validator`
- **Styling**: Tailwind CSS v4 + Radix UI
- **State**: Zustand (persist middleware) + TanStack Query
- **Torrent**: WebTorrent for downloads and streaming
- **Video Player**: Plyr
- **Linting**: Biome (not ESLint/Prettier)
- **i18n**: Lingui

## Coding Standards

### TypeScript

- Strict mode enabled
- **Never use `any`** - use `unknown` if type is truly unknown
- Import types from `@basement/api/types` in frontend
- Infer types from Zod schemas: `z.infer<typeof schema>`
- Explicit return types on all service methods

### Code Style (Biome)

- 2 space indentation
- 100 character line width
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
- Small, focused components
- Extract reusable logic into hooks
- Use `cn()` for conditional classes

## Project Structure

```
apps/
├── api/                    # Hono backend
│   └── src/
│       ├── modules/        # Feature modules (auth, media, torrent, download)
│       │   └── [module]/
│       │       ├── [module].dto.ts      # Zod schemas + types
│       │       ├── [module].route.ts    # Route definitions
│       │       └── [module].service.ts  # Business logic
│       ├── helpers/        # Shared utilities
│       └── db/             # Drizzle schema + migrations
└── web/                    # React frontend
    └── src/
        ├── features/       # Feature modules
        │   └── [feature]/
        │       ├── components/
        │       ├── hooks/
        │       └── [feature]-store.ts
        ├── shared/         # Shared UI + hooks
        ├── routes/         # TanStack Router file-based routes
        └── lib/            # Core utilities (api.ts, utils.ts)
```

## Dev Workflow

### Commands

```bash
pnpm dev          # Start both API and web
pnpm dev:api      # API only (port 3002)
pnpm dev:web      # Web only (port 3000)
pnpm check        # Full validation (lint:fix + type-check + lint)
pnpm lint         # Check linting
pnpm lint:fix     # Auto-fix linting
pnpm type-check   # TypeScript validation
pnpm format       # Format with Biome
```

### Database

```bash
pnpm db:generate  # Generate migrations
pnpm db:migrate   # Apply migrations
pnpm db:push      # Push schema (dev only)
pnpm db:studio    # Open Drizzle Studio
```

### i18n

```bash
cd apps/web
pnpm lingui:extract   # Extract messages
pnpm lingui:compile   # Compile messages
```

## Pre-Commit Checklist

**Always run `pnpm check` before committing.**

- [ ] No TypeScript errors
- [ ] Linting passes
- [ ] No `console.log` in production code
- [ ] No `any` types
- [ ] Sensitive data not exposed
- [ ] `crossOrigin="anonymous"` on video elements
- [ ] Subtitles served as VTT format

## API Patterns

### DTO Pattern

Each module **must** have a `{module}.dto.ts` file containing:

- **Zod schemas** for validation (request/response)
- **TypeScript types** inferred from schemas
- **Database types** using drizzle-zod's `createSelectSchema` and `createInsertSchema`

### Type Exports

- **`schema.ts`**: Only export table definitions and enums (e.g., `IndexerType`, `UserRole`)
- **`{module}.dto.ts`**: Export all types and schemas for the module
- **`types.ts`**: Re-export only TypeScript types (not Zod schemas) for frontend consumption

### Service Pattern

- Extend `AuthenticatedService` for services needing database/user access
- Use dependency injection via context
- Keep services focused on business logic
- Handle errors appropriately
- Import types from DTOs, not from schema
- **Always add explicit return types to all service methods**

```typescript
export class MediaService extends AuthenticatedService {
  async getById(id: number): Promise<Media | null> {
    return await this.db.select().from(media).where(eq(media.id, id)).get();
  }
}
```

### Route Definition

```typescript
export const mediaRoutes = new Hono<{ Variables: HonoVariables }>()
  .use("*", authGuard)
  .get("/", zValidator("query", listSchema), async (c) => {
    return c.json(await Service.fromContext(c).list(c.req.valid("query")));
  });
```

### Route Conventions

- Use RESTful conventions:
  - `GET /resource` - List resources
  - `GET /resource/:id` - Get single resource
  - `POST /resource` - Create resource
  - `PATCH /resource/:id` - Update resource
  - `DELETE /resource/:id` - Delete resource
- Group related routes in modules
- Apply middleware at appropriate levels
- Return appropriate HTTP status codes
- Use the centralized pagination module for consistent paginated responses

## Frontend Patterns

### Routing (TanStack Router)

- File-based routes in `src/routes/`
- Route groups: `_app.*` (authenticated), `_auth.*` (public)
- Use `beforeLoad` for auth checks and redirects
- Protected routes check auth via `api.auth.me.$get()`
- Wrap route content in `<Container>` component for consistent layout and spacing

### API Client (Hono RPC)

- Use Hono RPC client: `hc<AppType>(baseUrl, options)`
- Type-safe client from `AppType` export: `api.[module].[endpoint].$method()`
- Methods: `$get()`, `$post()`, `$put()`, `$delete()`, `$patch()`
- **Use `unwrap()` helper** from `lib/api.ts` for all API calls
- Pattern: `unwrap(api.endpoint.$method(params))`
- Let React Query handle errors (don't use try-catch unless specific fallback needed)

```typescript
import { api, unwrap } from "@/lib/api";

const { data } = useQuery({
  queryKey: ["media", id],
  queryFn: () => unwrap(api.media[":id"].$get({ param: { id } })),
});
```

### Type Imports

- **Always** import types from `@basement/api/types`
- **Never** recreate types that exist in the API
- **Never** define inline types for API data structures
- **Use** existing DTO types for mutations and queries

```typescript
import type { Media, Torrent } from "@basement/api/types";
```

### Icons

- Use **Lucide React** for icons
- Use `Icon` suffix for icons: `HomeIcon`, `SettingsIcon`, `UserIcon`
