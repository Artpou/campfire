import { Media } from "@/modules/media/media.dto";
import { TMDBTvDetails } from "@/modules/tmdb/tmdb.dto";

export type TV = {
  id: string;
  tv: TMDBTvDetails;
  media: Media;
  collection: Record<string, unknown> | null;
  related: {
    collection: Media[];
    recommendations: Media[];
  };
};
