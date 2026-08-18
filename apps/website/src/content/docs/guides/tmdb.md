---
title: TMDB
description: Configure the TMDB system module for catalog, search, and metadata.
---

The Movie Database powers Seedarr’s catalog. It is a **locked system module** — always installed, cannot be uninstalled.

Configure it from **Settings → Modules → The Movie Database**.

## Get an API key

1. Create a free [TMDB](https://www.themoviedb.org/settings/api) account.
2. Request an API key (the *API Read Access Token* / v3 key used by Seedarr).
3. Open **Settings → Modules**, filter **System** if you like, then **Configure** on **The Movie Database**.
4. Paste the key and **Save**.

A key saved on the module takes precedence. For local development you can also set `TMDB_API_KEY` in `.env` as a fallback.

Without a key, browse, search, and remote sync matching will not work.

## What it unlocks

- Movie and TV catalog (trending, popular, search, details, seasons, episodes)
- Metadata enrichment (posters, ratings, cast, genres)
- Matching titles when you synchronize files from remote storage

## Health

The Modules list probes TMDB like other modules (about 30s cache). **Healthy** means the saved key (or env fallback) can reach the API.

See [Modules](/guides/modules/) for the rest of the catalog, and [General settings](/guides/general/) for language and torrent defaults.
