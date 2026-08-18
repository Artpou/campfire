---
title: General settings
description: Configure appearance, torrent defaults, and instance preferences.
---

Open **Settings → General** after signing in.

## Appearance & language

- **Language** — English or French (Lingui). Preference is stored per user.
- Theme follows the app’s light/dark switch in the UI.

## Password

Change your account password from General. The first registered user is the **owner**; subsequent signups are disabled by default.

## Torrent defaults (per user)

- **Default quality** — minimum quality filter applied when searching torrents.
- **Max size** — optional upper size bound for search results.

These filters speed up picking a release; you can still choose other results in the torrent table.

## TMDB API key

TMDB is managed as a **system module** under **Settings → Modules** (not in General).

1. Create a free [TMDB](https://www.themoviedb.org/settings/api) account and request an API key.
2. Open **Settings → Modules** → **The Movie Database** → Configure.
3. Paste the key and save.

You can also set `TMDB_API_KEY` in `.env` as a fallback for local development. A key saved on the TMDB module takes precedence.

Without a key, browse and search features will not work.
