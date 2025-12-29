import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { EyeIcon } from "lucide-react";

import { MediaCarousel } from "@/features/media/components/media-carousel";
import { MediaCategoryCarousel } from "@/features/media/components/media-category-carousel";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaListDropdown } from "@/features/media/components/media-list-dropdown";
import { type TVList, useRecentlyViewed, useTV } from "@/features/media/hooks/use-media";

export const Route = createFileRoute("/_app/tv")({
  component: TVPage,
});

function TVPage() {
  const [category, setCategory] = useState<TVList>("popular");
  const { data: recentlyViewedTV = [] } = useRecentlyViewed("tv", 20);
  const { data: tvShows = [], isLoading } = useTV(category);

  return (
    <div className="container mx-auto space-y-8 p-6 pb-20">
      <MediaCategoryCarousel type="tv" />

      {recentlyViewedTV.length > 0 && (
        <MediaCarousel
          title={
            <div className="flex items-center gap-2">
              <EyeIcon /> <Trans>Recently Viewed</Trans>
            </div>
          }
          data={recentlyViewedTV}
        />
      )}

      <div className="space-y-4">
        <MediaListDropdown type="tv" value={category} onValueChange={setCategory} />
        <MediaGrid items={tvShows} isLoading={isLoading} />
      </div>
    </div>
  );
}
