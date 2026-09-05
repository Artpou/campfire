import type { RequestStatus } from "@seedarr/contracts";
import { hasMinRole } from "@seedarr/shared";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { RequestsView } from "@/features/request/components/requests-view";

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
  component: RequestsRoute,
  validateSearch,
  beforeLoad: ({ context }) => {
    if (!hasMinRole(context.user?.role, "admin")) {
      throw redirect({ to: "/movies", state: { unauthorized: true } });
    }
  },
});

function RequestsRoute() {
  const { type, status } = Route.useSearch();
  return <RequestsView type={type} status={status} />;
}
