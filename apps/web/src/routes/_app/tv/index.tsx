import { Trans, useLingui } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { MediaDiscover } from "@/features/media/components/media-discover";
import {
  buildTvDiscoverOptions,
  isDiscoverTextSearch,
  pickTvFilters,
  type TvDiscoverSearch,
  validateTvDiscoverSearch,
} from "@/features/media/helpers/discover-search.helper";
import { TvFiltersSheet } from "@/features/tv/components/tv-filters-sheet";
import { tvQueries } from "@/features/tv/hooks/tv.queries";

export const Route = createFileRoute("/_app/tv/")({
  component: TVPage,
  validateSearch: validateTvDiscoverSearch,
});

function TVPage() {
  const { t } = useLingui();
  const search = Route.useSearch();
  const locale = useTmdbLocale();
  const navigate = useNavigate();
  const isSearching = isDiscoverTextSearch(search.q);
  const query = (search.q ?? "").trim();
  const discoverOptions = buildTvDiscoverOptions(search);

  const handleSearchChange = (value: Partial<TvDiscoverSearch>) => {
    navigate({ to: "/tv", search: { ...search, ...value }, resetScroll: false });
  };

  return (
    <MediaDiscover
      type="tv"
      search={search}
      queryOptions={isSearching ? tvQueries.search(query, locale) : tvQueries.discover(discoverOptions, locale)}
      onSearchChange={handleSearchChange}
      filtersSheet={<TvFiltersSheet value={pickTvFilters(search)} onChange={handleSearchChange} />}
      emptyTitle={<Trans>No TV shows found</Trans>}
      emptySubtitle={<Trans>Try adjusting your filters or search criteria</Trans>}
      searchPlaceholder={t`Search TV shows...`}
    />
  );
}
