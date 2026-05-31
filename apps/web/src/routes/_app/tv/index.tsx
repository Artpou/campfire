import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SortOption } from "tmdb-ts";

import { PlaceholderEmpty } from "@/shared/components/seedarr-placeholder";
import { Container } from "@/shared/ui/container";

import { ContinueWatchingSection } from "@/features/media/components/continue-watching-section";
import { HeroCarousel } from "@/features/media/components/hero-carousel";
import { MediaCategoryCarousel } from "@/features/media/components/media-category-carousel";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaSelected, MediaSortTabs } from "@/features/media/components/media-sort-tabs";
import { TvFiltersSheet, type TvFiltersValue } from "@/features/tv/components/tv-filters-sheet";
import { TVProviderTabs } from "@/features/tv/components/tv-provider-tabs";
import { useTVDiscover } from "@/features/tv/hook/use-tv";

export interface TVSearchParams {
  with_genres?: string;
  with_watch_providers?: string;
  selected?: MediaSelected;
  first_air_date_gte?: string;
  first_air_date_lte?: string;
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

export const Route = createFileRoute("/_app/tv/")({
  component: TVPage,
  validateSearch: (search: Record<string, unknown>): TVSearchParams => {
    return {
      with_genres: optionalString(search.with_genres),
      with_watch_providers: optionalString(search.with_watch_providers),
      selected:
        typeof search.selected === "string" ? (search.selected as MediaSelected) : undefined,
      first_air_date_gte: optionalString(search.first_air_date_gte),
      first_air_date_lte: optionalString(search.first_air_date_lte),
      with_original_language: optionalString(search.with_original_language),
      with_keywords: optionalString(search.with_keywords),
      with_keywords_label: optionalString(search.with_keywords_label),
      with_runtime_gte: optionalNumber(search.with_runtime_gte),
      with_runtime_lte: optionalNumber(search.with_runtime_lte),
      vote_average_gte: optionalNumber(search.vote_average_gte),
    };
  },
});

function TVPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const sort_by: SortOption | undefined = useMemo(() => {
    return search.selected === "top-rated"
      ? "vote_average.desc"
      : search.selected === "upcoming"
        ? "popularity.desc"
        : undefined;
  }, [search.selected]);

  const { after_date } = useMemo(() => {
    return {
      after_date:
        search.selected === "upcoming" ? new Date().toISOString().split("T")[0] : undefined,
    };
  }, [search]);

  const {
    results: tvShows,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTVDiscover({
    sort_by,
    with_genres: search.with_genres,
    with_watch_providers: search.with_watch_providers,
    "first_air_date.gte": search.first_air_date_gte ?? after_date,
    "first_air_date.lte": search.first_air_date_lte,
    with_original_language: search.with_original_language,
    with_keywords: search.with_keywords,
    "with_runtime.gte": search.with_runtime_gte,
    "with_runtime.lte": search.with_runtime_lte,
    "vote_average.gte": search.vote_average_gte,
  });

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleSearchChange = (value: Partial<TVSearchParams>) => {
    navigate({
      to: "/tv",
      search: {
        ...search,
        ...value,
      },
    });
  };

  const filtersValue: TvFiltersValue = {
    first_air_date_gte: search.first_air_date_gte,
    first_air_date_lte: search.first_air_date_lte,
    with_original_language: search.with_original_language,
    with_keywords: search.with_keywords,
    with_keywords_label: search.with_keywords_label,
    with_runtime_gte: search.with_runtime_gte,
    with_runtime_lte: search.with_runtime_lte,
    vote_average_gte: search.vote_average_gte,
  };

  const handleFiltersChange = (value: TvFiltersValue) => {
    handleSearchChange({
      first_air_date_gte: value.first_air_date_gte,
      first_air_date_lte: value.first_air_date_lte,
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
      <HeroCarousel type="tv" />
      <ContinueWatchingSection type="tv" />
      <Container>
        <MediaCategoryCarousel
          type="tv"
          onValueChange={(value) => handleSearchChange({ with_genres: value })}
        />
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
              <TvFiltersSheet value={filtersValue} onChange={handleFiltersChange} />
            </div>
          </div>
          {!isLoading && tvShows.length === 0 ? (
            <PlaceholderEmpty
              title={<Trans>No TV shows found</Trans>}
              subtitle={<Trans>Try adjusting your filters or search criteria</Trans>}
            />
          ) : (
            <MediaGrid
              items={tvShows}
              isLoading={isLoading || isFetchingNextPage}
              onLoadMore={handleLoadMore}
            />
          )}
        </div>
      </Container>
    </>
  );
}
