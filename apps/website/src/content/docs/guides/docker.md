---
title: Docker
description: Deploy Seedarr with Docker Compose, including local builds.
---

## Pull and run

```bash
mkdir seedarr && cd seedarr
curl -fsSL https://raw.githubusercontent.com/Artpou/seedarr/main/docker-compose.yml -o docker-compose.yml
docker compose pull
docker compose up -d
```

Images are **multi-arch** (`linux/amd64` + `linux/arm64`). Docker pulls the matching architecture automatically (PC, NAS, Freebox, Raspberry Pi, etc.).

## Build locally from source

For contributors or custom images:

```bash
git clone https://github.com/Artpou/seedarr.git
cd seedarr
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

## Tags

- `beta` — latest build from `main`
- Version tags such as `0.1.0-beta.0` — pin a specific release

Refer to [`docker-compose.yml`](https://github.com/Artpou/seedarr/blob/main/docker-compose.yml) and the [`Dockerfile`](https://github.com/Artpou/seedarr/blob/main/Dockerfile) in the repository for volumes, ports, and environment variables.
