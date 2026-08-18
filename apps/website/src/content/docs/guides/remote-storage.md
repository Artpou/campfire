---
title: Remote storage
description: Offload completed downloads to FTP/FTPS or WebDAV (NAS, Nextcloud, and more).
---

Configure remote offloading under **Settings → Modules** (Storage category).

## When to use it

Keep torrents on the Seedarr machine while they download and stream, then transfer finished titles to a NAS, Nextcloud, or another server so local disk stays free.

## Protocols

| Protocol | Typical use | Default port |
| --- | --- | --- |
| **FTP / FTPS** | Classic NAS, many routers | 21 (or your FTPS port) |
| **WebDAV** | Nextcloud, some NAS apps | 443 |

Enable **secure** when using FTPS or HTTPS WebDAV.

## Paths

Set separate remote directories for media types:

- **Movie path** — e.g. `movies` or `/media/movies`
- **TV path** — e.g. `tv` or `/media/tv`

Paths are relative to the remote root your credentials can access. Seedarr builds the remote location when transferring a completed download.

## Setup steps

1. Open **Settings → Modules**.
2. **Install** **FTP / FTPS** or **WebDAV**.
3. Open **Configure** and fill host, port, username, password, and movie/TV paths.
4. Click **Test connection** (or rely on the list **Healthy** / **Issue** status).
5. Optionally enable **auto transfer** and **delete local files after transfer**.

Until host credentials are set, the module shows **Need configuration**.

## Transferring

From a completed download, use the transfer action (owner or admin). Progress and errors appear on the download and in **Activity**. Failed transfers keep an error message so you can retry after fixing credentials or paths.

## Tips

- Prefer a dedicated Seedarr user on the NAS with write access only to the media folders.
- For WebDAV on Nextcloud, use an app password and the WebDAV URL from Nextcloud settings.
- Keep local files until you confirm the remote copy if you are unsure about path mapping.
