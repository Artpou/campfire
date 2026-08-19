---
title: Activity
description: Audit log of logins, downloads, modules, and other instance events.
---

Open **Settings → Activity** (admin or member) to review what happened on the instance. Members only see their own events.

## What is logged

Each event has a type (**success**, **warning**, or **error**), an action, optional media or module, metadata (never passwords or API keys), a timestamp, and the user when relevant.

Typical actions:

- **User** — login, logout, create, modify, delete
- **Download** — start, complete, delete, remote transfer
- **Module** — enable, disable, modify, remote sync
- **Others** — watch a title, unexpected system errors

Click a media poster to open that title, or a module logo to open its configuration.

## How to use it

- Filter by category (user / download / module / others) and by type.
- Diagnose failed transfers or download errors from the metadata panel.
- Confirm that a household member’s download or module change ran as expected.

Activity is an operational log — not a full analytics dashboard. For live download speed and peers, use the **Downloads** page instead.
