import { BadRequestError } from "@/shared/errors/error";

import path from "node:path";

export function getDownloadsRoot(): string {
  return path.resolve(process.env.DOWNLOADS_PATH || "./downloads");
}

export function getAvatarsRoot(): string {
  return path.resolve(process.env.AVATARS_PATH || path.join(getDownloadsRoot(), "..", "avatars"));
}

export function assertWithinDownloads(resolvedPath: string): void {
  const root = getDownloadsRoot();
  if (resolvedPath !== root && !resolvedPath.startsWith(root + path.sep)) {
    throw new BadRequestError("Path escapes download directory");
  }
}

/** Local folder under DOWNLOADS_PATH: torrent name, or remoteLocation basename when torrent was cleared. */
export function getDownloadFolderName(download: {
  torrent?: { name?: string | null } | null;
  remoteLocation?: string | null;
}): string | undefined {
  const fromTorrent = download.torrent?.name?.trim();
  if (fromTorrent) return fromTorrent;

  const remote = download.remoteLocation?.trim().replace(/\/+$/, "");
  if (!remote) return undefined;

  return remote.split("/").pop()?.trim() || undefined;
}

export function requireDownloadFolderName(download: {
  torrent?: { name?: string | null } | null;
  remoteLocation?: string | null;
}): string {
  const name = getDownloadFolderName(download);
  if (!name) throw new BadRequestError("Download has no folder name");
  return name;
}

export function resolveWithinDownloads(...segments: string[]): string {
  const resolved = path.resolve(getDownloadsRoot(), ...segments);
  assertWithinDownloads(resolved);
  return resolved;
}

export function resolveWithinAvatars(...segments: string[]): string {
  const root = getAvatarsRoot();
  const resolved = path.resolve(root, ...segments);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new BadRequestError("Path escapes avatars directory");
  }
  return resolved;
}
