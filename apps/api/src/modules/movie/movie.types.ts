import type { MediaEnriched } from "@/modules/media/media.types";
import type { TMDBMovieDetails } from "@/modules/tmdb/tmdb.types";

export type Movie = {
  id: string;
  movie: TMDBMovieDetails;
  media: MediaEnriched;
  imdbRating: number | null;
  collection: Record<string, unknown> | null;
  related: {
    collection: MediaEnriched[];
    recommendations: MediaEnriched[];
  };
};
