import { sanitizeFileName } from "./string";

const SEASON_EPISODE_REGEX = /S(\d{1,2})E(\d{1,2})/i;
const ALT_SEASON_EPISODE_REGEX = /(\d{1,2})x(\d{1,2})/i;

export function parseSeasonEpisode(text: string): { season: number; episode: number } | null {
  const match = text.match(SEASON_EPISODE_REGEX) ?? text.match(ALT_SEASON_EPISODE_REGEX);
  if (!match) return null;
  return { season: Number(match[1]), episode: Number(match[2]) };
}

export function extractYearFromDate(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const year = Number.parseInt(dateStr.substring(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

export function buildMediaFolderName(title: string, year: number | null): string {
  const safe = sanitizeFileName(title);
  return year ? `${safe} (${year})` : safe;
}

export function buildSeasonFolderName(season: number): string {
  return `Season ${String(season).padStart(2, "0")}`;
}

export function joinRemotePath(...parts: string[]): string {
  return parts
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

export function buildOrganizedRemotePath(opts: {
  basePath: string;
  title: string;
  year: number | null;
  type: "movie" | "tv";
  season?: number | null;
}): string {
  const folder = buildMediaFolderName(opts.title, opts.year);
  if (opts.type === "tv" && opts.season != null) {
    return joinRemotePath(opts.basePath, folder, buildSeasonFolderName(opts.season));
  }
  return joinRemotePath(opts.basePath, folder);
}
