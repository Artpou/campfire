import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Container } from "@/shared/ui/container";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { MediaGrid } from "@/features/media/components/media-grid";
import { mediaQueries, refetchMediaInterval } from "@/features/media/hooks/media.queries";
import { type ListsTab, listsTabValues, validateListsSearch } from "@/routes/helpers/lists-route.helper";

export const Route = createFileRoute("/_app/lists")({
  component: ListsPage,
  validateSearch: validateListsSearch,
  loaderDeps: ({ search }) => ({ tab: validateListsSearch(search).tab }),
  loader: ({ context, deps }) =>
    Promise.all([context.queryClient.ensureInfiniteQueryData(mediaQueries.list({ filter: deps.tab }))]),
});

const tabLabels: Record<ListsTab, ReturnType<typeof msg>> = {
  "watch-list": msg`Watch List`,
  like: msg`Liked`,
};

function ListsPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { _ } = useLingui();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery({
    ...mediaQueries.list({ filter: tab }),
    refetchInterval: refetchMediaInterval,
  });
  const results = data?.pages.flatMap((page) => page.results) ?? [];

  const handleTabChange = (value: string) => {
    navigate({ to: "/lists", search: { tab: value as ListsTab }, replace: true, resetScroll: false });
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <Container>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList size="lg">
              {listsTabValues.map((value) => (
                <TabsTrigger key={value} value={value} size="lg">
                  {_(tabLabels[value])}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {!isLoading && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg">
              <Trans>No items yet.</Trans>
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
