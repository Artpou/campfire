import { Trans } from "@lingui/react/macro";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Container } from "@/shared/ui/container";

import { RequestGrid } from "@/features/request/components/request-grid";
import { requestQueries } from "@/features/request/hooks/request.queries";

export const Route = createFileRoute("/_app/movies/requests")({
  component: MovieRequestsPage,
});

function MovieRequestsPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useInfiniteQuery(
    requestQueries.list({ type: "movie" }),
  );
  const results = data?.pages.flatMap((page) => page.results) ?? [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <Container>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">
          <Trans>Movie Requests</Trans>
        </h1>

        {!isPending && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg">
              <Trans>No pending requests.</Trans>
            </p>
          </div>
        ) : (
          <RequestGrid items={results} isLoading={isPending || isFetchingNextPage} onLoadMore={handleLoadMore} />
        )}
      </div>
    </Container>
  );
}
