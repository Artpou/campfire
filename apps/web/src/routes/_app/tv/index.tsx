import { Trans } from "@lingui/react/macro";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { PlaceholderEmpty } from "@/shared/components/seedarr-placeholder";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Container } from "@/shared/ui/container";

import { HeroCarousel } from "@/features/media/components/hero-carousel";
import { MediaCategoryCarousel } from "@/features/media/components/media-category-carousel";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaSortTabs } from "@/features/media/components/media-sort-tabs";
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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    tvQueries.discover(discoverOptions, locale),
  );
  const results = data.pages.flatMap((page) => page.results);

  const handleSearchChange = (value: Partial<TvDiscoverSearch>) => {
    navigate({ to: "/tv", search: { ...search, ...value }, resetScroll: false });
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <>
      <HeroCarousel type="tv" />
      <Container>
        <MediaCategoryCarousel type="tv" onValueChange={(value) => handleSearchChange({ with_genres: value })} />
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <MediaSortTabs
              value={search.selected}
              onChange={(value) => handleSearchChange({ selected: value })}
              type="tv"
            />
            <div className="flex items-center gap-2">
              {search.selected !== "cinema" && (
                <TVProviderTabs
                  value={search.with_watch_providers}
                  onValueChange={(value) => handleSearchChange(value)}
                />
              )}
              <TvFiltersSheet value={pickTvFilters(search)} onChange={handleSearchChange} />
            </div>
          </div>
          {results.length === 0 ? (
            <PlaceholderEmpty
              title={<Trans>No TV shows found</Trans>}
              subtitle={<Trans>Try adjusting your filters or search criteria</Trans>}
            />
          ) : (
            <MediaGrid items={results} isLoading={isFetchingNextPage} onLoadMore={handleLoadMore} />
          )}
        </div>
      </Container>
    </>
  );
}
