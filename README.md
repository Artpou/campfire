<p align="center">
<img src="./apps/web/public/logo.svg" alt="Seedarr" width="120">
</p>

<h1 align="center">Seedarr</h1>

<p align="center">
<b>Your self-hosted media center.</b><br>
Discover, download, and stream movies & TV shows — all from one place.
</p>

<p align="center">
<img src="https://img.shields.io/badge/status-beta-blue" alt="Status">
<img src="https://img.shields.io/badge/license-MIT-green" alt="License">
<img src="https://img.shields.io/badge/platform-docker%20%7C%20node-lightgrey" alt="Platform">
</p>

---

**Seedarr** is a free, open-source, self-hosted web app that lets you browse the entire TMDB catalog, search torrents through your indexers, download them with a built-in torrent client, and **stream content directly in your browser** — even while it's still downloading.

Think of it as **Stremio meets Overseerr**, but fully self-hosted and under your control.

## Preview

<p align="center">
  <img src="./.github/screenshots/home.png" alt="Catalogue Dashboard" width="850" />
</p>

## Getting started

Check out our documentation on how ton install and run Seedarr:

[https://seedarr.netlify.app/guides/quick-start/](https://seedarr.netlify.app/guides/quick-start/)

## Features

You can retrieve all features and how to configure each one following the documentation : 

[https://seedarr.netlify.app/guides/features/](https://seedarr.netlify.app/guides/features/)

### Browse & Discover

- Full **TMDB catalog** — movies, TV shows, trending, popular, top rated, upcoming
- Rich metadata: trailers, IMDb / TMDB / personal ratings, cast, genres
- Search across the entire TMDB database
- Personalized **Watchlist** and **Likes** to keep track of what you want to watch

### Modules & Integrations

- Unified **Settings → Modules** — TMDB, SUBDL, indexers, storage, social, and notifications
- Indexers: **Torrentio**, **Jackett**, **Prowlarr**, or a custom Stremio addon — with live health status
- Optional **remote storage** (FTP/FTPS or WebDAV) — transfer completed downloads to a NAS, Nextcloud, or any remote server
- **Letterboxd** import / sync (Trakt, SMB, and Discord/Telegram/Email notifications coming soon)

### Torrent Search & Download

- Search torrents from your enabled indexer modules
- Built-in **WebTorrent client** — no external download client needed
- Real-time download progress, speed, peers, seeds, and ratio
- Pause, resume, and manage downloads directly from the UI
- Quality and language info displayed for each result

### Stream & Watch

- **Stream while downloading** — progressive MP4/WebM can play before the download completes
- Integrated **movi-player** — plays MKV/HEVC/AV1/HDR natively in the browser (no server transcoding)
- Automatic **subtitle detection** from downloaded files (SRT/ASS/VTT)
- **Watch progress tracking** — resume where you left off
- **Next episodes** — season picker and episode carousel under the series player

### Multi-User & Roles

- **Role-based access control**: Owner, Admin, Member, Viewer
- First user becomes the owner — no open registration by default
- Per-user watchlist, likes, and watch history
- **Shared household library** — any authenticated user can browse and stream all downloads; mutations (pause/delete/transfer) require ownership or admin
- **Guided onboarding** for new users

### Self-Hosted & Private

- Runs entirely on your hardware — your data stays yours
- Lightweight **SQLite** database, no external DB required
- **Docker** ready with a single `docker compose up`
- Responsive, **mobile-friendly** design
- Available in **English** and **French**

## Contributing

Contributions are welcome! Whether it's fixing a bug, adding a feature, or improving translations.

Please read our documentation to learn how to set up the development environment and follow our coding standards :

[https://seedarr.netlify.app/guides/contributing/](https://seedarr.netlify.app/guides/contributing/)

## Acknowledgments

- [TMDB](https://www.themoviedb.org/) for their incredible API
- All the open-source projects that power Seedarr

---

<p align="center">
<sub>Seedarr is not affiliated with TMDB, Stremio, Prowlarr, or Jackett. This product uses the TMDB API but is not endorsed or certified by TMDB.</sub>
</p>
