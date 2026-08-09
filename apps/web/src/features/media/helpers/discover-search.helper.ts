import { parseNumber, parseString, todayIsoDate } from "@seedarr/shared";

import type { MovieFiltersValue } from "@/features/movies/components/movie-filters-sheet";
import type { TvFiltersValue } from "@/features/tv/components/tv-filters-sheet";

const MEDIA_SELECTED = ["home", "cinema", "top-rated", "upcoming"] as const;
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
};

export type TvDiscoverSearch = TvFiltersValue & {
  selected?: MediaSelected;
};

export function isMediaSelected(value: string): value is MediaSelected {
  for (const option of MEDIA_SELECTED) {
    if (option === value) return true;
  }
  return false;
}

function getMediaSelected(value: unknown, fallback: MediaSelected = "home"): MediaSelected {
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
    release_date_gte: parseString(search.release_date_gte),
    release_date_lte: parseString(search.release_date_lte),
  };
}

export function validateTvDiscoverSearch(search: SearchRecord): Partial<TvDiscoverSearch> {
  return {
    ...parseDiscoverFilters(search),
    first_air_date_gte: parseString(search.first_air_date_gte),
    first_air_date_lte: parseString(search.first_air_date_lte),
  };
}

function sortByForSelected(selected: MediaSelected): DiscoverSort | undefined {
  if (selected === "top-rated") return "vote_average.desc";
  if (selected === "upcoming") return "popularity.desc";
  return undefined;
}

export function buildMovieDiscoverOptions(search: Partial<MovieDiscoverSearch>) {
  const selected = getMediaSelected(search.selected);
  const today = todayIsoDate();

  return {
    sort_by: sortByForSelected(selected),
    with_release_type: selected === "home" ? "4|5" : selected === "cinema" ? "3" : undefined,
    with_genres: search.with_genres,
    with_watch_providers: search.with_watch_providers,
    "primary_release_date.gte": search.release_date_gte ?? (selected === "upcoming" ? today : undefined),
    "primary_release_date.lte": search.release_date_lte,
    with_keywords: search.with_keywords,
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
    with_genres: search.with_genres,
    with_watch_providers: search.with_watch_providers,
    "first_air_date.gte": search.first_air_date_gte ?? (selected === "upcoming" ? today : undefined),
    "first_air_date.lte": search.first_air_date_lte,
    with_keywords: search.with_keywords,
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
