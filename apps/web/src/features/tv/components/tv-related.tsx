import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import type { AppendToResponse, TvShowDetails } from "tmdb-ts";

import { MediaCarousel } from "@/features/media/components/media-carousel";
import { tmdbTVToMedia } from "@/features/media/helpers/media.helper";

interface TvRelatedProps {
  tv: AppendToResponse<TvShowDetails, "recommendations"[], "tvShow">;
}

export function TvRelated({ tv }: TvRelatedProps) {
  const recommendedTV = useMemo(() => {
    const recommendations = tv.recommendations?.results || [];
    if (recommendations.length === 0) return [];
    return recommendations.map((rec) =>
      tmdbTVToMedia({
        id: rec.id,
        // TMDB's Recommendation type uses movie-shaped fields even for TV shows
        name: rec.title,
        original_name: rec.original_title,
        original_language: rec.original_language,
        overview: rec.overview,
        poster_path: rec.poster_path,
        vote_average: rec.vote_average,
        first_air_date: rec.release_date,
      }),
    );
  }, [tv.recommendations]);

  if (recommendedTV.length === 0) return null;

  return <MediaCarousel title={<Trans>Recommended</Trans>} data={recommendedTV} />;
}
