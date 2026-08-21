import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

import { UserListView } from "@/features/user/components/user-list-view";

export const Route = createFileRoute("/_app/user/$id/likes")({
  component: UserLikesRoute,
});

function UserLikesRoute() {
  const { id } = Route.useParams();
  return <UserListView userId={id} filter="like" title={<Trans>Liked</Trans>} />;
}
