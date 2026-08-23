import { type ReactNode, useEffect, useMemo, useState } from "react";

import type { Media } from "@seedarr/sdk";
import type { InfiniteData, UseInfiniteQueryOptions } from "@tanstack/react-query";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";

import { PlaceholderEmpty } from "@/shared/components/seedarr-placeholder";
import { SentinelStuck, StickyFilterBar } from "@/shared/components/sentinel/sentinel-stuck";
import { flattenInfiniteResults } from "@/shared/hooks/use-infinite-list";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";

import { useRole } from "@/features/auth/hooks/use-role";
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

type MediaDiscoverProps<TSearch extends MediaDiscoverSearch> = {
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
}: MediaDiscoverProps<TSearch>) {
  const locale = useTmdbLocale();
  const isMobile = useIsMobile();
  const { isAdmin } = useRole();
  const viewMode = useEffectiveViewMode(type);
  const isDownloaded = isDownloadedTab(search.selected);

  const [query, setQuery] = useState(search.q ?? "");
  const [isStuck, setIsStuck] = useState(false);
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

  const discoverQuery = useInfiniteQuery(queryOptions as DiscoverQueryOptions);
  const rawResults = flattenInfiniteResults(discoverQuery);

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

  const showSortTabs = !isDownloaded && (!isMobile || !isStuck);
  const showViewMode = !isMobile || !isStuck;

  const searchInput = (
    <Input
      type="search"
      search
      classNameWrapper="w-full min-w-0 flex-1"
      h="lg"
      placeholder={searchPlaceholder}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );

  return (
    <Container className="space-y-6">
      <MediaCarouselWatching type={type} />
      {pendingRequests && pendingRequests.length > 0 && (
        <RequestCarousel requests={pendingRequests} seeMoreTo="/requests" seeMoreSearch={{ type, status: "pending" }} />
      )}
      <div className="space-y-4">
        <SentinelStuck setIsStuck={setIsStuck} marginTop={-30} />

        {!isStuck && searchInput}

        <StickyFilterBar isStuck={isStuck}>
          {isStuck ? (
            <div className="flex w-full items-center gap-2">
              {searchInput}
              {!isDownloaded && filtersSheet}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {showViewMode && <MediaTabsViewMode scope={type} />}
                {showSortTabs && (
                  <MediaSortTabs
                    value={search.selected}
                    className="min-w-0 flex-1"
                    onChange={(value) => onSearchChange({ selected: value } as Partial<TSearch>)}
                    type={type}
                  />
                )}
              </div>
              {!isDownloaded && filtersSheet}
            </div>
          )}
        </StickyFilterBar>

        {discoverQuery.isPending ? (
          viewMode === "grid" ? (
            <MediaGrid query={discoverQuery} showType />
          ) : (
            <MediaTable query={discoverQuery} />
          )
        ) : results.length === 0 ? (
          <PlaceholderEmpty title={emptyTitle} subtitle={emptySubtitle} />
        ) : viewMode === "grid" ? (
          <MediaGrid items={results} query={discoverQuery} />
        ) : (
          <MediaTable media={results} query={discoverQuery} />
        )}
      </div>
    </Container>
  );
}
