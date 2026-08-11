import { toLatin } from "@/shared/helpers/string.helper";

import type { MediaEnriched } from "@/modules/media/media.types";
import type { TMDBGenre, TMDBItem } from "./tmdb.types";

function formatCategories(genres?: TMDBGenre[], genreIds?: number[], genreMap?: Map<number, string>): string | null {
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

function toMedia(
  item: TMDBItem & {
    us_title?: string;
    runtime?: number | null;
    number_of_seasons?: number | null;
    genres?: TMDBGenre[];
    external_ids?: { imdb_id?: string | null };
  },
  type: "movie" | "tv",
  extra: MediaExtraFields = {},
): MediaEnriched {
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
    sanitize_title: toLatin(originalTitle ?? "") ?? title,
    original_language: item.original_language ?? null,
    overview: item.overview ?? null,
    poster_path: item.poster_path ?? null,
    vote_average: item.vote_average ?? null,
    release_date: releaseDate,
    duration,
    seasons_number: seasonsNumber,
    categories,
    backdrop_path: item.backdrop_path ?? null,
    imdbId: item.imdb_id ?? item.external_ids?.imdb_id ?? "",
    liked: false,
    inWatchList: false,
    userScore: null,
    userComment: null,
    userReviewAt: null,
  };
}

export function tmdbMovieToMedia(item: TMDBItem, genreMap?: Map<number, string>): MediaEnriched {
  return toMedia(item, "movie", {
    categories: formatCategories(undefined, item.genre_ids, genreMap),
  });
}

export function tmdbTVToMedia(item: TMDBItem, genreMap?: Map<number, string>): MediaEnriched {
  return toMedia(item, "tv", {
    categories: formatCategories(undefined, item.genre_ids, genreMap),
  });
}
