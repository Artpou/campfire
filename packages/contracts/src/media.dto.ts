import { z } from "zod";

import { mediaTypeEnum } from "./enums";
import { paginationDto } from "./pagination.dto";

export const mediaInputSchema = z.object({
  id: z.number().int(),
  imdbId: z.string(),
  type: z.enum(mediaTypeEnum),
  title: z.string(),
  original_title: z.string().nullable().optional(),
  sanitize_title: z.string().nullable().optional(),
  original_language: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  vote_average: z.number().nullable().optional(),
  release_date: z.string().nullable().optional(),
  duration: z.number().int().nullable().optional(),
  seasons_number: z.number().int().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  categories: z.string().nullable().optional(),
});
export type MediaInput = z.infer<typeof mediaInputSchema>;

export const listMediaDto = paginationDto.extend({
  type: z.enum(mediaTypeEnum).optional(),
  filter: z.enum(["like", "watch-list", "downloaded"]).optional(),
});
export type ListMediaQuery = z.infer<typeof listMediaDto>;

export const updateProgressDto = z.object({
  position: z.number().int().min(0),
  duration: z.number().int().min(0),
  downloadId: z.string().optional(),
});
export type UpdateProgressQuery = z.infer<typeof updateProgressDto>;
