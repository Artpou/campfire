import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

import { flattenInfiniteResults } from "@/shared/hooks/use-infinite-list";
import { Container } from "@/shared/ui/container";

import { MediaGrid } from "@/features/media/components/media-grid";
import { useMediaList } from "@/features/media/hooks/use-media";

export const Route = createFileRoute("/_app/user/$id/watch-list")({
  component: UserWatchListPage,
});

function UserWatchListPage() {
  const { id } = Route.useParams();
  const query = useMediaList({ filter: "watch-list", userId: id });

  return (
    <Container>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">
          <Trans>Watch List</Trans>
        </h1>

        {!query.isPending && flattenInfiniteResults(query).length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg">
              <Trans>No items yet.</Trans>
            </p>
          </div>
        ) : (
          <MediaGrid query={query} showType />
        )}
      </div>
    </Container>
  );
}
