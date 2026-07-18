import type { Torrent } from "@seedarr/sdk";

type TvMediaInfos = {
  seasons?: number[];
  episodeNumbers?: number[];
  fullSeason?: boolean;
};

function getTvMediaInfos(torrent: Torrent): TvMediaInfos | null {
  const mediaInfos = torrent.mediaInfos;
  if (!mediaInfos || typeof mediaInfos !== "object") return null;
  if (!("isTv" in mediaInfos) || !mediaInfos.isTv) return null;
  return mediaInfos as TvMediaInfos;
}

export function getSeasonEpisodeRelevance(torrent: Torrent, season?: number, episode?: number): number {
  if (season === undefined) return 0;

  const mediaInfos = getTvMediaInfos(torrent);
  if (!mediaInfos) return 0;

  const torrentSeasons = mediaInfos.seasons ?? [];
  const torrentEpisodes = mediaInfos.episodeNumbers ?? [];

  if (torrentSeasons.length === 0) return 0;
  if (!torrentSeasons.includes(season)) return -1;

  if (episode !== undefined) {
    if (torrentEpisodes.includes(episode)) return 3;
    if (mediaInfos.fullSeason || torrentEpisodes.length === 0) return 2;
    return 1;
  }

  if (mediaInfos.fullSeason || torrentEpisodes.length === 0) return 2;
  if (torrentEpisodes.length > 0) return 1;
  return 0;
}
