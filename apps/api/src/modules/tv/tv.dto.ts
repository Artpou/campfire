import type { MediaEnriched } from "@/modules/media/media.dto";
import { TMDBTvDetails } from "@/modules/tmdb/tmdb.dto";

export type TV = {
  id: string;
  tv: TMDBTvDetails;
  media: MediaEnriched;
  collection: Record<string, unknown> | null;
  related: {
    collection: MediaEnriched[];
    recommendations: MediaEnriched[];
  };
};
