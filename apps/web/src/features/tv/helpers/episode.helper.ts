export function formatSeasonEpisode(season: number, episode?: number): string {
  const s = `S${season.toString().padStart(2, "0")}`;
  if (episode === undefined) return s;
  return `${s}E${episode.toString().padStart(2, "0")}`;
}
