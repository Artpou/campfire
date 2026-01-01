import { Media } from "@/features/media/media";

export type PosterFormat = "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";

export function getPosterUrl(path?: string | null, format: PosterFormat = "w500"): string {
  if (!path) return "";

  if (path.includes("https")) {
    return path;
  }

  return `https://image.tmdb.org/t/p/${format}${path}`;
}

export type BackdropFormat = "w300" | "w780" | "w1280" | "original";

export function getBackdropUrl(
  path?: string | null,
  format: BackdropFormat = "original",
): string | undefined {
  if (!path) return undefined;

  if (path.includes("https")) {
    return path;
  }

  return `https://image.tmdb.org/t/p/${format}${path}`;
}

interface TMDBMedia {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string | null;
  poster_path?: string | null;
  vote_average?: number | null;
  release_date?: string | null;
  first_air_date?: string | null;
}

export function tmdbMovieToMedia(movie: TMDBMedia): Media {
  return {
    id: movie.id,
    type: "movie",
    title: movie.title ?? movie.original_title ?? "",
    overview: movie.overview ?? null,
    poster_path: movie.poster_path ?? null,
    vote_average: movie.vote_average ?? null,
    release_date: movie.release_date ?? null,
  };
}

export function tmdbTVToMedia(tv: TMDBMedia): Media {
  return {
    id: tv.id,
    type: "tv",
    title: tv.name ?? tv.original_name ?? "",
    overview: tv.overview ?? null,
    poster_path: tv.poster_path ?? null,
    vote_average: tv.vote_average ?? null,
    release_date: tv.first_air_date ?? null,
  };
}

export interface FMDBResult {
  id: string;
  type: "MOVIE" | "SHOW";
  url: string;
  title: string;
  year: number;
  runtime: number;
  photo_url: string[];
  backdrops: string[];
  tmdbId: string;
  imdbId: string;
  jwRating: number;
  tomatoMeter: number;
  tomatoCertifiedFresh: boolean;
}

export function fmdbResultToMedia(fmdbResult: FMDBResult): Media {
  return {
    id: Number(fmdbResult.tmdbId),
    type: "movie",
    title: fmdbResult.title,
    overview: null,
    poster_path: fmdbResult.photo_url[0],
    vote_average: null,
    release_date: fmdbResult.year.toString(),
  };
}
