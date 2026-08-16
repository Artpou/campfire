import { useEffect, useMemo, useRef, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";
import { useIntersectionObserver } from "@uidotdev/usehooks";

import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";

import { DownloadButtonSynchronize } from "@/features/downloads/components/button/download-button-synchronize";
import { LibraryStats } from "@/features/downloads/components/download-stats";
import { DownloadTable } from "@/features/downloads/components/download-table";
import { MediaButtonCategory } from "@/features/media/components/button/media-button-category";
import { MediaCard } from "@/features/media/components/card/media-card";
import { MediaCarouselCategory } from "@/features/media/components/carousel/media-carousel-category";
import { MediaTypeTabs } from "@/features/media/components/tabs/media-tabs-type";
import { MediaTabsViewMode } from "@/features/media/components/tabs/media-tabs-view-mode";
import { listQueryToSorting, sortingToListQuery } from "@/features/media/helpers/media-sort.helper";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { useSuspenseMediaList } from "@/features/media/hooks/use-media";
import { useEffectiveViewMode } from "@/features/settings/hooks/use-effective-view-mode";
import { useUserPreferences } from "@/features/settings/stores/user-preference-store";
import { validateDownloadsSearch } from "@/routes/helpers/downloads-route.helper";

export const Route = createFileRoute("/_app/downloads/")({
  component: DownloadsPage,
  validateSearch: validateDownloadsSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureInfiniteQueryData(
        mediaQueries.list({
          filter: "downloaded",
          type: deps.type,
          with_genres: deps.with_genres,
          sortBy: deps.sortBy,
          sortOrder: deps.sortOrder,
        }),
      ),
    ]),
});

function DownloadsPage() {
  const search = Route.useSearch();
  const { type, with_genres: withGenres, sortBy, sortOrder } = search;
  const navigate = useNavigate();
  const { t } = useLingui();
  const [query, setQuery] = useState("");
  const viewMode = useEffectiveViewMode();
  const showCategories = useUserPreferences((s) => s.showCategories);

  const listQuery = {
    filter: "downloaded" as const,
    type,
    with_genres: withGenres,
    sortBy,
    sortOrder,
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseMediaList(listQuery);
  const results = data?.pages.flatMap((page) => page.results) ?? [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

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

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap w-full">
            <MediaTabsViewMode />
            <MediaTypeTabs value={type} />
          </div>
          <div className="flex items-center gap-2">
            <MediaButtonCategory />
            <DownloadButtonSynchronize />
          </div>
        </div>

        {showCategories && (
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

        <Input
          type="text"
          search
          className="w-full"
          placeholder={t`Search in your library...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {filteredResults.length > 0 ? (
          viewMode === "grid" ? (
            <DownloadsGrid media={filteredResults} isLoading={isFetchingNextPage} onLoadMore={handleLoadMore} />
          ) : (
            <DownloadTable
              media={filteredResults}
              isLoadingMore={isFetchingNextPage}
              onLoadMore={handleLoadMore}
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

function DownloadsGrid({
  media,
  isLoading,
  onLoadMore,
}: {
  media: Media[];
  isLoading: boolean;
  onLoadMore: () => void;
}) {
  const [sentinelRef, entry] = useIntersectionObserver({ threshold: 1 });
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (entry?.isIntersecting && !isLoading && onLoadMoreRef.current) {
      onLoadMoreRef.current();
    }
  }, [entry?.isIntersecting, isLoading]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
        {media.map((item) => {
          if (!item.download) return null;
          return <MediaCard key={item.download.id} media={item} showDownload showPlay showSocial showType />;
        })}
      </div>
      <div ref={sentinelRef} className="h-4" aria-hidden />
    </div>
  );
}
