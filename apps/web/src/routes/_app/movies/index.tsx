import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { DiscoverPage } from "@/features/media/components/discover-page";
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
});

function MoviesPage() {
  const search = Route.useSearch();
  const locale = useTmdbLocale();
  const navigate = useNavigate();
  const discoverOptions = buildMovieDiscoverOptions(search);

  const handleSearchChange = (value: Partial<MovieDiscoverSearch>) => {
    navigate({ to: "/movies", search: { ...search, ...value }, resetScroll: false });
  };

  return (
    <DiscoverPage
      type="movie"
      search={search}
      queryOptions={movieQueries.discover(discoverOptions, locale)}
      onSearchChange={handleSearchChange}
      providerTabs={
        <MovieProviderTabs
          className="hidden xl:flex"
          value={search.with_watch_providers}
          onValueChange={(value) => handleSearchChange({ with_watch_providers: value?.toString() })}
        />
      }
      filtersSheet={<MovieFiltersSheet value={pickMovieFilters(search)} onChange={handleSearchChange} />}
      emptyTitle={<Trans>No movies found</Trans>}
      emptySubtitle={<Trans>Try adjusting your filters or search criteria</Trans>}
    />
  );
}
