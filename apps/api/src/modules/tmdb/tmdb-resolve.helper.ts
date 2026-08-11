import { toLatin } from "@/shared/helpers/string.helper";

import type { MediaInsert } from "@/modules/media/media.schema";
import { tmdbMovieToMedia, tmdbTVToMedia } from "@/modules/tmdb/tmdb.helper";
import { tmdbRequest } from "@/modules/tmdb/tmdb.service";
import type { TMDBItem, TMDBPaginatedResponse } from "@/modules/tmdb/tmdb.types";

interface TMDBFindResponse {
  movie_results: TMDBItem[];
  tv_results: TMDBItem[];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTmdbById(tmdbId: number, mediaType: "movie" | "tv"): Promise<TMDBItem | null> {
  try {
    const endpoint = mediaType === "tv" ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
    return await tmdbRequest<TMDBItem & { external_ids?: { imdb_id?: string } }>(endpoint, "", {
      append_to_response: "external_ids",
    });
  } catch {
    return null;
  }
}

export async function fetchTmdbByImdbId(imdbId: string): Promise<{ item: TMDBItem; type: "movie" | "tv" } | null> {
  try {
    const result = await tmdbRequest<TMDBFindResponse>(`/find/${imdbId}`, "", { external_source: "imdb_id" });
    if (result.movie_results?.length > 0) return { item: result.movie_results[0], type: "movie" };
    if (result.tv_results?.length > 0) return { item: result.tv_results[0], type: "tv" };
    return null;
  } catch {
    return null;
  }
}

export async function searchTmdbByTitle(
  title: string,
  year: number | null,
  mediaType: "movie" | "tv",
): Promise<TMDBItem | null> {
  try {
    const endpoint = mediaType === "tv" ? "/search/tv" : "/search/movie";
    const options: Record<string, string> = { query: title };
    if (year) {
      options[mediaType === "tv" ? "first_air_date_year" : "year"] = year.toString();
    }
    const result = await tmdbRequest<TMDBPaginatedResponse>(endpoint, "", options);
    return result.results?.[0] ?? null;
  } catch {
    return null;
  }
}

/** Strip enrichment fields and produce a DB insert row. */
export function tmdbItemToMediaInsert(
  item: TMDBItem & { external_ids?: { imdb_id?: string | null } },
  type: "movie" | "tv",
): MediaInsert {
  const mapped = type === "movie" ? tmdbMovieToMedia(item) : tmdbTVToMedia(item);
  const {
    liked: _liked,
    inWatchList: _inWatchList,
    userScore: _userScore,
    userComment: _userComment,
    userReviewAt: _userReviewAt,
    activityAt: _activityAt,
    download: _download,
    progress: _progress,
    ...insertFields
  } = mapped;

  return {
    ...insertFields,
    imdbId: insertFields.imdbId || item.external_ids?.imdb_id || "",
    sanitize_title: toLatin(insertFields.original_title ?? "") ?? insertFields.title,
  };
}
