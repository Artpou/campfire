---
title: General settings
description: Configure TMDB, appearance, torrent defaults, and instance preferences.
---

Open **Settings → General** after signing in as an admin (or owner for some options).

## TMDB API key

Seedarr needs a [TMDB API key](https://www.themoviedb.org/settings/api) to browse the catalog, search titles, and enrich metadata.

1. Create a free TMDB account and request an API key.
2. In Seedarr, go to **Settings → General**.
3. Paste the key into the TMDB field and save.

You can also set `TMDB_API_KEY` in `.env` for local development. A key saved in Settings takes precedence for the running instance.

Without a key, browse and search features will not work.

## Appearance & language

- **Language** — English or French (Lingui). Preference is stored per user.
- Theme follows the app’s light/dark switch in the UI.

## Password

Change your account password from General. The first registered user is the **owner**; subsequent signups are disabled by default.

## Torrent defaults (per user)

- **Default quality** — minimum quality filter applied when searching torrents.
- **Max size** — optional upper size bound for search results.

These filters speed up picking a release; you can still choose other results in the torrent table.

## Media ratings (owner)

Owners can toggle whether media ratings are shown in the UI across the instance.
