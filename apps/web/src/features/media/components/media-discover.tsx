import type { ReactNode } from "react";

import type { Media } from "@seedarr/sdk";
import type { InfiniteData, UseInfiniteQueryOptions } from "@tanstack/react-query";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { PlaceholderEmpty } from "@/shared/components/seedarr-placeholder";
import { Container } from "@/shared/ui/container";

import { useRole } from "@/features/auth/hooks/use-role";
import { MediaCarouselCategory } from "@/features/media/components/carousel/media-carousel-category";
import { MediaHeroCarousel } from "@/features/media/components/carousel/media-carousel-hero";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaSortTabs } from "@/features/media/components/tabs/media-tabs-sort";
import { RequestCarousel } from "@/features/request/components/request-carousel";
import { requestQueries } from "@/features/request/hooks/request.queries";

type MediaSelected = "home" | "cinema" | "top-rated" | "upcoming";

type DiscoverResult = {
  results: Media[];
  page: number;
  totalPages: number;
};

type DiscoverQueryOptions = UseInfiniteQueryOptions<
  DiscoverResult,
  Error,
  InfiniteData<DiscoverResult>,
  readonly unknown[],
  number
>;

type MediaDiscover<TSearch extends { selected?: MediaSelected; with_genres?: string }> = {
  type: "movie" | "tv";
  search: TSearch;
  queryOptions: object;
  onSearchChange: (value: Partial<TSearch>) => void;
  providerTabs: ReactNode;
  filtersSheet: ReactNode;
  emptyTitle: ReactNode;
  emptySubtitle: ReactNode;
};

export function MediaDiscover<TSearch extends { selected?: MediaSelected; with_genres?: string }>({
  type,
  search,
  queryOptions,
  onSearchChange,
  providerTabs,
  filtersSheet,
  emptyTitle,
  emptySubtitle,
}: MediaDiscover<TSearch>) {
  const { isAdmin } = useRole();
  const { data: pendingRequests } = useQuery({
    ...requestQueries.byType(type),
    enabled: isAdmin,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useInfiniteQuery(
    queryOptions as DiscoverQueryOptions,
  );
  const results = data?.pages.flatMap((page) => page.results) ?? [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <>
      <MediaHeroCarousel type={type} />
      <Container>
        {isAdmin && pendingRequests && pendingRequests.length > 0 && (
          <RequestCarousel
            requests={pendingRequests}
            seeMoreTo={type === "movie" ? "/movies/requests" : "/tv/requests"}
          />
        )}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <MediaSortTabs
              value={search.selected}
              onChange={(value) => onSearchChange({ selected: value } as Partial<TSearch>)}
              type={type}
            />
            <div className="flex items-center gap-2">
              {search.selected !== "cinema" && providerTabs}
              {filtersSheet}
            </div>
          </div>
          <MediaCarouselCategory
            type={type}
            onValueChange={(value) => onSearchChange({ with_genres: value } as Partial<TSearch>)}
          />
          {isPending ? (
            <MediaGrid items={[]} isLoading />
          ) : results.length === 0 ? (
            <PlaceholderEmpty title={emptyTitle} subtitle={emptySubtitle} />
          ) : (
            <MediaGrid items={results} isLoading={isFetchingNextPage} onLoadMore={handleLoadMore} hideType />
          )}
        </div>
      </Container>
    </>
  );
}
