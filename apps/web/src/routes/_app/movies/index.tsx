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
  buildMovieDiscoverOptions,
  type MovieDiscoverSearch,
  pickMovieFilters,
  validateMovieDiscoverSearch,
} from "@/features/media/helpers/discover-search.helper";
import { MovieFiltersSheet } from "@/features/movies/components/movie-filters-sheet";
import { MovieProviderTabs } from "@/features/movies/components/movie-provider-tabs";
import { movieQueries } from "@/features/movies/hooks/movie.queries";

export const Route = createFileRoute("/_app/movies/")({
  component: MoviesPage,
  validateSearch: validateMovieDiscoverSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureInfiniteQueryData(
        movieQueries.discover(buildMovieDiscoverOptions(deps), countryToTmdbLocale(context.language)),
      ),
    ]),
});

function MoviesPage() {
  const search = Route.useSearch();
  const locale = useTmdbLocale();
  const navigate = useNavigate();
  const discoverOptions = buildMovieDiscoverOptions(search);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    movieQueries.discover(discoverOptions, locale),
  );
  const results = data.pages.flatMap((page) => page.results);

  const handleSearchChange = (value: Partial<MovieDiscoverSearch>) => {
    navigate({ to: "/movies", search: { ...search, ...value }, resetScroll: false });
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <>
      <HeroCarousel type="movie" />
      <Container>
        <MediaCategoryCarousel type="movie" onValueChange={(value) => handleSearchChange({ with_genres: value })} />
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <MediaSortTabs
              value={search.selected}
              onChange={(value) => handleSearchChange({ selected: value })}
              type="movie"
            />
            <div className="flex items-center gap-2">
              {search.selected !== "cinema" && (
                <MovieProviderTabs
                  className="hidden xl:flex"
                  value={search.with_watch_providers}
                  onValueChange={(value) => handleSearchChange({ with_watch_providers: value?.toString() })}
                />
              )}
              <MovieFiltersSheet value={pickMovieFilters(search)} onChange={handleSearchChange} />
            </div>
          </div>
          {results.length === 0 ? (
            <PlaceholderEmpty
              title={<Trans>No movies found</Trans>}
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
