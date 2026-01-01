import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EyeIcon } from "lucide-react";
import { SortOption } from "tmdb-ts";

import { Container } from "@/shared/ui/container";

import { MediaCarousel } from "@/features/media/components/media-carousel";
import { MediaCategoryCarousel } from "@/features/media/components/media-category-carousel";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaSortTabs } from "@/features/media/components/media-sort-tabs";
import { useRecentlyViewed } from "@/features/media/hooks/use-media";
import { TVProviderTabs } from "@/features/tv/components/tv-provider-tabs";
import { useTVDiscover } from "@/features/tv/hook/use-tv";

export interface TVSearchParams {
  sort_by?: SortOption;
  with_genres?: string;
  with_watch_providers?: string;
  with_release_type?: string;
}

export const Route = createFileRoute("/_app/tv")({
  component: TVPage,
  validateSearch: (search: Record<string, unknown>): TVSearchParams => {
    return {
      sort_by: typeof search.sort_by === "string" ? (search.sort_by as SortOption) : undefined,
      with_genres: typeof search.with_genres === "string" ? search.with_genres : undefined,
      with_watch_providers:
        typeof search.with_watch_providers === "string" ? search.with_watch_providers : undefined,
      with_release_type:
        typeof search.with_release_type === "string" ? search.with_release_type : undefined,
    };
  },
});

function TVPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { data: recentlyViewedData } = useRecentlyViewed("tv", 20);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useTVDiscover(search);

  const recentlyViewedTV = useMemo(() => {
    return recentlyViewedData?.pages.flatMap((page) => page.results) ?? [];
  }, [recentlyViewedData]);

  const tvShows = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) ?? [];
  }, [data]);

  const handleSearchChange = (updates: Partial<TVSearchParams>) => {
    navigate({
      to: "/tv",
      search: {
        ...search,
        ...updates,
      },
    });
  };

  const handleReleaseTypeChange = (updates: {
    with_release_type: string;
    release_date: { lte: string };
  }) => {
    navigate({
      to: "/tv",
      search: {
        ...search,
        with_release_type: updates.with_release_type,
        sort_by: undefined,
      },
    });
  };

  const handleSortChange = (updates: { sort_by: SortOption }) => {
    navigate({
      to: "/tv",
      search: {
        ...search,
        sort_by: updates.sort_by,
        with_release_type: undefined,
      },
    });
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <Container>
      <MediaCategoryCarousel type="tv" onValueChange={handleSearchChange} />

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
        <div className="flex items-center justify-between gap-4">
          <MediaSortTabs
            sortValue={search.sort_by}
            releaseValue={search.with_release_type}
            onSortChange={handleSortChange}
            onReleaseChange={handleReleaseTypeChange}
          />
          <TVProviderTabs value={search.with_watch_providers} onValueChange={handleSearchChange} />
        </div>
        <MediaGrid
          items={tvShows}
          isLoading={isLoading || isFetchingNextPage}
          onLoadMore={handleLoadMore}
        />
      </div>
    </Container>
  );
}
