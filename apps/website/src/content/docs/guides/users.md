---
title: Users & roles
description: Household accounts, role hierarchy, and what each role can do.
---

Manage accounts under **Settings → Users** (admin and above).

## Roles

| Role | Capabilities |
| --- | --- |
| **Owner** | Full control. First registered user. Instance-wide options (e.g. show ratings). |
| **Admin** | Manage users, requests, settings, and any download. |
| **Member** | Browse, request, search torrents, start downloads, manage **own** downloads. |
| **Viewer** | Browse media, stream shared downloads, create/delete own requests. No torrent start. |

Hierarchy: `owner` > `admin` > `member` > `viewer`.

## Household library model

Seedarr is designed for a **trusted household**:

- Any authenticated user can **list and stream** all downloads.
- Mutations that change torrent state or delete files require **download ownership** or admin.
- Profile lists (likes, watchlist, history) are visible to other authenticated users.

## Creating users

1. Sign in as admin/owner.
2. **Settings → Users** → add a user with username, password, and role.
3. New users get guided onboarding on first login.

Registration after the first owner account is closed by default — invite users from Settings instead.

## Requests

Viewers and members can request titles. Admins validate, cancel, or reopen requests. When a download for that media completes, pending requests are auto-validated.
