import type { Download } from "@seedarr/sdk";

const SEASON_EPISODE_REGEX = /S(\d{1,2})E(\d{1,2})/i;

function parseSeasonEpisode(text: string): { season: number; episode: number } | null {
  const match = text.match(SEASON_EPISODE_REGEX);
  if (!match) return null;

  return {
    season: Number(match[1]),
    episode: Number(match[2]),
  };
}

function episodeKey(season: number, episode: number): string {
  return `${season}-${episode}`;
}

export type CoveredEpisode = {
  season: number;
  episode: number;
};

export function buildEpisodeDownloadMap(downloads: Download[]): Map<string, Download> {
  const map = new Map<string, Download>();

  for (const download of downloads) {
    const torrentName = download.torrent?.name;
    if (torrentName) {
      const parsed = parseSeasonEpisode(torrentName);
      if (parsed) {
        const key = episodeKey(parsed.season, parsed.episode);
        if (!map.has(key)) map.set(key, download);
      }
    }

    for (const file of download.torrent?.files ?? []) {
      const parsed = parseSeasonEpisode(file.name);
      if (!parsed) continue;

      const key = episodeKey(parsed.season, parsed.episode);
      if (!map.has(key)) map.set(key, download);
    }
  }

  return map;
}

export function getEpisodesCoveredByDownload(
  downloadId: string,
  episodeDownloadMap: Map<string, Download>,
): CoveredEpisode[] {
  const episodes: CoveredEpisode[] = [];

  for (const [key, download] of episodeDownloadMap) {
    if (download.id !== downloadId) continue;

    const [season, episode] = key.split("-").map(Number);
    if (!Number.isFinite(season) || !Number.isFinite(episode)) continue;
    episodes.push({ season, episode });
  }

  return episodes.sort((a, b) => a.season - b.season || a.episode - b.episode);
}
