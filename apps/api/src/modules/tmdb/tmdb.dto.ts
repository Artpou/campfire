import z from "zod";

import { paginationDto } from "@/shared/helpers/pagination.dto";

export interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language?: string;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number | null;
  release_date?: string | null;
  first_air_date?: string | null;
  media_type?: string;
  genre_ids?: number[];
  imdb_id?: string;
}

export interface TMDBPaginatedResponse<T = TMDBItem> {
  results: T[];
  page: number;
  total_pages: number;
  total_results: number;
}

export interface TMDBWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority?: number;
}

export interface TMDBWatchProviders {
  results?: Record<
    string,
    {
      flatrate?: TMDBWatchProvider[];
      buy?: TMDBWatchProvider[];
      rent?: TMDBWatchProvider[];
    }
  >;
}

export interface TMDBCredits {
  cast?: TMDBCastMember[];
  crew?: TMDBCrewMember[];
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
  order?: number;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job?: string;
  department?: string;
  profile_path?: string | null;
}

export interface TMDBMovieDetails extends TMDBItem {
  belongs_to_collection?: { id: number; name: string } | null;
  alternative_titles?: {
    titles?: { iso_3166_1: string; type: string; title: string }[];
  };
  recommendations?: TMDBPaginatedResponse;
  runtime?: number | null;
  genres?: TMDBGenre[];
  status?: string;
  budget?: number;
  revenue?: number;
  tagline?: string;
  production_companies?: Array<{ id?: number; name: string }>;
  external_ids?: { imdb_id?: string };
  "watch/providers"?: TMDBWatchProviders;
  credits?: TMDBCredits;
  videos?: TMDBVideosResponse;
}

export interface TMDBTvDetails extends TMDBItem {
  recommendations?: TMDBPaginatedResponse;
  episode_run_time?: number[];
  number_of_seasons?: number | null;
  number_of_episodes?: number;
  genres?: TMDBGenre[];
  status?: string;
  tagline?: string;
  networks?: Array<{ id?: number; name: string }>;
  production_companies?: Array<{ id?: number; name: string }>;
  external_ids?: { imdb_id?: string };
  last_episode_to_air?: { air_date?: string; episode_number?: number; season_number?: number };
  next_episode_to_air?: { air_date?: string; episode_number?: number; season_number?: number };
  created_by?: Array<{ id: number; name: string; profile_path?: string | null }>;
  "watch/providers"?: TMDBWatchProviders;
  credits?: TMDBCredits;
  seasons?: TMDBSeason[];
  videos?: TMDBVideosResponse;
}

export interface TMDBSeason {
  season_number: number;
  episode_count?: number;
  name?: string;
  air_date?: string;
  poster_path?: string | null;
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  name: string;
  still_path?: string | null;
  overview?: string;
  runtime?: number;
  air_date?: string;
}

export interface TMDBSeasonDetails {
  id: number;
  season_number: number;
  name?: string;
  episodes: TMDBEpisode[];
}

export interface TMDBGenresResponse {
  genres: { id: number; name: string }[];
}

export interface TMDBProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priorities: Record<string, number>;
}

export interface TMDBProvidersResponse {
  results: TMDBProvider[];
}

export interface TMDBKeywordResult {
  id: number;
  name: string;
}

export interface TMDBVideo {
  iso_639_1: string;
  iso_3166_1: string;
  name: string;
  key: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
}

export interface TMDBVideosResponse {
  id: number;
  results: TMDBVideo[];
}

export type FetchOptions = Record<string, string | string[] | undefined>;

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

export const tmdbListDto = paginationDto.extend({
  locale: z.string().default("en-US"),
});
export type tmdbListQuery = z.infer<typeof tmdbListDto>;

export const tmdbDiscoverDto = tmdbListDto.extend({
  sort_by: z.string().optional(),
  with_release_type: z.string().optional(),
  with_genres: z.string().optional(),
  with_watch_providers: z.string().optional(),
  "primary_release_date.gte": z.string().optional(),
  "primary_release_date.lte": z.string().optional(),
  with_original_language: z.string().optional(),
  with_keywords: z.string().optional(),
  "with_runtime.gte": z.number().optional(),
  "with_runtime.lte": z.number().optional(),
  "vote_average.gte": z.number().optional(),
});
export type tmdbDiscoverQuery = z.infer<typeof tmdbDiscoverDto>;

export const tmdbSearchDto = tmdbListDto.extend({
  q: z.string().min(1),
});
export type tmdbSearchQuery = z.infer<typeof tmdbSearchDto>;

export const tmdbKeywordsDto = z.object({
  q: z.string().min(1),
});
export type tmdbKeywordsQuery = z.infer<typeof tmdbKeywordsDto>;

export const tmdbTvSeasonDto = z.object({
  id: z.string(),
  number: z.string(),
});
export type tmdbTvSeasonQuery = z.infer<typeof tmdbTvSeasonDto>;

export const tmdbIdDto = z.object({
  id: z.string(),
});
export type tmdbIdQuery = z.infer<typeof tmdbIdDto>;

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBPersonCreditCast {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date?: string | null;
  first_air_date?: string | null;
  overview: string | null;
  character: string | null;
  media_type: "movie" | "tv";
  genre_ids: number[];
  popularity: number;
  credit_id: string;
  order?: number;
}

export interface TMDBPersonCreditCrew {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date?: string | null;
  first_air_date?: string | null;
  overview: string | null;
  department: string;
  job: string;
  media_type: "movie" | "tv";
  genre_ids: number[];
  popularity: number;
  credit_id: string;
}

export interface TMDBPersonCredits {
  cast: TMDBPersonCreditCast[];
  crew: TMDBPersonCreditCrew[];
}

export interface TMDBPersonDetails {
  id: number;
  name: string;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string | null;
  also_known_as: string[];
  gender: number;
  popularity: number;
  imdb_id: string | null;
  homepage: string | null;
  combined_credits?: TMDBPersonCredits;
}
