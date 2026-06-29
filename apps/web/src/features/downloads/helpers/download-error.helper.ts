import { t } from "@lingui/core/macro";

export function translateDownloadError(message: string): string {
  if (message === "Torrent is not paused") return t`Torrent is not paused`;
  if (message === "No magnet URI found") return t`No magnet URI found`;
  return message;
}
