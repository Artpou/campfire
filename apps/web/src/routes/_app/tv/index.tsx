import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { DiscoverPage } from "@/features/media/components/discover-page";
import {
  buildTvDiscoverOptions,
  pickTvFilters,
  type TvDiscoverSearch,
  validateTvDiscoverSearch,
} from "@/features/media/helpers/discover-search.helper";
import { TvFiltersSheet } from "@/features/tv/components/tv-filters-sheet";
import { TVProviderTabs } from "@/features/tv/components/tv-provider-tabs";
import { tvQueries } from "@/features/tv/hooks/tv.queries";

export const Route = createFileRoute("/_app/tv/")({
  component: TVPage,
  validateSearch: validateTvDiscoverSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureInfiniteQueryData(
        tvQueries.discover(buildTvDiscoverOptions(deps), countryToTmdbLocale(context.language)),
      ),
    ]),
});

function TVPage() {
  const search = Route.useSearch();
  const locale = useTmdbLocale();
  const navigate = useNavigate();
  const discoverOptions = buildTvDiscoverOptions(search);

  const handleSearchChange = (value: Partial<TvDiscoverSearch>) => {
    navigate({ to: "/tv", search: { ...search, ...value }, resetScroll: false });
  };

  return (
    <DiscoverPage
      type="tv"
      search={search}
      queryOptions={tvQueries.discover(discoverOptions, locale)}
      onSearchChange={handleSearchChange}
      providerTabs={
        <TVProviderTabs value={search.with_watch_providers} onValueChange={(value) => handleSearchChange(value)} />
      }
      filtersSheet={<TvFiltersSheet value={pickTvFilters(search)} onChange={handleSearchChange} />}
      emptyTitle={<Trans>No TV shows found</Trans>}
      emptySubtitle={<Trans>Try adjusting your filters or search criteria</Trans>}
    />
  );
}
