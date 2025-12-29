<p align="center">
<img src="./apps/web/public/logo512.png" alt="Seedarr" width="200" style="margin: 20px 0;">
</p>

<h1 align="center">Seedarr</h1>

<p align="center">
A modern, self-hosted media discovery and torrent search platform powered by TMDB and your favorite indexers.
</p>

---

**Seedarr** is a free and open-source web application that combines the power of **[The Movie Database (TMDB)](https://www.themoviedb.org/)** with torrent indexers like **[Prowlarr](https://prowlarr.com/)** and **[Jackett](https://github.com/Jackett/Jackett)** to help you discover and find media content.

## ✨ Features

- **TMDB Integration** - Browse movies and TV shows with rich metadata, ratings, and artwork
- **Torrent Search** - Search for torrents directly through Prowlarr or Jackett
- **Genre Discovery** - Explore content by genre with beautiful category cards
- **Recently Viewed** - Keep track of your viewing history
- **Multi-language Support** - Available in English and French (more coming soon!)
- **Dark Mode** - Beautiful Nord-inspired green theme with light/dark modes
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile

## 🚀 Tech Stack

- **Frontend**: React 19 + TanStack Router + Vite
- **Backend**: Elysia (Bun runtime)
- **Database**: SQLite with Drizzle ORM
- **Styling**: Tailwind CSS v4 + Radix UI
- **Type Safety**: TypeScript with TypeBox validation
- **Linting**: Biome

## 📋 Prerequisites

- [Bun](https://bun.sh/) v1.3.1 or higher
- (Optional) A [TMDB API key](https://www.themoviedb.org/settings/api)
- (Optional) Prowlarr or Jackett instance for torrent search

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/seedarr.git
   cd seedarr
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```env
   # API Configuration
   API_PORT=3002

   # Frontend Configuration
   VITE_API_URL=http://localhost:3002
   VITE_TMDB_API_KEY=your_tmdb_api_key_here
   ```

4. **Initialize the database**

   ```bash
   bun db:push
   ```

5. **Start the development servers**

   ```bash
   bun dev
   ```

   The application will be available at:

   - **Web**: http://localhost:3000
   - **API**: http://localhost:3002

## 📖 Usage

1. **Create an account** - Sign up with a username and password
2. **Configure indexers** - Go to Settings and add your Prowlarr or Jackett instance
3. **Browse media** - Explore movies and TV shows by category or search
4. **Find torrents** - Click on any title to view details and search for torrents

## 🏗️ Project Structure

```
.
└── 📁 apps/
    ├── 📁 api/                      # Elysia Backend (Port 3002)
    │   ├── 📁 src/
    │   │   ├── 📁 auth/            # Authentication utilities
    │   │   ├── 📁 db/              # Database schema & migrations
    │   │   ├── 📁 helpers/         # Utility functions
    │   │   ├── 📁 modules/         # Feature modules
    │   │   └── server.ts           # Elysia app entry point
    │   └── drizzle.config.ts
    │
    └── 📁 web/                      # React Frontend (Port 3000)
        ├── 📁 public/               # Static assets
        │   ├── logo512.png
        │   ├── 📁 movie/category/   # Movie genre images
        │   └── 📁 tv/category/      # TV genre images
        └── 📁 src/
            ├── 📁 features/        # Feature-based modules
            ├── 📁 shared/          # Shared components and utilities
            ├── 📁 routes/          # TanStack Router routes
            │   ├── _app.*.tsx      # Authenticated layout/routes
            │   └── _auth.*.tsx     # Public layout/routes
            ├── 📁 lib/             # Core utilities & API client
            ├── 📁 locales/         # i18n translations (en, fr)
            ├── main.tsx            # App entry point
            └── styles.css          # Global styles & theme
```

### Key Directories

- **`apps/api/src/modules/`** - Each module contains routes, services, and business logic for a specific feature
- **`apps/web/src/features/`** - Feature-based architecture with components, hooks, and helpers co-located
- **`apps/web/src/shared/`** - Reusable components and utilities used across features
- **`packages/validators/`** - Type-safe validation schemas shared between API and web

## 🧪 Development

```bash
# Run both API and web
bun dev

# Run API only
bun dev:api

# Run web only
bun dev:web

# Lint all packages
bun lint

# Format code
bun format

# Type check
bun type-check

# Database commands
bun db:generate    # Generate migrations
bun db:push        # Push schema to database
bun db:studio      # Open Drizzle Studio
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for their excellent API
- [Prowlarr](https://prowlarr.com/) and [Jackett](https://github.com/Jackett/Jackett) for indexer management
- All the amazing open-source projects that made this possible

---

<p align="center">Made with ❤️ using Bun and React</p>
