import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media, Movie } from "@seedarr/sdk";

import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { MediaCarousel } from "@/features/media/components/media-carousel";

interface MovieRelatedProps {
  collection: Movie["collection"];
  collectionMedia: Media[];
  recommendedMovies: Media[];
}

export function MovieRelated({ collection, collectionMedia, recommendedMovies }: MovieRelatedProps) {
  const [activeTab, setActiveTab] = useState<"collection" | "recommendations">("collection");

  const hasCollection = collectionMedia.length > 0;
  const hasRecommendations = recommendedMovies.length > 0;

  if (!hasCollection && !hasRecommendations) return null;

  return (
    <MediaCarousel
      title={
        hasCollection ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "collection" | "recommendations")}>
            <TabsList>
              <TabsTrigger value="collection">
                <Trans>{typeof collection?.name === "string" ? collection.name : ""}</Trans> ({collectionMedia.length})
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
      data={activeTab === "recommendations" || !hasCollection ? recommendedMovies : collectionMedia}
    />
  );
}
