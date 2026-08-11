import { Trans, useLingui } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { MediaDiscover } from "@/features/media/components/media-discover";
import {
  buildMovieDiscoverOptions,
  isDiscoverTextSearch,
  type MovieDiscoverSearch,
  pickMovieFilters,
  validateMovieDiscoverSearch,
} from "@/features/media/helpers/discover-search.helper";
import { MovieFiltersSheet } from "@/features/movies/components/movie-filters-sheet";
import { movieQueries } from "@/features/movies/hooks/movie.queries";

export const Route = createFileRoute("/_app/movies/")({
  component: MoviesPage,
  validateSearch: validateMovieDiscoverSearch,
});

function MoviesPage() {
  const { t } = useLingui();
  const search = Route.useSearch();
  const locale = useTmdbLocale();
  const navigate = useNavigate();
  const isSearching = isDiscoverTextSearch(search.q);
  const query = (search.q ?? "").trim();
  const discoverOptions = buildMovieDiscoverOptions(search);

  const handleSearchChange = (value: Partial<MovieDiscoverSearch>) => {
    navigate({ to: "/movies", search: { ...search, ...value }, resetScroll: false });
  };

  return (
    <MediaDiscover
      type="movie"
      search={search}
      queryOptions={isSearching ? movieQueries.search(query, locale) : movieQueries.discover(discoverOptions, locale)}
      onSearchChange={handleSearchChange}
      filtersSheet={<MovieFiltersSheet value={pickMovieFilters(search)} onChange={handleSearchChange} />}
      emptyTitle={<Trans>No movies found</Trans>}
      emptySubtitle={<Trans>Try adjusting your filters or search criteria</Trans>}
      searchPlaceholder={t`Search movies...`}
    />
  );
}
