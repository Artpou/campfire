import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import { hasMinRole, type RequestStatus } from "@seedarr/contracts";
import type { MediaRequest } from "@seedarr/sdk";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { Container } from "@/shared/ui/container";

import { useAuth } from "@/features/auth/auth-store";
import { RequestGrid } from "@/features/request/components/request-grid";
import { RequestTabs } from "@/features/request/components/request-tabs";
import { requestQueries } from "@/features/request/hooks/request.queries";
import { userQueries } from "@/features/user/hooks/user.queries";

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

export const Route = createFileRoute("/_app/user/$id/requests")({
  component: UserRequestsPage,
  beforeLoad: ({ context, params }) => {
    const isOwn = context.user?.id === params.id;
    const isAdmin = hasMinRole(context.user?.role, "admin");
    if (!isOwn && !isAdmin) {
      throw redirect({ to: "/movies" });
    }
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(userQueries.details(params.id)),
  validateSearch,
});

function UserRequestsPage() {
  const { id } = Route.useParams();
  const { type, status } = Route.useSearch();
  const navigate = useNavigate();
  const currentUser = useAuth((s) => s.user);
  const { data: profileUser } = useSuspenseQuery(userQueries.details(id));

  const { data: requests, isLoading } = useQuery(requestQueries.byUser(id));

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    let items = requests as (MediaRequest & { status?: RequestStatus })[];
    if (type) items = items.filter((r) => r.media.type === type);
    if (status) items = items.filter((r) => (r.status ?? "pending") === status);
    return items;
  }, [requests, type, status]);

  const displayName = profileUser.pseudo || profileUser.username;

  return (
    <Container>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">
          {currentUser?.id === id ? <Trans>My Requests</Trans> : <Trans>Requests by {displayName}</Trans>}
        </h1>

        <RequestTabs
          status={status}
          type={type}
          onStatusChange={(next) =>
            navigate({ to: "/user/$id/requests", params: { id }, search: { type, status: next } })
          }
          onTypeChange={(next) =>
            navigate({ to: "/user/$id/requests", params: { id }, search: { status, type: next } })
          }
        />

        {!isLoading && filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg">
              <Trans>No requests.</Trans>
            </p>
          </div>
        ) : (
          <RequestGrid items={filteredRequests} isLoading={isLoading} />
        )}
      </div>
    </Container>
  );
}
