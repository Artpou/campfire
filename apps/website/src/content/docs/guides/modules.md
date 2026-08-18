---
title: Modules
description: Install and configure indexers, storage, social integrations, and TMDB.
---

**Settings → Modules** is the unified place for integrations (formerly separate Indexers and Storage tabs).

## Catalog

The list shows every available module. **Installed** modules appear first, then installable ones, then **Coming soon**.

Each row shows:

- Logo, title, category / tags, and description
- **Status** when installed: Healthy, Issue, Need configuration, or Off
- **Install**, or **Configure** (gear) + enable switch

Filter with tabs (All / System / Indexers / Storage / Social / Notifications) or search.

## Install flow

1. Click **Install**.
2. If the module needs credentials (Jackett, FTP, …), you are taken to the configure page.
3. Presets like **Torrentio** stay on the list (ready immediately).

## Configure page

`/settings/modules/:id` keeps the Settings sidebar.

- Header card: logo, title, badges, enable switch, uninstall
- Configuration form in a transparent card
- **Test connection** and **Save** (large buttons)

Local / LAN URLs are allowed for Jackett and Prowlarr (typical self-hosted setups).

## Categories

| Category | Examples |
| --- | --- |
| **System** | TMDB (always installed, cannot uninstall) |
| **Indexers** | Torrentio, Jackett, Prowlarr, custom Stremio addon |
| **Storage** | WebDAV, FTP |
| **Social** | Letterboxd (Trakt coming soon) |
| **Notifications** | Discord, Telegram, Email (coming soon) |
