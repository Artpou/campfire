import { Trans } from "@lingui/react/macro";
import type { Media, Movie } from "@seedarr/sdk";
import { LibraryIcon, SparklesIcon } from "lucide-react";

import { MediaCarousel } from "@/features/media/components/carousel/media-carousel";

interface MovieRelatedProps {
  collection: Movie["collection"];
  collectionMedia: Media[];
  recommendedMovies: Media[];
}

export function MovieRelated({ collection, collectionMedia, recommendedMovies }: MovieRelatedProps) {
  const hasCollection = collectionMedia.length > 0;
  const hasRecommendations = recommendedMovies.length > 0;

  if (!hasCollection && !hasRecommendations) return null;

  return (
    <>
      {hasCollection && (
        <MediaCarousel
          title={
            <span className="flex items-center gap-2">
              <LibraryIcon className="size-5" />
              {typeof collection?.name === "string" ? collection.name : <Trans>Collection</Trans>}
            </span>
          }
          data={collectionMedia}
        />
      )}
      {hasRecommendations && (
        <MediaCarousel
          title={
            <span className="flex items-center gap-2">
              <SparklesIcon className="size-5" />
              <Trans>Recommended</Trans>
            </span>
          }
          data={recommendedMovies}
        />
      )}
    </>
  );
}
