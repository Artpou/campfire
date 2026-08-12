import { Trans } from "@lingui/react/macro";
import { hasMinRole, type RequestStatus } from "@seedarr/contracts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { Container } from "@/shared/ui/container";

import { RequestGrid } from "@/features/request/components/request-grid";
import { RequestTabs } from "@/features/request/components/request-tabs";
import { requestQueries } from "@/features/request/hooks/request.queries";

function validateSearch(search: Record<string, unknown>): {
  type: "movie" | "tv" | undefined;
  status: RequestStatus | undefined;
} {
  const type = search.type;
  const status = search.status;
  return {
    type: type === "movie" || type === "tv" ? type : undefined,
    status: status === "pending" || status === "validated" || status === "cancelled" ? status : undefined,
  };
}

export const Route = createFileRoute("/_app/requests")({
  component: RequestsPage,
  validateSearch,
  beforeLoad: ({ context }) => {
    if (!hasMinRole(context.user?.role, "admin")) {
      throw redirect({ to: "/movies", state: { unauthorized: true } });
    }
  },
});

function RequestsPage() {
  const { type, status } = Route.useSearch();
  const navigate = useNavigate();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useInfiniteQuery(
    requestQueries.list({ type, status }),
  );
  const results = data?.pages.flatMap((page) => page.results) ?? [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <Container>
      <div className="space-y-6">
        <RequestTabs
          status={status}
          type={type}
          onStatusChange={(next) => navigate({ to: "/requests", search: { type, status: next } })}
          onTypeChange={(next) => navigate({ to: "/requests", search: { status, type: next } })}
        />

        {!isPending && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg">
              <Trans>No requests found.</Trans>
            </p>
          </div>
        ) : (
          <RequestGrid items={results} isLoading={isPending || isFetchingNextPage} onLoadMore={handleLoadMore} />
        )}
      </div>
    </Container>
  );
}
