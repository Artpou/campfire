import { Trans } from "@lingui/react/macro";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Container } from "@/shared/ui/container";

import { MediaGrid } from "@/features/media/components/media-grid";
import { mediaQueries, refetchMediaInterval } from "@/features/media/hooks/media.queries";

export const Route = createFileRoute("/_app/user/$id/history")({
  component: UserHistoryPage,
});

function UserHistoryPage() {
  const { id } = Route.useParams();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useInfiniteQuery({
    ...mediaQueries.list({ filter: "history", userId: id }),
    refetchInterval: refetchMediaInterval,
  });
  const results = data?.pages.flatMap((page) => page.results) ?? [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <Container>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">
          <Trans>Watch History</Trans>
        </h1>

        {!isPending && results.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg">
              <Trans>No items yet.</Trans>
            </p>
          </div>
        ) : (
          <MediaGrid
            items={results}
            isLoading={isPending || isFetchingNextPage}
            onLoadMore={handleLoadMore}
            withLoading={false}
            showType
          />
        )}
      </div>
    </Container>
  );
}
