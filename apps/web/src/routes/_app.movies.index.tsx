import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { EyeIcon } from "lucide-react";

import { MediaCarousel } from "@/features/media/components/media-carousel";
import { MediaCategoryCarousel } from "@/features/media/components/media-category-carousel";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaListDropdown } from "@/features/media/components/media-list-dropdown";
import { type MovieList, useMovies, useRecentlyViewed } from "@/features/media/hooks/use-media";

export const Route = createFileRoute("/_app/movies/")({
  component: MoviesPage,
});

function MoviesPage() {
  const [list, setList] = useState<MovieList>("popular");
  const { data: recentlyViewedMovies = [] } = useRecentlyViewed("movie", 20);
  const { data: movies = [], isLoading } = useMovies(list);

  return (
    <div className="container mx-auto space-y-8 p-6 pb-20">
      <MediaCategoryCarousel type="movie" />

      {recentlyViewedMovies.length > 0 && (
        <MediaCarousel
          title={
            <div className="flex items-center gap-2">
              <EyeIcon /> <Trans>Recently Viewed</Trans>
            </div>
          }
          data={recentlyViewedMovies}
        />
      )}

      <div className="space-y-4">
        <MediaListDropdown type="movie" value={list} onValueChange={setList} />
        <MediaGrid items={movies} isLoading={isLoading} />
      </div>
    </div>
  );
}
