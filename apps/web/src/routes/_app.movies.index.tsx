import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FilterIcon } from "lucide-react";
import { SortOption } from "tmdb-ts";

import { PlaceholderEmpty } from "@/shared/components/seedarr-placeholder";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";

import { MediaCategoryCarousel } from "@/features/media/components/media-category-carousel";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaSelected, MediaSortTabs } from "@/features/media/components/media-sort-tabs";
import { MovieProviderTabs } from "@/features/movies/components/movie-provider-tabs";
import { useMovieDiscover } from "@/features/movies/hooks/use-movie";

export interface MovieSearchParams {
  with_genres?: string;
  with_watch_providers?: string;
  selected?: MediaSelected;
}

export const Route = createFileRoute("/_app/movies/")({
  component: MoviesPage,
  validateSearch: (search: Record<string, unknown>): MovieSearchParams => {
    const { with_genres, with_watch_providers, selected } = search;
    return {
      with_genres: typeof with_genres === "string" ? with_genres : undefined,
      with_watch_providers:
        typeof with_watch_providers === "string" ? with_watch_providers : undefined,
      selected: typeof selected === "string" ? (selected as MediaSelected) : undefined,
    };
  },
});

function MoviesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const { sort_by, with_release_type, after_date } = useMemo(() => {
    return {
      with_release_type:
        search.selected === "home" ? "4|5" : search.selected === "cinema" ? "3" : undefined,
      sort_by: (search.selected === "top-rated"
        ? "vote_average.desc"
        : search.selected === "upcoming"
          ? "popularity.desc"
          : undefined) satisfies SortOption | undefined,
      after_date:
        search.selected === "upcoming" ? new Date().toISOString().split("T")[0] : undefined,
    };
  }, [search]);

  const { results, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMovieDiscover({
    sort_by: sort_by as SortOption | undefined,
    with_release_type,
    with_genres: search.with_genres,
    with_watch_providers: search.with_watch_providers,
    "primary_release_date.gte": after_date,
  });

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };
  const handleSearchChange = (value: MovieSearchParams) => {
    navigate({
      to: "/movies",
      search: {
        ...search,
        ...value,
      },
    });
  };

  return (
    <Container>
      <MediaCategoryCarousel
        type="movie"
        onValueChange={(value) => handleSearchChange({ with_genres: value })}
      />

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
                onValueChange={(value) =>
                  handleSearchChange({ with_watch_providers: value?.toString() })
                }
              />
            )}
            <Button variant="secondary" size="icon-lg">
              <FilterIcon />
            </Button>
          </div>
        </div>
        {!isLoading && results.length === 0 ? (
          <PlaceholderEmpty
            title={<Trans>No movies found</Trans>}
            subtitle={<Trans>Try adjusting your filters or search criteria</Trans>}
          />
        ) : (
          <MediaGrid
            items={results}
            isLoading={isLoading || isFetchingNextPage}
            onLoadMore={handleLoadMore}
          />
        )}
      </div>
    </Container>
  );
}
