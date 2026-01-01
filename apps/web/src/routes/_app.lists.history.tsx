import { useMemo } from "react";

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

import { Container } from "@/shared/ui/container";

import { MediaGrid } from "@/features/media/components/media-grid";
import { useRecentlyViewed } from "@/features/media/hooks/use-media";
import type { Media } from "@/features/media/media";

export const Route = createFileRoute("/_app/lists/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { _ } = useLingui();

  const {
    data: historyData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRecentlyViewed("movie", 20);

  const items = useMemo(
    () => historyData?.pages.flatMap((page: { results: Media[] }) => page.results) ?? [],
    [historyData],
  );

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <Container>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{_(msg`History`)}</h1>

        {!isLoading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg">
              <Trans>No viewing history yet.</Trans>
            </p>
          </div>
        ) : (
          <MediaGrid
            items={items}
            isLoading={isLoading || isFetchingNextPage}
            onLoadMore={handleLoadMore}
            withLoading={false}
          />
        )}
      </div>
    </Container>
  );
}
