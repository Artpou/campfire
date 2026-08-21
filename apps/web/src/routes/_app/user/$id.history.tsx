import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

import { UserListView } from "@/features/user/components/user-list-view";

export const Route = createFileRoute("/_app/user/$id/history")({
  component: UserHistoryRoute,
});

function UserHistoryRoute() {
  const { id } = Route.useParams();
  return <UserListView userId={id} filter="history" title={<Trans>Watch History</Trans>} />;
}
