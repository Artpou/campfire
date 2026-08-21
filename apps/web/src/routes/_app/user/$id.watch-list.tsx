import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

import { UserListView } from "@/features/user/components/user-list-view";

export const Route = createFileRoute("/_app/user/$id/watch-list")({
  component: UserWatchListRoute,
});

function UserWatchListRoute() {
  const { id } = Route.useParams();
  return <UserListView userId={id} filter="watch-list" title={<Trans>Watch List</Trans>} />;
}
