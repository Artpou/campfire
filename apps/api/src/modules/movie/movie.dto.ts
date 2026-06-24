import z from "zod";

import type { MediaEnriched } from "@/modules/media/media.dto";
import type { TMDBMovieDetails } from "@/modules/tmdb/tmdb.dto";

export type Movie = {
  id: string;
  movie: TMDBMovieDetails;
  media: MediaEnriched;
  collection: Record<string, unknown> | null;
  related: {
    collection: MediaEnriched[];
    recommendations: MediaEnriched[];
  };
};

export const movieIdDto = z.object({
  id: z.string(),
});
export type movieIdQuery = z.infer<typeof movieIdDto>;
