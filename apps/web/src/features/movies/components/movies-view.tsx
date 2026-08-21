import { Trans, useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";

import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { MediaDiscover } from "@/features/media/components/media-discover";
import {
  buildMovieDiscoverOptions,
  isDiscoverTextSearch,
  isDownloadedTab,
  type MovieDiscoverSearch,
  pickMovieFilters,
} from "@/features/media/helpers/discover-search.helper";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { MovieFiltersSheet } from "@/features/movies/components/movie-filters-sheet";
import { movieQueries } from "@/features/movies/hooks/movie.queries";

export interface MoviesViewProps {
  search: MovieDiscoverSearch;
}

export function MoviesView({ search }: MoviesViewProps) {
  const { t } = useLingui();
  const locale = useTmdbLocale();
  const navigate = useNavigate();
  const isSearching = isDiscoverTextSearch(search.q);
  const isDownloaded = isDownloadedTab(search.selected);
  const query = (search.q ?? "").trim();
  const discoverOptions = buildMovieDiscoverOptions(search);

  const handleSearchChange = (value: Partial<MovieDiscoverSearch>) => {
    const next = { ...search, ...value };
    if (isDownloadedTab(next.selected)) {
      next.with_genres = undefined;
    }
    navigate({ to: "/movies", search: next, resetScroll: false });
  };

  const queryOptions = isSearching
    ? movieQueries.search(query, locale)
    : isDownloaded
      ? mediaQueries.list({ filter: "downloaded", type: "movie" })
      : movieQueries.discover(discoverOptions, locale);

  return (
    <MediaDiscover
      type="movie"
      search={search}
      queryOptions={queryOptions}
      onSearchChange={handleSearchChange}
      filtersSheet={
        !isDownloaded ? <MovieFiltersSheet value={pickMovieFilters(search)} onChange={handleSearchChange} /> : null
      }
      emptyTitle={<Trans>No movies found</Trans>}
      emptySubtitle={<Trans>Try adjusting your filters or search criteria</Trans>}
      searchPlaceholder={t`Search movies...`}
    />
  );
}
