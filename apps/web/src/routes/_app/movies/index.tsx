import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SortOption } from "tmdb-ts";

import { PlaceholderEmpty } from "@/shared/components/seedarr-placeholder";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Container } from "@/shared/ui/container";

import { HeroCarousel } from "@/features/media/components/hero-carousel";
import { MediaCarouselLibrary } from "@/features/media/components/media-carousel-library";
import { MediaCategoryCarousel } from "@/features/media/components/media-category-carousel";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaSelected, MediaSortTabs } from "@/features/media/components/media-sort-tabs";
import { MovieFiltersSheet, type MovieFiltersValue } from "@/features/movies/components/movie-filters-sheet";
import { MovieProviderTabs } from "@/features/movies/components/movie-provider-tabs";
import { movieQueries } from "@/features/movies/hooks/movie.queries";

export interface MovieSearchParams {
  with_genres?: string;
  with_watch_providers?: string;
  selected?: MediaSelected;
  release_date_gte?: string;
  release_date_lte?: string;
  with_original_language?: string;
  with_keywords?: string;
  with_keywords_label?: string;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  vote_average_gte?: number;
}

const optionalString = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined);
const optionalNumber = (v: unknown) => {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.length > 0) {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
};

export const Route = createFileRoute("/_app/movies/")({
  component: MoviesPage,
  validateSearch: (search: Record<string, unknown>): MovieSearchParams => {
    return {
      with_genres: optionalString(search.with_genres),
      with_watch_providers: optionalString(search.with_watch_providers),
      selected: typeof search.selected === "string" ? (search.selected as MediaSelected) : "home",
      release_date_gte: optionalString(search.release_date_gte),
      release_date_lte: optionalString(search.release_date_lte),
      with_original_language: optionalString(search.with_original_language),
      with_keywords: optionalString(search.with_keywords),
      with_keywords_label: optionalString(search.with_keywords_label),
      with_runtime_gte: optionalNumber(search.with_runtime_gte),
      with_runtime_lte: optionalNumber(search.with_runtime_lte),
      vote_average_gte: optionalNumber(search.vote_average_gte),
    };
  },
});

function MoviesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const locale = useTmdbLocale();

  const { sort_by, with_release_type, after_date } = useMemo(() => {
    return {
      with_release_type: search.selected === "home" ? "4|5" : search.selected === "cinema" ? "3" : undefined,
      sort_by: (search.selected === "top-rated"
        ? "vote_average.desc"
        : search.selected === "upcoming"
          ? "popularity.desc"
          : undefined) satisfies SortOption | undefined,
      before_date: search.selected === "cinema" ? new Date().toISOString().split("T")[0] : undefined,
      after_date: search.selected === "upcoming" ? new Date().toISOString().split("T")[0] : undefined,
    };
  }, [search]);

  const discoverOptions = useMemo(
    () => ({
      locale,
      sort_by,
      with_release_type,
      with_genres: search.with_genres,
      with_watch_providers: search.with_watch_providers,
      "primary_release_date.gte": search.release_date_gte ?? after_date,
      "primary_release_date.lte": search.release_date_lte,
      with_original_language: search.with_original_language,
      with_keywords: search.with_keywords,
      "with_runtime.gte": search.with_runtime_gte,
      "with_runtime.lte": search.with_runtime_lte,
      "vote_average.gte": search.vote_average_gte,
    }),
    [search, sort_by, with_release_type, after_date, locale],
  );

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(
    movieQueries.discover(discoverOptions, locale),
  );
  const results = useMemo(() => data?.pages.flatMap((page) => page.results) ?? [], [data]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };
  const handleSearchChange = (value: Partial<MovieSearchParams>) => {
    navigate({
      to: "/movies",
      search: {
        ...search,
        ...value,
      },
      resetScroll: false,
    });
  };

  const filtersValue: MovieFiltersValue = {
    release_date_gte: search.release_date_gte,
    release_date_lte: search.release_date_lte,
    with_original_language: search.with_original_language,
    with_keywords: search.with_keywords,
    with_keywords_label: search.with_keywords_label,
    with_runtime_gte: search.with_runtime_gte,
    with_runtime_lte: search.with_runtime_lte,
    vote_average_gte: search.vote_average_gte,
  };

  const handleFiltersChange = (value: MovieFiltersValue) => {
    handleSearchChange({
      release_date_gte: value.release_date_gte,
      release_date_lte: value.release_date_lte,
      with_original_language: value.with_original_language,
      with_keywords: value.with_keywords,
      with_keywords_label: value.with_keywords_label,
      with_runtime_gte: value.with_runtime_gte,
      with_runtime_lte: value.with_runtime_lte,
      vote_average_gte: value.vote_average_gte,
    });
  };

  return (
    <>
      <HeroCarousel type="movie" />
      <Container>
        <MediaCarouselLibrary type="movie" />
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
              <MovieFiltersSheet value={filtersValue} onChange={handleFiltersChange} />
            </div>
          </div>
          {!isLoading && results.length === 0 ? (
            <PlaceholderEmpty
              title={<Trans>No movies found</Trans>}
              subtitle={<Trans>Try adjusting your filters or search criteria</Trans>}
            />
          ) : (
            <MediaGrid items={results} isLoading={isLoading || isFetchingNextPage} onLoadMore={handleLoadMore} />
          )}
        </div>
      </Container>
    </>
  );
}
