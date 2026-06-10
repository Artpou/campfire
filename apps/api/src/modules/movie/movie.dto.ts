import z from "zod";

import type { Media } from "@/modules/media/media.dto";
import type { TMDBMovieDetails } from "@/modules/tmdb/tmdb.dto";

export type Movie = {
  id: string;
  movie: TMDBMovieDetails;
  media: Media;
  collection: Record<string, unknown> | null;
  related: {
    collection: Media[];
    recommendations: Media[];
  };
};

export const movieIdDto = z.object({
  id: z.string(),
});
export type movieIdQuery = z.infer<typeof movieIdDto>;
