export interface SeasonEpisodeMatch {
  season: number;
  episode?: number;
}

const SEASON_EPISODE_REGEX = /S(\d{1,2})E(\d{1,3})/gi;
const SEASON_ONLY_REGEX = /S(\d{1,2})(?!E)/gi;

export function parseSeasonEpisode(name: string | null | undefined): SeasonEpisodeMatch[] {
  if (!name) return [];
  const matches: SeasonEpisodeMatch[] = [];
  const cleanName = name.replace(/[._]/g, " ");

  for (const m of cleanName.matchAll(SEASON_EPISODE_REGEX)) {
    matches.push({
      season: Number.parseInt(m[1], 10),
      episode: Number.parseInt(m[2], 10),
    });
  }

  if (matches.length === 0) {
    for (const m of cleanName.matchAll(SEASON_ONLY_REGEX)) {
      matches.push({ season: Number.parseInt(m[1], 10) });
    }
  }

  return matches;
}

export function formatSeasonEpisode(season: number, episode?: number): string {
  const s = `S${season.toString().padStart(2, "0")}`;
  if (episode === undefined) return s;
  return `${s}E${episode.toString().padStart(2, "0")}`;
}
