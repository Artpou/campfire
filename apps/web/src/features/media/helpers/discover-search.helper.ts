import type { Media } from "@seedarr/sdk";
import { parseNumber, parseString, todayIsoDate } from "@seedarr/shared";

import { splitFilterIds } from "@/features/media/helpers/filter-options.helper";
import type { MovieFiltersValue } from "@/features/movies/components/movie-filters-sheet";
import type { TvFiltersValue } from "@/features/tv/components/tv-filters-sheet";

const MEDIA_SELECTED = ["new", "top-rated", "downloaded", "upcoming"] as const;
type MediaSelected = (typeof MEDIA_SELECTED)[number];

type DiscoverSort = "vote_average.desc" | "popularity.desc";

type DiscoverQueryOptions = {
  sort_by?: DiscoverSort;
  with_genres?: string;
  with_watch_providers?: string;
  with_keywords?: string;
  "with_runtime.gte"?: number;
  "with_runtime.lte"?: number;
  "vote_average.gte"?: number;
};

type SearchRecord = Record<string, unknown>;

export type MovieDiscoverSearch = MovieFiltersValue & {
  selected?: MediaSelected;
  q?: string;
};

export type TvDiscoverSearch = TvFiltersValue & {
  selected?: MediaSelected;
  q?: string;
};

export function isDiscoverTextSearch(q?: string): boolean {
  return (q?.trim().length ?? 0) >= 2;
}

/** Client-side filters applicable to TMDB search results (tabs / providers / keywords ignored). */
export function filterSearchResultsByDiscoverFilters(
  results: Media[],
  filters: {
    with_genres?: string;
    vote_average_gte?: number;
    date_gte?: string;
    date_lte?: string;
    with_runtime_gte?: number;
    with_runtime_lte?: number;
  },
  genreNameById: Map<string, string>,
): Media[] {
  return results.filter((media) => {
    const genreIds = splitFilterIds(filters.with_genres);
    if (genreIds.length > 0) {
      const categories = (media.categories ?? "").toLowerCase();
      const matched = genreIds.some((id) => {
        const name = genreNameById.get(id)?.toLowerCase();
        return name ? categories.includes(name) : false;
      });
      if (!matched) return false;
    }

    if (filters.vote_average_gte != null && (media.vote_average ?? 0) < filters.vote_average_gte) {
      return false;
    }

    if (filters.date_gte && media.release_date && media.release_date < filters.date_gte) return false;
    if (filters.date_lte && media.release_date && media.release_date > filters.date_lte) return false;

    if (filters.with_runtime_gte != null && media.duration != null && media.duration < filters.with_runtime_gte) {
      return false;
    }
    if (filters.with_runtime_lte != null && media.duration != null && media.duration > filters.with_runtime_lte) {
      return false;
    }

    return true;
  });
}

export function isMediaSelected(value: string): value is MediaSelected {
  for (const option of MEDIA_SELECTED) {
    if (option === value) return true;
  }
  return false;
}

function getMediaSelected(value: unknown, fallback: MediaSelected = "new"): MediaSelected {
  if (typeof value === "string" && isMediaSelected(value)) return value;
  return fallback;
}

function parseDiscoverFilters(search: SearchRecord) {
  return {
    with_genres: parseString(search.with_genres),
    with_watch_providers: parseString(search.with_watch_providers),
    selected: getMediaSelected(search.selected),
    with_keywords: parseString(search.with_keywords),
    with_keywords_label: parseString(search.with_keywords_label),
    with_runtime_gte: parseNumber(search.with_runtime_gte),
    with_runtime_lte: parseNumber(search.with_runtime_lte),
    vote_average_gte: parseNumber(search.vote_average_gte),
  };
}

export function validateMovieDiscoverSearch(search: SearchRecord): Partial<MovieDiscoverSearch> {
  return {
    ...parseDiscoverFilters(search),
    q: parseString(search.q),
    release_date_gte: parseString(search.release_date_gte),
    release_date_lte: parseString(search.release_date_lte),
  };
}

export function validateTvDiscoverSearch(search: SearchRecord): Partial<TvDiscoverSearch> {
  return {
    ...parseDiscoverFilters(search),
    q: parseString(search.q),
    first_air_date_gte: parseString(search.first_air_date_gte),
    first_air_date_lte: parseString(search.first_air_date_lte),
  };
}

function sortByForSelected(selected: MediaSelected): DiscoverSort | undefined {
  if (selected === "top-rated") return "vote_average.desc";
  if (selected === "upcoming") return "popularity.desc";
  return undefined;
}

/** "downloaded" tab uses local media list, not TMDB discover. */
export function isDownloadedTab(selected?: MediaSelected): boolean {
  return selected === "downloaded";
}

export function buildMovieDiscoverOptions(search: Partial<MovieDiscoverSearch>) {
  const selected = getMediaSelected(search.selected);
  const today = todayIsoDate();

  return {
    sort_by: sortByForSelected(selected),
    with_genres: selected !== "downloaded" ? search.with_genres : undefined,
    with_watch_providers: selected !== "downloaded" ? search.with_watch_providers : undefined,
    "primary_release_date.gte": search.release_date_gte ?? (selected === "upcoming" ? today : undefined),
    "primary_release_date.lte": search.release_date_lte,
    with_keywords: selected !== "downloaded" ? search.with_keywords : undefined,
    "with_runtime.gte": search.with_runtime_gte,
    "with_runtime.lte": search.with_runtime_lte,
    "vote_average.gte": search.vote_average_gte,
  };
}

export function buildTvDiscoverOptions(search: Partial<TvDiscoverSearch>): DiscoverQueryOptions & {
  "first_air_date.gte"?: string;
  "first_air_date.lte"?: string;
} {
  const selected = getMediaSelected(search.selected);
  const today = todayIsoDate();

  return {
    sort_by: sortByForSelected(selected),
    with_genres: selected !== "downloaded" ? search.with_genres : undefined,
    with_watch_providers: selected !== "downloaded" ? search.with_watch_providers : undefined,
    "first_air_date.gte": search.first_air_date_gte ?? (selected === "upcoming" ? today : undefined),
    "first_air_date.lte": search.first_air_date_lte,
    with_keywords: selected !== "downloaded" ? search.with_keywords : undefined,
    "with_runtime.gte": search.with_runtime_gte,
    "with_runtime.lte": search.with_runtime_lte,
    "vote_average.gte": search.vote_average_gte,
  };
}

export function pickMovieFilters(search: Partial<MovieDiscoverSearch>): MovieFiltersValue {
  const {
    release_date_gte,
    release_date_lte,
    with_genres,
    with_watch_providers,
    with_keywords,
    with_keywords_label,
    with_runtime_gte,
    with_runtime_lte,
    vote_average_gte,
  } = search;

  return {
    release_date_gte,
    release_date_lte,
    with_genres,
    with_watch_providers,
    with_keywords,
    with_keywords_label,
    with_runtime_gte,
    with_runtime_lte,
    vote_average_gte,
  };
}

export function pickTvFilters(search: Partial<TvDiscoverSearch>): TvFiltersValue {
  const {
    first_air_date_gte,
    first_air_date_lte,
    with_genres,
    with_watch_providers,
    with_keywords,
    with_keywords_label,
    with_runtime_gte,
    with_runtime_lte,
    vote_average_gte,
  } = search;

  return {
    first_air_date_gte,
    first_air_date_lte,
    with_genres,
    with_watch_providers,
    with_keywords,
    with_keywords_label,
    with_runtime_gte,
    with_runtime_lte,
    vote_average_gte,
  };
}
