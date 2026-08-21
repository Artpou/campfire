import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import type { RequestStatus } from "@seedarr/contracts";
import type { MediaRequest } from "@seedarr/sdk";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { Container } from "@/shared/ui/container";

import { useAuth } from "@/features/auth/auth-store";
import { RequestGrid } from "@/features/request/components/request-grid";
import { RequestTabs } from "@/features/request/components/request-tabs";
import { requestQueries } from "@/features/request/hooks/request.queries";
import { userQueries } from "@/features/user/hooks/user.queries";

export interface UserRequestsViewProps {
  userId: string;
  type: "movie" | "tv" | undefined;
  status: RequestStatus | undefined;
}

export function UserRequestsView({ userId, type, status }: UserRequestsViewProps) {
  const navigate = useNavigate();
  const currentUser = useAuth((s) => s.user);
  const { data: profileUser } = useSuspenseQuery(userQueries.details(userId));

  const { data: requests, isLoading } = useQuery(requestQueries.byUser(userId));

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
          {currentUser?.id === userId ? <Trans>My Requests</Trans> : <Trans>Requests by {displayName}</Trans>}
        </h1>

        <RequestTabs
          status={status}
          type={type}
          onStatusChange={(next) =>
            navigate({ to: "/user/$id/requests", params: { id: userId }, search: { type, status: next } })
          }
          onTypeChange={(next) =>
            navigate({ to: "/user/$id/requests", params: { id: userId }, search: { status, type: next } })
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
