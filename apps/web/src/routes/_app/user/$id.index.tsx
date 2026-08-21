import { createFileRoute } from "@tanstack/react-router";

import { UserProfileView } from "@/features/user/components/user-profile-view";
import { userQueries } from "@/features/user/hooks/user.queries";

export const Route = createFileRoute("/_app/user/$id/")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(userQueries.details(params.id)),
  component: UserProfileRoute,
});

function UserProfileRoute() {
  const { id } = Route.useParams();
  return <UserProfileView userId={id} />;
}
