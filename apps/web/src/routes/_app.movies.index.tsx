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
import { MediaSortTabs } from "@/features/media/components/media-sort-tabs";
import { MovieProviderTabs } from "@/features/movies/components/movie-provider-tabs";
import { useMovieDiscover } from "@/features/movies/hooks/use-movie";

export interface MovieSearchParams {
  sort_by?: SortOption;
  with_genres?: string;
  with_watch_providers?: string;
  with_release_type?: string;
}

export const Route = createFileRoute("/_app/movies/")({
  component: MoviesPage,
  validateSearch: (search: Record<string, unknown>): MovieSearchParams => {
    const { sort_by, with_genres, with_watch_providers, with_release_type } = search;
    return {
      sort_by: typeof sort_by === "string" ? (sort_by as SortOption) : undefined,
      with_genres: typeof with_genres === "string" ? with_genres : undefined,
      with_watch_providers:
        typeof with_watch_providers === "string" ? with_watch_providers : undefined,
      with_release_type: typeof with_release_type === "string" ? with_release_type : undefined,
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
    with_release_type: search.with_release_type,
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

  const handleReleaseTypeChange = (updates: {
    with_release_type: string;
    release_date: { lte: string };
  }) => {
    navigate({
      to: "/movies",
      search: {
        ...search,
        with_release_type: updates.with_release_type,
        sort_by: undefined,
      },
    });
  };

  const handleSortChange = (updates: { sort_by: SortOption }) => {
    navigate({
      to: "/movies",
      search: {
        ...search,
        sort_by: updates.sort_by,
        with_release_type: undefined,
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
          <MediaSortTabs
            releaseValue={search.with_release_type}
            onSortChange={handleSortChange}
            onReleaseChange={handleReleaseTypeChange}
          />
          <div className="flex items-center gap-2">
            {search.with_release_type !== "3" && (
              <MovieProviderTabs
                className="hidden xl:flex"
                value={search.with_watch_providers}
                onValueChange={handleSearchChange}
              />
            )}
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
