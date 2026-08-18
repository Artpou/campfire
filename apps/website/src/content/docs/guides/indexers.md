---
title: Indexers
description: Connect Torrentio, Prowlarr, Jackett, or a custom Stremio addon for torrent search.
---

Seedarr does not ship with built-in public trackers. You install **indexer modules** under **Settings → Modules**.

:::caution
Seedarr is a neutral tool. Enabling third-party indexers may expose copyrighted content. You are responsible for complying with the laws in your country.
:::

## Recommended: Torrentio

[Torrentio](https://torrentio.strem.fun/) is the fastest way to get torrent results for movies and TV.

1. Open **Settings → Modules**.
2. Filter by **Indexers** (optional).
3. Click **Install** on **Torrentio** (recommended badge).

Torrentio needs no separate Jackett/Prowlarr server. Localhost / LAN URLs are allowed for self-hosted managers.

## Prowlarr

Use Prowlarr when you already manage indexers in the *arr stack.

1. Ensure Prowlarr is reachable from the Seedarr host (LAN / localhost is fine).
2. **Install** → **Prowlarr**, then open **Configure**.
3. Enter the Prowlarr base URL and API key.
4. **Save**, then **Test connection**. Status should show **Healthy**.

## Jackett

Same flow as Prowlarr:

1. **Install** → **Jackett**, then **Configure**.
2. Provide the Jackett URL and API key.
3. Seedarr queries Jackett’s aggregated indexers when you search torrents on a media page.

## Custom Stremio addon

Any Stremio-compatible torrent addon with a public manifest URL can be installed:

1. **Install** on **Custom Stremio addon**.
2. Paste the manifest URL and save.

Prefer addons you trust; Seedarr stores the manifest and calls the addon when searching.

## Using search

1. Open a movie or TV show.
2. Go to the **Torrents** tab.
3. Results appear from all **enabled** indexer modules.
4. Start a download — WebTorrent runs inside Seedarr.

Enable/disable a module from the Modules list without uninstalling it. Health is checked when you open Settings (about 30s cache).
