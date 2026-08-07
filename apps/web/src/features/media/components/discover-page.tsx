import type { ReactNode } from "react";

import type { Media } from "@seedarr/sdk";
import type { InfiniteData, UseInfiniteQueryOptions } from "@tanstack/react-query";
import { useInfiniteQuery } from "@tanstack/react-query";

import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { PlaceholderEmpty } from "@/shared/components/seedarr-placeholder";
import { Container } from "@/shared/ui/container";

import { HeroCarousel } from "@/features/media/components/hero-carousel";
import { MediaCategoryCarousel } from "@/features/media/components/media-category-carousel";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaSortTabs } from "@/features/media/components/media-sort-tabs";

type MediaSelected = "home" | "cinema" | "top-rated" | "upcoming";

type DiscoverPageResult = {
  results: Media[];
  page: number;
  totalPages: number;
};

type DiscoverQueryOptions = UseInfiniteQueryOptions<
  DiscoverPageResult,
  Error,
  InfiniteData<DiscoverPageResult>,
  readonly unknown[],
  number
>;

type DiscoverPageProps<TSearch extends { selected?: MediaSelected; with_genres?: string }> = {
  type: "movie" | "tv";
  search: TSearch;
  queryOptions: object;
  onSearchChange: (value: Partial<TSearch>) => void;
  providerTabs: ReactNode;
  filtersSheet: ReactNode;
  emptyTitle: ReactNode;
  emptySubtitle: ReactNode;
};

export function DiscoverPage<TSearch extends { selected?: MediaSelected; with_genres?: string }>({
  type,
  search,
  queryOptions,
  onSearchChange,
  providerTabs,
  filtersSheet,
  emptyTitle,
  emptySubtitle,
}: DiscoverPageProps<TSearch>) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useInfiniteQuery(
    queryOptions as DiscoverQueryOptions,
  );
  const results = data?.pages.flatMap((page) => page.results) ?? [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <>
      <HeroCarousel type={type} />
      <Container>
        <MediaCategoryCarousel
          type={type}
          onValueChange={(value) => onSearchChange({ with_genres: value } as Partial<TSearch>)}
        />
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
          {isPending ? (
            <div className="flex min-h-48 items-center justify-center">
              <SeedarrLoader />
            </div>
          ) : results.length === 0 ? (
            <PlaceholderEmpty title={emptyTitle} subtitle={emptySubtitle} />
          ) : (
            <MediaGrid items={results} isLoading={isFetchingNextPage} onLoadMore={handleLoadMore} />
          )}
        </div>
      </Container>
    </>
  );
}
