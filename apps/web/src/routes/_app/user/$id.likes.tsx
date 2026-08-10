import { Trans } from "@lingui/react/macro";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { Container } from "@/shared/ui/container";

import { useAuth } from "@/features/auth/auth-store";
import { MediaGrid } from "@/features/media/components/media-grid";
import { mediaQueries, refetchMediaInterval } from "@/features/media/hooks/media.queries";
import { userQueries } from "@/features/user/hooks/user.queries";

export const Route = createFileRoute("/_app/user/$id/likes")({
  loader: async ({ context, params }) => {
    const profile = await context.queryClient.ensureQueryData(userQueries.details(params.id));
    const isOwn = context.user?.id === params.id;
    if (!isOwn && !profile.showLikes) {
      throw redirect({ to: "/user/$id", params });
    }
  },
  component: UserLikesPage,
});

function UserLikesPage() {
  const { id } = Route.useParams();
  const currentUser = useAuth((s) => s.user);
  const { data: profileUser } = useSuspenseQuery(userQueries.details(id));
  const isOwn = currentUser?.id === id;
  const allowed = isOwn || profileUser.showLikes;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useInfiniteQuery({
    ...mediaQueries.list({ filter: "like", userId: id }),
    refetchInterval: refetchMediaInterval,
    enabled: allowed,
  });
  const results = data?.pages.flatMap((page) => page.results) ?? [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <Container>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">
          <Trans>Liked</Trans>
        </h1>

        {!isPending && results.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg">
              <Trans>No items yet.</Trans>
            </p>
          </div>
        ) : (
          <MediaGrid
            items={results}
            isLoading={isPending || isFetchingNextPage}
            onLoadMore={handleLoadMore}
            withLoading={false}
          />
        )}
      </div>
    </Container>
  );
}
