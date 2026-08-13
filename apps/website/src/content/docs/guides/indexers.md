---
title: Indexers
description: Connect Torrentio, Prowlarr, Jackett, or other Stremio addons for torrent search.
---

Seedarr does not ship with built-in public trackers. You connect **indexer managers** under **Settings → Indexers**.

:::caution
Seedarr is a neutral tool. Enabling third-party indexers may expose copyrighted content. You are responsible for complying with the laws in your country.
:::

## Recommended: Torrentio (Stremio addon)

[Torrentio](https://torrentio.strem.fun/) is the fastest way to get torrent results for movies and TV.

1. Open **Settings → Indexers**.
2. Click **Add indexer**.
3. Choose **Stremio addon** and paste your Torrentio manifest URL (from the Torrentio configuration page).
4. Save — Seedarr fetches the addon manifest and enables search.

Torrentio is ideal for most household installs: no separate Jackett/Prowlarr server required.

## Prowlarr

Use Prowlarr when you already manage indexers in the *arr stack.

1. Ensure Prowlarr is reachable from the Seedarr host.
2. **Add indexer** → **Prowlarr**.
3. Enter the Prowlarr base URL and API key.
4. Save and verify live indexer status in the UI.

## Jackett

Same flow as Prowlarr:

1. **Add indexer** → **Jackett**.
2. Provide the Jackett URL and API key.
3. Seedarr queries Jackett’s aggregated indexers when you search torrents on a media page.

## Other Stremio addons

Any Stremio-compatible torrent addon with a public manifest URL can be added the same way as Torrentio. Prefer addons you trust; Seedarr stores the manifest and calls the addon when searching.

## Using search

1. Open a movie or TV show.
2. Go to the **Torrents** tab (or download action).
3. Results appear from all enabled managers with quality, language, peers, and seeds.
4. Start a download — WebTorrent runs inside Seedarr.

You can search managers by name in Settings and enable/disable or edit each card individually.
