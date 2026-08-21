import type { RequestStatus } from "@seedarr/contracts";
import { createFileRoute } from "@tanstack/react-router";

import { redirectIfNotRole } from "@/shared/helpers/role.helper";

import { UserRequestsView } from "@/features/user/components/user-requests-view";
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
  component: UserRequestsRoute,
  beforeLoad: ({ context, params }) => {
    const isOwn = context.user?.id === params.id;
    if (!isOwn) redirectIfNotRole(context, "admin", { to: "/movies" });
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(userQueries.details(params.id)),
  validateSearch,
});

function UserRequestsRoute() {
  const { id } = Route.useParams();
  const { type, status } = Route.useSearch();
  return <UserRequestsView userId={id} type={type} status={status} />;
}
