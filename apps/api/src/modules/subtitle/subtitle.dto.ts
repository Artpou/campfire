import { z } from "zod";

export const substitlesSearchDto = z.object({
  tmdb_id: z.string(),
  languages: z.string(),
  type: z.enum(["movie", "tv"]).optional(),
});
export type SubstitlesSearchQuery = z.infer<typeof substitlesSearchDto>;

export const downloadSubtitleDto = z.object({
  downloadId: z.string(),
  url: z.string(),
  language: z.string(),
  mediaTitle: z.string(),
});
export type DownloadSubtitleInput = z.infer<typeof downloadSubtitleDto>;

// SUBDL API response types
export interface SubdlSubtitle {
  release_name: string;
  name: string;
  lang: string;
  author: string;
  url: string;
  subtitlePage: string;
  season: number | null;
  episode: number | null;
  language: string;
  hi: boolean;
  episode_from: number | null;
  episode_end: number;
  full_season: boolean;
}

export interface SubdlSearchResult {
  sd_id: number;
  type: string;
  name: string;
  imdb_id: string | null;
  tmdb_id: number;
  first_air_date: string | null;
  slug: string;
  release_date: string | null;
  year: number | null;
}

export interface SubdlSearchResponse {
  status: boolean;
  results: SubdlSearchResult[];
  subtitles: SubdlSubtitle[];
  totalPages: number;
  currentPage: number;
}
