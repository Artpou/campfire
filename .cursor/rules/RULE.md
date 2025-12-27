---
alwaysApply: true
---

# Campfire Project Rules

## Tech Stack

- **Runtime**: Bun (v1.3.1+)
- **API**: Elysia (v1.4.19) with TypeScript
- **Web**: React 19 + TanStack Router + Vite
- **Database**: SQLite with Drizzle ORM
- **Validation**: TypeBox (@sinclair/typebox)
- **Styling**: Tailwind CSS v4 + Radix UI
- **i18n**: Lingui
- **State**: Zustand with persist middleware
- **Linting**: Biome (not ESLint/Prettier)

## Project Structure

- **Monorepo**: Bun workspaces with 3 packages
  - `apps/api` - Elysia backend
  - `apps/web` - React frontend
  - `packages/validators` - Shared TypeBox schemas
- **Aliases**: Use `@/` for local imports, `@basement/` for workspace packages

## API Patterns (Elysia)

### Route Structure

- Group routes by feature in `modules/[feature]/[feature].route.ts`
- Use `.use(authGuard())` for protected routes
- Export as `[feature]Routes` and register in `server.ts`

### Service Pattern

- Extend `AuthenticatedService` for user-scoped services
- Services receive `user` in constructor: `new Service(user)`
- Use Drizzle query builder, not raw SQL
- Keep business logic in services, not routes

### Authentication

- Session-based with httpOnly cookies (`session` cookie name)
- Password format: `salt:hash` (custom util, not bcrypt)
- Auth guard returns `{ user }` in route context
- Session validation via `validateSession(token)`

### Validation

- Define schemas in `packages/validators` using TypeBox
- Import and use in route body/query validation
- Share types between API and web via `Static<typeof schema>`

### Response Format

- Return data directly (no wrapper objects)
- Let Elysia handle errors and status codes
- Use `throw new Error()` for errors (caught by `.onError()`)

## Web Patterns (React)

### Routing (TanStack Router)

- File-based routes in `src/routes/`
- Route groups: `_app.*` (authenticated), `_auth.*` (public)
- Use `beforeLoad` for auth checks and redirects
- Protected routes check auth via `api.auth.me.get()`

### API Client

- Use Elysia Eden Treaty: `api.[module].[endpoint].[method]()`
- Type-safe client from `App` type export
- Always include `credentials: "include"` for cookies
- Base URL from `VITE_API_URL` env var

### Components

- Radix UI primitives in `components/ui/`
- Feature components in `components/[feature]/`
- Use `cn()` utility for className merging
- Variants via `class-variance-authority` (cva)

### State Management

- Zustand stores in `stores/[feature]-store.ts`
- Use `persist` middleware for localStorage
- Auth state in `useAuthStore` (synced with API)

### Styling

- Tailwind v4 (no config file, use `@theme` in CSS)
- Design tokens via CSS variables in `styles.css`
- Dark mode support via `dark:` prefix
- Use `cn()` from `lib/utils.ts` for conditional classes

### i18n

- Lingui for translations
- Locale files in `src/locales/[lang]/messages.po`
- Use `<Trans>` component or `t` macro
- Compile messages before build: `bun lingui:compile`

## Database (Drizzle)

### Schema

- Define in `apps/api/src/db/schema.ts`
- Use SQLite-specific types: `text`, `integer`, `real`
- UUIDs via `crypto.randomUUID()`
- Timestamps as `integer` with `mode: "timestamp"`
- Export inferred types: `type User = typeof user.$inferSelect`

### Queries

- Use query builder: `db.select().from(table).where(eq(...))`
- Combine conditions with `and()`, `or()`
- Always use `.limit(1)` for single results
- Return `null` for not found (not undefined)

### Migrations

- Generate: `bun db:generate`
- Push to DB: `bun db:push`
- Migrations in `src/db/drizzle/`

## Code Style (Biome)

### Formatting

- 2 space indentation
- 100 character line width
- No semicolons (Biome default)
- Double quotes for strings

### Linting

- React recommended rules enabled
- a11y rules enabled
- Import type coercion disabled (`useImportType: off`)
- Auto-fix on save via `biome check --write`

### File Naming

- kebab-case for files: `user-service.ts`, `movie-card.tsx`
- PascalCase for components: `MovieCard`, `Button`
- camelCase for functions/variables
- SCREAMING_SNAKE_CASE for constants

## Development Workflow

### Commands

- `bun dev` - Start both API and web
- `bun dev:api` - API only (port 3002)
- `bun dev:web` - Web only (port 3000)
- `bun lint` - Check all packages
- `bun type-check` - TypeScript validation

### Git Hooks (Husky + lint-staged)

- Pre-commit: Biome check on staged files
- Runs on `*.{ts,tsx,js,jsx}` and `*.{json,md}`

### Type Safety

- Strict TypeScript enabled
- No `any` except in `.d.ts` files
- Share types via workspace packages
- API types exported for web consumption

## Common Patterns

### Error Handling

- API: Throw errors, caught by Elysia `.onError()`
- Web: Try-catch with redirect on auth failure
- Use custom error classes (e.g., `UnauthorizedError`)

### Async/Await

- Always use async/await (no `.then()`)
- Handle errors with try-catch
- Services return promises

### Type Imports

- Use `import type` for type-only imports when possible
- Biome will warn if regular import used for types

### Environment Variables

- API: Use `process.env.API_PORT`
- Web: Use `import.meta.env.VITE_*`
- Load with `@dotenvx/dotenvx` in API

## Testing

- Vitest for unit tests (configured but minimal usage)
- Run with `bun test` in web package

## Security

- CORS configured for localhost:3000
- Helmet middleware for security headers
- httpOnly cookies for sessions
- Password hashing with salt
- User-scoped queries (always filter by userId)
