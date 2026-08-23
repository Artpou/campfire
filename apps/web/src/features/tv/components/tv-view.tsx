import { Trans, useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { MediaDiscover } from "@/features/media/components/media-discover";
import {
  buildTvDiscoverOptions,
  isDiscoverTextSearch,
  isDownloadedTab,
  pickTvFilters,
  type TvDiscoverSearch,
} from "@/features/media/helpers/discover-search.helper";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { TvFiltersSheet } from "@/features/tv/components/tv-filters-sheet";
import { tvQueries } from "@/features/tv/hooks/tv.queries";

export interface TvViewProps {
  search: TvDiscoverSearch;
}

export function TvView({ search }: TvViewProps) {
  const { t } = useLingui();
  const locale = useTmdbLocale();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const isSearching = isDiscoverTextSearch(search.q);
  const isDownloaded = isDownloadedTab(search.selected);
  const query = (search.q ?? "").trim();
  const discoverOptions = buildTvDiscoverOptions(search);

  const handleSearchChange = (value: Partial<TvDiscoverSearch>) => {
    const next = { ...search, ...value };
    if (isDownloadedTab(next.selected)) {
      next.with_genres = undefined;
    }
    navigate({ to: "/tv", search: next, resetScroll: false });
  };

  const queryOptions = isSearching
    ? tvQueries.search(query, locale)
    : isDownloaded
      ? mediaQueries.list({ filter: "downloaded", type: "tv" })
      : tvQueries.discover(discoverOptions, locale);

  return (
    <MediaDiscover
      type="tv"
      search={search}
      queryOptions={queryOptions}
      onSearchChange={handleSearchChange}
      filtersSheet={
        !isDownloaded ? (
          <TvFiltersSheet
            value={pickTvFilters(search)}
            onChange={handleSearchChange}
            sortValue={search.selected ?? "new"}
            onSortChange={(selected) => handleSearchChange({ selected })}
            showSortInSheet={isMobile}
          />
        ) : null
      }
      emptyTitle={<Trans>No TV shows found</Trans>}
      emptySubtitle={<Trans>Try adjusting your filters or search criteria</Trans>}
      searchPlaceholder={t`Search TV shows...`}
    />
  );
}
