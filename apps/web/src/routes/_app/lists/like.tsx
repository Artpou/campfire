import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

import { Container } from "@/shared/ui/container";

import { MediaGrid } from "@/features/media/components/media-grid";
import { useMedias } from "@/features/media/hooks/use-media";

export const Route = createFileRoute("/_app/lists/like")({
  component: LikePage,
});

function LikePage() {
  const { _ } = useLingui();

  const { results, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMedias({
    type: "movie",
    filter: "like",
  });

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <Container>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{_(msg`Liked`)}</h1>

        {!isLoading && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg">
              <Trans>No liked items yet.</Trans>
            </p>
          </div>
        ) : (
          <MediaGrid
            items={results}
            isLoading={isLoading || isFetchingNextPage}
            onLoadMore={handleLoadMore}
            withLoading={false}
          />
        )}
      </div>
    </Container>
  );
}
