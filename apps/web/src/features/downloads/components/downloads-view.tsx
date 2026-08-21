import { useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { ListMediaQuery } from "@seedarr/contracts";
import type { Media } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";

import { SentinelStuck, StickyFilterBar } from "@/shared/components/sentinel/sentinel-stuck";
import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";

import { DownloadButtonSynchronize } from "@/features/downloads/components/button/download-button-synchronize";
import { LibraryStats } from "@/features/downloads/components/download-stats";
import { DownloadTable } from "@/features/downloads/components/download-table";
import { MediaButtonCategory } from "@/features/media/components/button/media-button-category";
import { MediaCarouselCategory } from "@/features/media/components/carousel/media-carousel-category";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaTypeTabs } from "@/features/media/components/tabs/media-tabs-type";
import { MediaTabsViewMode } from "@/features/media/components/tabs/media-tabs-view-mode";
import { listQueryToSorting, sortingToListQuery } from "@/features/media/helpers/media-sort.helper";
import { useSuspenseMediaList } from "@/features/media/hooks/use-media";
import { useEffectiveViewMode } from "@/features/settings/hooks/use-effective-view-mode";
import { useUserPreferences } from "@/features/settings/stores/user-preference-store";

export interface DownloadsViewProps {
  search: Partial<ListMediaQuery>;
}

export function DownloadsView({ search }: DownloadsViewProps) {
  const { type, with_genres: withGenres, sortBy, sortOrder } = search;
  const navigate = useNavigate();
  const { t } = useLingui();
  const [query, setQuery] = useState("");
  const [isStuck, setIsStuck] = useState(false);
  const viewMode = useEffectiveViewMode("downloads");
  const showCategories = useUserPreferences((s) => s.showCategories);

  const listQuery = {
    filter: "downloaded" as const,
    type,
    with_genres: withGenres,
    sortBy,
    sortOrder,
  };

  const mediaQuery = useSuspenseMediaList(listQuery);
  const results = mediaQuery.data.pages.flatMap((page) => page.results);

  const filteredResults = useMemo(() => {
    if (!query.trim()) return results;
    const q = query.toLowerCase();
    return results.filter(
      (media: Media) => media.title?.toLowerCase().includes(q) || media.original_title?.toLowerCase().includes(q),
    );
  }, [results, query]);

  const sorting = listQueryToSorting({ sortBy, sortOrder });

  const handleSortingChange = (next: SortingState) => {
    const sort = sortingToListQuery(next);
    navigate({
      to: "/downloads",
      search: { ...search, sortBy: sort.sortBy, sortOrder: sort.sortOrder },
      resetScroll: false,
    });
  };

  return (
    <Container>
      <div className="space-y-4">
        <LibraryStats />

        <SentinelStuck setIsStuck={setIsStuck} marginTop={-30} />
        <StickyFilterBar isStuck={isStuck}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap w-full">
              <MediaTabsViewMode scope="downloads" />
              <MediaTypeTabs value={type} />
            </div>
            <div className="flex items-center gap-2">
              {isStuck && (
                <Input
                  type="search"
                  search
                  classNameWrapper="hidden lg:block w-full"
                  h="lg"
                  placeholder={t`Search in your library...`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              )}
              {!isStuck && <MediaButtonCategory />}
              <DownloadButtonSynchronize />
            </div>
          </div>
          {showCategories && !isStuck && (
            <MediaCarouselCategory
              type={type ?? "movie"}
              valueMode="name"
              value={withGenres}
              onValueChange={(value) =>
                navigate({
                  to: "/downloads",
                  search: { ...search, with_genres: value },
                  resetScroll: false,
                })
              }
            />
          )}
        </StickyFilterBar>

        {!isStuck && (
          <Input
            type="text"
            search
            className="w-full"
            placeholder={t`Search in your library...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}

        {filteredResults.length > 0 ? (
          viewMode === "grid" ? (
            <MediaGrid items={filteredResults} query={mediaQuery} showType downloadMode />
          ) : (
            <DownloadTable
              media={filteredResults}
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
