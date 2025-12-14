# Turborepo Fullstack Boilerplate

This boilerplate combines the best of both worlds: TanStack Start's modern React framework with powerful SSR capabilities and Fastify's high-performance backend architecture. The idea is simple - use TanStack Start to build beautiful, interactive UIs while having a proper backend that can handle complex business logic, authentication, and database operations with Fastify and tRPC. All tied together nicely in a Turborepo monorepo.

## Features

### Core

- 🚀 **Turborepo**: Efficient monorepo management with task caching and parallel execution.
- 🔒 **Strict Mode**: TypeScript strict mode enabled across all packages for enhanced type safety.
- 🎯 **Biome**: Fast and comprehensive linting and formatting with TypeScript support and consistent code style enforcement.

### Server

- ⚡ **Fastify**: High-performance HTTP server, up to 2x faster than Express with better overall performance.
- 🔄 **tRPC**: End-to-end typesafe APIs with automatic type inference between client and server.
- 🐘 **Drizzle ORM**: Type-safe SQL toolkit with PostgreSQL integration.
- 🔐 **Better Auth**: Modern authentication library with email/password support, session management, and Drizzle adapter.
- 💎 **Validation**: Data validation using Zod schemas shared between frontend and backend.
- 📚 **OpenAPI/Swagger**: API documentation with Fastify Swagger integration.

### Web

- ⚛️ **TanStack Start**: Modern React framework with SSR, file-based routing, and excellent TypeScript support.
- 👨‍🎨 **shadcn/ui with Tailwind CSS**: Beautiful, accessible UI components built on Radix UI primitives.
- 🔐 **Better Auth**: Client-side authentication integration with React hooks.
- 📋 **React Hook Form**: Form validation and management with Zod integration.
- 🔄 **TanStack Query**: Powerful data synchronization and state management with SSR support.

### DevOps & Tools

- 🐳 **Docker Integration**: Containerization with Docker Compose for PostgreSQL and Redis.
- 🐕 **Husky**: Git hooks for code quality and consistency.
- 📦 **Bun**: Fast JavaScript runtime and package manager.

## Apps and Packages

- `api`: A [Fastify](https://www.fastify.io/) server application providing the backend API with tRPC.
- `web`: A [TanStack Start](https://tanstack.com/start) web application with SSR and file-based routing.
- `@basement/db`: Database package with Drizzle ORM, schema definitions, and migration utilities.
- `@basement/services`: Business logic layer with service classes for database operations.
- `@basement/trpc-core`: Shared tRPC configuration with public and protected procedures.
- `@basement/trpc-router`: tRPC routers that combine services and validators.
- `@basement/validators`: Zod schemas shared between frontend and backend for type-safe validation.
- `@basement/typescript-config`: Shared TypeScript configurations for apps and packages.

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

## Quick Start

Run the initialization script to set up the entire project:

```bash
chmod +x scripts/init.sh
./scripts/init.sh
```

This will:

- Check for required dependencies (Bun, Docker)
- Create environment files with secure secrets
- Install dependencies
- Start Docker services (PostgreSQL, Redis)
- Run database migrations
- Seed the database

After initialization, start the development servers:

```bash
bun run dev
```

## Project Structure

```
basement/
├── apps/
│   ├── api/              # Fastify + tRPC backend
│   └── web/               # TanStack Start frontend
├── packages/
│   ├── db/                # Drizzle ORM and database schemas
│   ├── services/          # Business logic services
│   ├── trpc-core/         # Shared tRPC configuration
│   ├── trpc-router/       # tRPC routers
│   ├── validators/        # Zod validation schemas
│   └── typescript-config/ # Shared TS configs
├── docker-compose.yml      # Docker services (PostgreSQL, Redis)
├── turbo.json             # Turborepo configuration
└── package.json           # Root package with workspace config
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
