import { type ReactNode, useEffect, useMemo, useState } from "react";

import type { Media } from "@seedarr/sdk";
import type { InfiniteData, UseInfiniteQueryOptions } from "@tanstack/react-query";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";

import { PlaceholderEmpty } from "@/shared/components/seedarr-placeholder";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";

import { useRole } from "@/features/auth/hooks/use-role";
import { MediaButtonCategory } from "@/features/media/components/button/media-button-category";
import { MediaCarouselCategory } from "@/features/media/components/carousel/media-carousel-category";
import { MediaCarouselWatching } from "@/features/media/components/carousel/media-carousel-watching";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaTable } from "@/features/media/components/media-table";
import { MediaSortTabs } from "@/features/media/components/tabs/media-tabs-sort";
import { MediaTabsViewMode } from "@/features/media/components/tabs/media-tabs-view-mode";
import {
  filterSearchResultsByDiscoverFilters,
  isDiscoverTextSearch,
  isDownloadedTab,
} from "@/features/media/helpers/discover-search.helper";
import { genreQueries } from "@/features/media/hooks/genre.queries";
import { RequestCarousel } from "@/features/request/components/request-carousel";
import { requestQueries } from "@/features/request/hooks/request.queries";
import { useEffectiveViewMode } from "@/features/settings/hooks/use-effective-view-mode";
import { useUserPreferences } from "@/features/settings/stores/user-preference-store";

type MediaSelected = "new" | "top-rated" | "downloaded" | "upcoming";

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

type MediaDiscoverSearch = {
  selected?: MediaSelected;
  with_genres?: string;
  q?: string;
  vote_average_gte?: number;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  release_date_gte?: string;
  release_date_lte?: string;
  first_air_date_gte?: string;
  first_air_date_lte?: string;
};

type MediaDiscover<TSearch extends MediaDiscoverSearch> = {
  type: "movie" | "tv";
  search: TSearch;
  queryOptions: object;
  onSearchChange: (value: Partial<TSearch>) => void;
  filtersSheet: ReactNode;
  emptyTitle: ReactNode;
  emptySubtitle: ReactNode;
  searchPlaceholder: string;
};

export function MediaDiscover<TSearch extends MediaDiscoverSearch>({
  type,
  search,
  queryOptions,
  onSearchChange,
  filtersSheet,
  emptyTitle,
  emptySubtitle,
  searchPlaceholder,
}: MediaDiscover<TSearch>) {
  const locale = useTmdbLocale();
  const { isAdmin } = useRole();
  const viewMode = useEffectiveViewMode();
  const showCategories = useUserPreferences((s) => s.showCategories);
  const isDownloaded = isDownloadedTab(search.selected);

  const [query, setQuery] = useState(search.q ?? "");
  const debouncedQuery = useDebounce(query, 300);
  const isSearching = isDiscoverTextSearch(search.q);

  useEffect(() => {
    setQuery(search.q ?? "");
  }, [search.q]);

  useEffect(() => {
    const next = debouncedQuery.trim() || undefined;
    if ((search.q ?? undefined) === next) return;
    onSearchChange({ q: next } as Partial<TSearch>);
  }, [debouncedQuery, onSearchChange, search.q]);

  const { data: pendingRequests } = useQuery({
    ...requestQueries.byType(type),
    enabled: isAdmin,
  });

  const { data: genres = [] } = useQuery({
    ...genreQueries.list(type, locale),
    enabled: isSearching,
  });

  const genreNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const genre of genres) map.set(genre.id.toString(), genre.name);
    return map;
  }, [genres]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useInfiniteQuery(
    queryOptions as DiscoverQueryOptions,
  );
  const rawResults = data?.pages.flatMap((page) => page.results) ?? [];

  const results = useMemo(() => {
    if (!isSearching) return rawResults;
    return filterSearchResultsByDiscoverFilters(
      rawResults,
      {
        with_genres: search.with_genres,
        vote_average_gte: search.vote_average_gte,
        date_gte: type === "movie" ? search.release_date_gte : search.first_air_date_gte,
        date_lte: type === "movie" ? search.release_date_lte : search.first_air_date_lte,
        with_runtime_gte: search.with_runtime_gte,
        with_runtime_lte: search.with_runtime_lte,
      },
      genreNameById,
    );
  }, [genreNameById, isSearching, rawResults, search, type]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <Container className="space-y-6">
      <MediaCarouselWatching type={type} />
      {pendingRequests && pendingRequests.length > 0 && (
        <RequestCarousel requests={pendingRequests} seeMoreTo="/requests" seeMoreSearch={{ type, status: "pending" }} />
      )}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 w-full">
            <MediaTabsViewMode />

            <MediaSortTabs
              value={search.selected}
              onChange={(value) => onSearchChange({ selected: value } as Partial<TSearch>)}
              type={type}
            />
          </div>
          <div className="flex items-center gap-2">
            {!isDownloaded && <MediaButtonCategory />}
            {filtersSheet}
          </div>
        </div>

        {showCategories && !isDownloaded && (
          <MediaCarouselCategory
            type={type}
            onValueChange={(value) => onSearchChange({ with_genres: value } as Partial<TSearch>)}
          />
        )}

        <Input
          type="search"
          search
          className="w-full"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {isPending ? (
          viewMode === "grid" ? (
            <MediaGrid items={[]} isLoading showType />
          ) : (
            <MediaTable media={[]} isLoadingMore />
          )
        ) : results.length === 0 ? (
          <PlaceholderEmpty title={emptyTitle} subtitle={emptySubtitle} />
        ) : viewMode === "grid" ? (
          <MediaGrid items={results} isLoading={isFetchingNextPage} onLoadMore={handleLoadMore} />
        ) : (
          <MediaTable media={results} isLoadingMore={isFetchingNextPage} onLoadMore={handleLoadMore} />
        )}
      </div>
    </Container>
  );
}
