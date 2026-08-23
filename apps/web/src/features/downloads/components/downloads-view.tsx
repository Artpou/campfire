import { useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { ListMediaQuery } from "@seedarr/contracts";
import { useNavigate } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";
import { useDebounce } from "@uidotdev/usehooks";

import { SentinelStuck, StickyFilterBar } from "@/shared/components/sentinel/sentinel-stuck";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";

import { DownloadButtonSynchronize } from "@/features/downloads/components/button/download-button-synchronize";
import { LibraryStats } from "@/features/downloads/components/download-stats";
import { DownloadTable } from "@/features/downloads/components/download-table";
import { MediaGrid } from "@/features/media/components/media-grid";
import { LibraryFiltersSheet } from "@/features/media/components/sheet/media-sheet-filter-library";
import { MediaTypeTabs } from "@/features/media/components/tabs/media-tabs-type";
import { MediaTabsViewMode } from "@/features/media/components/tabs/media-tabs-view-mode";
import { listQueryToSorting, sortingToListQuery } from "@/features/media/helpers/media-sort.helper";
import { useSuspenseMediaList } from "@/features/media/hooks/use-media";
import { useEffectiveViewMode } from "@/features/settings/hooks/use-effective-view-mode";

export interface DownloadsViewProps {
  search: Partial<ListMediaQuery>;
}

export function DownloadsView({ search }: DownloadsViewProps) {
  const {
    type,
    with_genres: withGenres,
    release_date_gte,
    release_date_lte,
    with_runtime_gte,
    with_runtime_lte,
    vote_average_gte,
    sortBy,
    sortOrder,
  } = search;
  const navigate = useNavigate();
  const { t } = useLingui();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [isStuck, setIsStuck] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const viewMode = useEffectiveViewMode("downloads");

  const listQuery = {
    filter: "downloaded" as const,
    type,
    with_genres: withGenres,
    release_date_gte,
    release_date_lte,
    with_runtime_gte,
    with_runtime_lte,
    vote_average_gte,
    q: debouncedQuery.trim() || undefined,
    sortBy,
    sortOrder,
  };

  const mediaQuery = useSuspenseMediaList(listQuery);
  const results = mediaQuery.data.pages.flatMap((page) => page.results);

  const sorting = listQueryToSorting({ sortBy, sortOrder });

  const handleSortingChange = (next: SortingState) => {
    const sort = sortingToListQuery(next);
    navigate({
      to: "/downloads",
      search: { ...search, sortBy: sort.sortBy, sortOrder: sort.sortOrder },
      resetScroll: false,
    });
  };

  const genreScope = type ?? "both";
  const filterType = type ?? "movie";
  const showViewMode = !isMobile || !isStuck;

  const libraryFilters = useMemo(
    () => ({
      with_genres: withGenres,
      release_date_gte,
      release_date_lte,
      with_runtime_gte,
      with_runtime_lte,
      vote_average_gte,
    }),
    [withGenres, release_date_gte, release_date_lte, with_runtime_gte, with_runtime_lte, vote_average_gte],
  );

  return (
    <Container>
      <div className="space-y-4">
        <LibraryStats />

        <SentinelStuck setIsStuck={setIsStuck} marginTop={-30} />

        {!isStuck && (
          <Input
            type="search"
            search
            classNameWrapper="w-full"
            h="lg"
            placeholder={t`Search in your library...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}

        <StickyFilterBar isStuck={isStuck}>
          {isStuck ? (
            <div className="flex w-full items-center gap-2">
              <Input
                type="search"
                search
                classNameWrapper="w-full min-w-0 flex-1"
                h="lg"
                placeholder={t`Search in your library...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <LibraryFiltersSheet
                genreScope={genreScope}
                type={filterType}
                value={libraryFilters}
                onChange={(value) =>
                  navigate({
                    to: "/downloads",
                    search: { ...search, ...value },
                    resetScroll: false,
                  })
                }
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              {showViewMode && (
                <div className="flex flex-wrap items-center gap-2">
                  <MediaTabsViewMode scope="downloads" />
                  <MediaTypeTabs value={type} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <LibraryFiltersSheet
                  genreScope={genreScope}
                  type={filterType}
                  value={libraryFilters}
                  onChange={(value) =>
                    navigate({
                      to: "/downloads",
                      search: { ...search, ...value },
                      resetScroll: false,
                    })
                  }
                />
                {showViewMode && <DownloadButtonSynchronize />}
              </div>
            </div>
          )}
        </StickyFilterBar>

        {results.length > 0 ? (
          viewMode === "grid" ? (
            <MediaGrid items={results} query={mediaQuery} showType downloadMode />
          ) : (
            <DownloadTable
              media={results}
              query={mediaQuery}
              sorting={sorting}
              onSortingChange={(updater) => {
                const next = typeof updater === "function" ? updater(sorting) : updater;
                handleSortingChange(next);
              }}
            />
          )
        ) : (
          <Card>
            <div className="py-10 text-center">
              <p className="text-muted-foreground">
                {query.trim() ? <Trans>No results found for "{query}"</Trans> : <Trans>No downloads yet</Trans>}
              </p>
            </div>
          </Card>
        )}
      </div>
    </Container>
  );
}
