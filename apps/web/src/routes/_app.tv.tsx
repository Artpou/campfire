import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EyeIcon } from "lucide-react";
import { SortOption } from "tmdb-ts";

import { Container } from "@/shared/ui/container";

import { MediaCarousel } from "@/features/media/components/media-carousel";
import { MediaCategoryCarousel } from "@/features/media/components/media-category-carousel";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaSelected, MediaSortTabs } from "@/features/media/components/media-sort-tabs";
import { useMedias } from "@/features/media/hooks/use-media";
import { TVProviderTabs } from "@/features/tv/components/tv-provider-tabs";
import { useTVDiscover } from "@/features/tv/hook/use-tv";

export interface TVSearchParams {
  with_genres?: string;
  with_watch_providers?: string;
  selected?: MediaSelected;
}

export const Route = createFileRoute("/_app/tv")({
  component: TVPage,
  validateSearch: (search: Record<string, unknown>): TVSearchParams => {
    const { with_genres, with_watch_providers, selected } = search;
    return {
      with_genres: typeof with_genres === "string" ? with_genres : undefined,
      with_watch_providers:
        typeof with_watch_providers === "string" ? with_watch_providers : undefined,
      selected: typeof selected === "string" ? (selected as MediaSelected) : undefined,
    };
  },
});

function TVPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const sort_by: SortOption | undefined = useMemo(() => {
    return search.selected === "top-rated"
      ? "vote_average.desc"
      : search.selected === "upcoming"
        ? "popularity.desc"
        : undefined;
  }, [search.selected]);

  const { after_date } = useMemo(() => {
    return {
      after_date:
        search.selected === "upcoming" ? new Date().toISOString().split("T")[0] : undefined,
    };
  }, [search]);

  const { results: recentlyViewedTV } = useMedias({ type: "tv", filter: "recently-viewed" });
  const {
    results: tvShows,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTVDiscover({
    sort_by,
    with_genres: search.with_genres,
    with_watch_providers: search.with_watch_providers,
    "first_air_date.gte": after_date,
  });

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleSearchChange = (value: TVSearchParams) => {
    navigate({
      to: "/tv",
      search: {
        ...search,
        ...value,
      },
    });
  };

  return (
    <Container>
      <MediaCategoryCarousel
        type="tv"
        onValueChange={(value) => handleSearchChange({ with_genres: value })}
      />

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
            value={search.selected}
            onChange={(value) => handleSearchChange({ selected: value })}
            type="tv"
          />
          {search.selected !== "cinema" && (
            <TVProviderTabs
              value={search.with_watch_providers}
              onValueChange={(value) => handleSearchChange(value)}
            />
          )}
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
