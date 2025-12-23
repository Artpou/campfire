export type PosterFormat = "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";

export function getPosterUrl(path?: string | null, format: PosterFormat = "w500"): string {
  if (!path) return "";

  if (path.includes("https")) {
    return path;
  }

  return `https://image.tmdb.org/t/p/${format}${path}`;
}

export type BackdropFormat = "w300" | "w780" | "w1280" | "original";

export function getBackdropUrl(path?: string | null, format: BackdropFormat = "original"): string {
  if (!path) return "";

  if (path.includes("https")) {
    return path;
  }

  return `https://image.tmdb.org/t/p/${format}${path}`;
}
