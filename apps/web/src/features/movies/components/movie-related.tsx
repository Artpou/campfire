import { useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { AppendToResponse, CollectionDetails, MovieDetails } from "tmdb-ts";

import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { MediaCarousel } from "@/features/media/components/media-carousel";
import { tmdbMovieToMedia } from "@/features/media/helpers/media.helper";

interface MovieRelatedProps {
  movie: AppendToResponse<MovieDetails, "recommendations"[], "movie">;
  collection: CollectionDetails | null;
}

export function MovieRelated({ movie, collection }: MovieRelatedProps) {
  const [activeTab, setActiveTab] = useState<"collection" | "recommendations">("collection");

  const collectionMovies = useMemo(() => {
    if (!collection?.parts || collection.parts.length <= 1) return [];
    return collection.parts
      .filter((part) => part.id !== movie.id)
      .map(tmdbMovieToMedia)
      .sort((a, b) => a.release_date?.localeCompare(b.release_date || "") || 0);
  }, [collection, movie.id]);

  const recommendedMovies = useMemo(() => {
    const recommendations = movie.recommendations?.results || [];
    if (recommendations.length === 0) return [];
    return recommendations.map(tmdbMovieToMedia);
  }, [movie.recommendations]);

  const hasCollection = collectionMovies.length > 0;
  const hasRecommendations = recommendedMovies.length > 0;

  if (!hasCollection && !hasRecommendations) return null;

  return (
    <section className="container mx-auto px-6 md:px-12 py-8">
      <MediaCarousel
        title={
          hasCollection ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "collection" | "recommendations")}
            >
              <TabsList>
                <TabsTrigger value="collection">
                  <Trans>{collection?.name}</Trans> ({collectionMovies.length})
                </TabsTrigger>
                <TabsTrigger value="recommendations">
                  <Trans>Recommended</Trans> ({recommendedMovies.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <Trans>Related</Trans>
          )
        }
        data={
          activeTab === "recommendations" || !hasCollection ? recommendedMovies : collectionMovies
        }
      />
    </section>
  );
}
