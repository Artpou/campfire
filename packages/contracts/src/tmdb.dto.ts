import { z } from "zod";

import { paginationDto } from "./pagination.dto";

export const tmdbListDto = paginationDto.extend({
  locale: z.string().default("en-US"),
});
export type TmdbListQuery = z.infer<typeof tmdbListDto>;

export const tmdbDiscoverDto = tmdbListDto.extend({
  sort_by: z.string().optional(),
  with_release_type: z.string().optional(),
  with_genres: z.string().optional(),
  with_watch_providers: z.string().optional(),
  "primary_release_date.gte": z.string().optional(),
  "primary_release_date.lte": z.string().optional(),
  "first_air_date.gte": z.string().optional(),
  "first_air_date.lte": z.string().optional(),
  with_original_language: z.string().optional(),
  with_keywords: z.string().optional(),
  "with_runtime.gte": z.coerce.number().optional(),
  "with_runtime.lte": z.coerce.number().optional(),
  "vote_average.gte": z.coerce.number().optional(),
});
export type TmdbDiscoverQuery = z.infer<typeof tmdbDiscoverDto>;

export const tmdbSearchDto = tmdbListDto.extend({
  q: z.string().min(1),
});
export type TmdbSearchQuery = z.infer<typeof tmdbSearchDto>;

export const tmdbKeywordsDto = z.object({
  q: z.string().min(1),
});
export type TmdbKeywordsQuery = z.infer<typeof tmdbKeywordsDto>;

export const tmdbTvSeasonDto = z.object({
  id: z.string(),
  number: z.string(),
});
export type TmdbTvSeasonQuery = z.infer<typeof tmdbTvSeasonDto>;

export const tmdbIdDto = z.object({
  id: z.string(),
});
export type TmdbIdQuery = z.infer<typeof tmdbIdDto>;
