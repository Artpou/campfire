import { Trans } from "@lingui/react/macro";
import type { RequestStatus } from "@seedarr/contracts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { flattenInfiniteResults } from "@/shared/hooks/use-infinite-list";
import { Container } from "@/shared/ui/container";

import { RequestGrid } from "@/features/request/components/request-grid";
import { RequestTabs } from "@/features/request/components/request-tabs";
import { requestQueries } from "@/features/request/hooks/request.queries";

export interface RequestsViewProps {
  type: "movie" | "tv" | undefined;
  status: RequestStatus | undefined;
}

export function RequestsView({ type, status }: RequestsViewProps) {
  const navigate = useNavigate();

  const query = useInfiniteQuery(requestQueries.list({ type, status }));

  return (
    <Container>
      <div className="space-y-6">
        <RequestTabs
          status={status}
          type={type}
          onStatusChange={(next) => navigate({ to: "/requests", search: { type, status: next } })}
          onTypeChange={(next) => navigate({ to: "/requests", search: { status, type: next } })}
        />

        {!query.isPending && flattenInfiniteResults(query).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg">
              <Trans>No requests found.</Trans>
            </p>
          </div>
        ) : (
          <RequestGrid query={query} />
        )}
      </div>
    </Container>
  );
}
