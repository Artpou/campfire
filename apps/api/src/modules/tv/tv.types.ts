import type { MediaEnriched } from "@/modules/media/media.types";
import type { TMDBTvDetails } from "@/modules/tmdb/tmdb.types";

export type TV = {
  id: string;
  tv: TMDBTvDetails;
  media: MediaEnriched;
  imdbRating: number | null;
  collection: Record<string, unknown> | null;
  related: {
    collection: MediaEnriched[];
    recommendations: MediaEnriched[];
  };
};
