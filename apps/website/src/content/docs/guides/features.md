---
title: Features
description: What Seedarr can do today.
---

## Browse & discover

- Full **TMDB catalog** — movies, TV shows, trending, popular, top rated, upcoming
- Rich metadata: trailers, IMDb / TMDB / personal ratings, cast, genres, backdrops
- Search across the entire TMDB database
- Personalized **Watchlist** and **Likes**

## Modules & integrations

- Unified **Settings → Modules** catalog (system, indexers, storage, social, notifications)
- **[TMDB](/guides/tmdb/)** as a locked system module (API key + optional `TMDB_API_KEY` env fallback)
- **SUBDL** for subtitles
- Indexers: **Torrentio**, **Jackett**, **Prowlarr**, custom Stremio addon — with health status
- Optional **remote storage** (FTP/FTPS or WebDAV) to a NAS, Nextcloud, or remote server
- **Letterboxd** import / sync (Trakt, SMB, and notifications coming soon)

## Torrent search & download

- Search from enabled indexer modules with live Healthy / Issue status
- Built-in **WebTorrent client** — no external download client needed
- Real-time progress, speed, peers, seeds, and ratio
- Pause, resume, and manage downloads from the UI
- Quality and language info on each result

## Stream & watch

- **Stream while downloading** — progressive playback before the download completes
- Integrated **movi-player** — MKV/HEVC/AV1/HDR natively in the browser (no server transcoding)
- Automatic **subtitle detection** (SRT/ASS/VTT)
- **Watch progress** — resume where you left off
- **Next episodes** from the series player carousel

## Multi-user & roles

- Roles: Owner, Admin, Member, Viewer
- First user becomes the owner — no open registration by default
- Per-user watchlist, likes, and watch history
- **Shared household library** — any authenticated user can browse and stream; mutations require ownership or admin
- Guided onboarding for new users

## Self-hosted & private

- Runs on your hardware — your data stays yours
- Lightweight **SQLite** database
- **Docker** ready with a single `docker compose up`
- Responsive, mobile-friendly UI
- Available in **English** and **French**

## Roadmap

- SMB storage, Trakt, and notifications (Discord / Telegram / Email)
- Instance customization (logo, title, branding)
- Direct URL streaming
- Chromecast
- Debrid support (Real-Debrid, AllDebrid, Premiumize)
