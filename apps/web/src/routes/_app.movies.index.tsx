import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FilterIcon } from "lucide-react";
import { SortOption } from "tmdb-ts";

import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { PlaceholderEmpty } from "@/shared/ui/seedarr-placeholder";

import { MediaCategoryCarousel } from "@/features/media/components/media-category-carousel";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaSortTabs } from "@/features/media/components/media-sort-tabs";
import { MovieProviderTabs } from "@/features/movies/components/movie-provider-tabs";
import { useMovieDiscover } from "@/features/movies/hooks/use-movie";

export interface MovieSearchParams {
  sort_by?: SortOption;
  with_genres?: string;
  with_watch_providers?: string;
}

export const Route = createFileRoute("/_app/movies/")({
  component: MoviesPage,
  validateSearch: (search: MovieSearchParams) => {
    return {
      sort_by: search.sort_by ?? "popularity.desc",
      with_genres: search.with_genres,
      with_watch_providers: search.with_watch_providers,
    };
  },
});

function MoviesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMovieDiscover({
    sort_by: search.sort_by,
    with_genres: search.with_genres,
    with_watch_providers: search.with_watch_providers,
  });

  const movies = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) ?? [];
  }, [data]);

  const handleSearchChange = (updates: Partial<MovieSearchParams>) => {
    navigate({
      to: "/movies",
      search: {
        ...search,
        ...updates,
      },
    });
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <Container>
      <MediaCategoryCarousel type="movie" onValueChange={handleSearchChange} />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <MediaSortTabs value={search.sort_by} onValueChange={handleSearchChange} />
          <div className="flex items-center gap-2">
            <MovieProviderTabs
              className="hidden xl:flex"
              value={search.with_watch_providers}
              onValueChange={handleSearchChange}
            />
            <Button variant="secondary" size="icon-lg">
              <FilterIcon />
            </Button>
          </div>
        </div>
        {!isLoading && movies.length === 0 ? (
          <PlaceholderEmpty
            title={<Trans>No movies found</Trans>}
            subtitle={<Trans>Try adjusting your filters or search criteria</Trans>}
          />
        ) : (
          <MediaGrid
            items={movies}
            isLoading={isLoading || isFetchingNextPage}
            onLoadMore={handleLoadMore}
          />
        )}
      </div>
    </Container>
  );
}
