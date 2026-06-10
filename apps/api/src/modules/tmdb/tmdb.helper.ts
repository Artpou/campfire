import { toLatin } from "@/helpers/string.helper";
import type { Media, MediaInsert } from "@/modules/media/media.dto";
import type { TMDBGenre, TMDBItem } from "./tmdb.dto";

export function formatCategories(
  genres?: TMDBGenre[],
  genreIds?: number[],
  genreMap?: Map<number, string>,
): string | null {
  if (genres && genres.length > 0) {
    return genres.map((g) => g.name).join(", ");
  }
  if (genreIds && genreIds.length > 0 && genreMap) {
    const names = genreIds.map((id) => genreMap.get(id)).filter((name): name is string => !!name);
    return names.length > 0 ? names.join(", ") : null;
  }
  return null;
}

interface MediaExtraFields {
  duration?: number | null;
  seasons_number?: number | null;
  categories?: string | null;
}

function toMedia(item: TMDBItem, type: "movie" | "tv", extra: MediaExtraFields = {}): Media {
  const title = type === "movie" ? (item.title ?? item.original_title ?? "") : (item.name ?? item.original_name ?? "");
  const originalTitle = type === "movie" ? (item.original_title ?? null) : (item.original_name ?? null);
  const releaseDate = type === "movie" ? (item.release_date ?? null) : (item.first_air_date ?? null);

  return {
    id: Number(item.id),
    type,
    title,
    original_title: originalTitle,
    sanitize_title: toLatin(originalTitle ?? "") ?? title,
    original_language: item.original_language ?? null,
    overview: item.overview ?? null,
    poster_path: item.poster_path ?? null,
    vote_average: item.vote_average ?? null,
    release_date: releaseDate,
    duration: extra.duration ?? null,
    seasons_number: extra.seasons_number ?? null,
    categories: extra.categories ?? null,
    backdrop_path: item.backdrop_path ?? null,
    likes: 0,
    watchList: 0,
  };
}

function toMediaInsert(
  item: TMDBItem & {
    us_title?: string;
    runtime?: number | null;
    number_of_seasons?: number | null;
    genres?: TMDBGenre[];
  },
  type: "movie" | "tv",
  extra: MediaExtraFields = {},
): MediaInsert {
  const title = type === "movie" ? (item.title ?? item.original_title ?? "") : (item.name ?? item.original_name ?? "");
  const originalTitle = type === "movie" ? (item.original_title ?? null) : (item.original_name ?? null);
  const releaseDate = type === "movie" ? (item.release_date ?? null) : (item.first_air_date ?? null);

  const duration = extra.duration ?? (type === "movie" ? (item.runtime ?? null) : null);
  const seasonsNumber = extra.seasons_number ?? (type === "tv" ? (item.number_of_seasons ?? null) : null);
  const categories = extra.categories ?? formatCategories(item.genres);

  return {
    id: Number(item.id),
    type,
    title,
    original_title: originalTitle,
    sanitize_title: toLatin(originalTitle ?? "") ?? item.us_title ?? title,
    original_language: item.original_language ?? null,
    overview: item.overview ?? null,
    poster_path: item.poster_path ?? null,
    vote_average: item.vote_average ?? null,
    release_date: releaseDate,
    duration,
    seasons_number: seasonsNumber,
    categories,
  };
}

export function tmdbMovieToMedia(item: TMDBItem, genreMap?: Map<number, string>): Media {
  return toMedia(item, "movie", {
    categories: formatCategories(undefined, item.genre_ids, genreMap),
  });
}

export function tmdbMovieToMediaInsert(
  item: TMDBItem & { us_title?: string; runtime?: number | null; genres?: TMDBGenre[] },
): MediaInsert {
  return toMediaInsert(item, "movie");
}

export function tmdbTVToMedia(item: TMDBItem, genreMap?: Map<number, string>): Media {
  return toMedia(item, "tv", {
    categories: formatCategories(undefined, item.genre_ids, genreMap),
  });
}

export function tmdbTVToMediaInsert(
  item: TMDBItem & {
    us_title?: string;
    number_of_seasons?: number | null;
    genres?: TMDBGenre[];
    episode_run_time?: number[];
  },
): MediaInsert {
  const duration = item.episode_run_time?.[0] ?? null;
  return toMediaInsert(item, "tv", { duration, seasons_number: item.number_of_seasons ?? null });
}

// biome-ignore lint/suspicious/noExplicitAny: fmdbResult is any
export function fmdbResultToMedia(fmdbResult: any): Media {
  return {
    id: Number(fmdbResult.tmdbId),
    type: "movie",
    title: fmdbResult.title,
    original_title: null,
    sanitize_title: null,
    original_language: null,
    overview: null,
    poster_path: fmdbResult.photo_url[0] ?? null,
    vote_average: null,
    release_date: fmdbResult.year.toString(),
    backdrop_path: null,
    duration: null,
    seasons_number: null,
    categories: null,
    watchList: 0,
    likes: 0,
  };
}
