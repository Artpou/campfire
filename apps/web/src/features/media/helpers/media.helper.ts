import { t } from "@lingui/core/macro";
import type { Media } from "@seedarr/sdk";

export type PosterFormat = "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";

export function getPosterUrl(path?: string | null, format: PosterFormat = "w500"): string {
  if (!path) return "";

  if (path.includes("https")) {
    return path;
  }

  return `https://image.tmdb.org/t/p/${format}${path}`;
}

export type BackdropFormat = "w300" | "w780" | "w1280" | "original";

export function getBackdropUrl(path?: string | null, format: BackdropFormat = "original"): string | undefined {
  if (!path) return undefined;

  if (path.includes("https")) {
    return path;
  }

  return `https://image.tmdb.org/t/p/${format}${path}`;
}

export function getMediaType(type?: unknown): Media["type"] | undefined {
  if (!type || typeof type !== "string") return undefined;
  if (type === "tv") return "tv";
  if (type === "movie") return "movie";
  return undefined;
}

export function getWatchProgressPercent(media: Media): number {
  if (media.progress?.position == null || !media.progress.duration) return 0;
  return Math.min(100, (media.progress.position / media.progress.duration) * 100);
}

export function hasWatchProgress(media: Media): boolean {
  return (
    media.progress != null &&
    media.progress.position > 0 &&
    media.progress.duration > 0 &&
    media.progress.position / media.progress.duration < 0.95
  );
}

export function getRemainingTime(media: Media): string | null {
  let remainingSeconds: number | null = null;

  if (media.progress?.duration) {
    remainingSeconds = media.progress.duration - media.progress.position;
  } else if (media.duration && media.duration > 0) {
    remainingSeconds = media.duration * 60;
  }

  if (!remainingSeconds || remainingSeconds <= 0) return null;
  const totalMinutes = Math.ceil(remainingSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const suffix = totalMinutes > 1 ? t`remaining` : t`remaining`;

  if (hours > 0) {
    const formattedMinutes = minutes > 0 ? minutes.toString().padStart(2, "0") : "";
    return `${hours}h${formattedMinutes} ${suffix}`;
  }

  return `${minutes} minute${minutes > 1 ? "s" : ""} ${suffix}`;
}
