---
title: Quick start
description: Get Seedarr running with Docker or from source.
---

## Docker (recommended)

> **Beta:** images are published automatically on every push to `main` as a **multi-arch** manifest (`linux/amd64` + `linux/arm64`). Use the `beta` tag for the latest build, or pin a specific version (e.g. `ghcr.io/artpou/seedarr:0.1.0-beta.0`).

```bash
mkdir seedarr && cd seedarr
curl -fsSL https://raw.githubusercontent.com/Artpou/seedarr/main/docker-compose.yml -o docker-compose.yml
docker compose pull
docker compose up -d
```

Seedarr will be available at **http://localhost:5551**. Create your account, open **Settings → Modules**, install an indexer (Torrentio is recommended), and start browsing.

**Update to the latest beta:**

```bash
docker compose pull && docker compose up -d
```

## Manual setup

```bash
git clone https://github.com/Artpou/seedarr.git
cd seedarr
pnpm install
pnpm db:push
pnpm dev
```

Open **http://localhost:3000** — the API runs on port 3002.

### Requirements

- Node.js 22.13+
- pnpm 9+
- Optional: [FFmpeg](https://ffmpeg.org/) for live remux of progressive MP4 while downloading

See [Docker](/guides/docker/) for building from source and [Contributing](/guides/contributing/) for a full development setup.
