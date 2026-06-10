import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";

import { MediaGrid } from "@/features/media/components/media-grid";
import { useClearHistory, useMedias } from "@/features/media/hooks/use-media";

export const Route = createFileRoute("/_app/lists/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { _ } = useLingui();
  const clearHistory = useClearHistory();

  const { results, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMedias({
    filter: "recently-viewed",
  });

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <Container>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">{_(msg`History`)}</h1>
          {results.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={clearHistory.isPending}>
                  <Trash2Icon className="size-4" />
                  <Trans>Clear history</Trans>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <Trans>Clear history</Trans>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <Trans>Are you sure you want to clear your viewing history? This action cannot be undone.</Trans>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    <Trans>Cancel</Trans>
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearHistory.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <Trans>Clear</Trans>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {!isLoading && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg">
              <Trans>No viewing history yet.</Trans>
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
