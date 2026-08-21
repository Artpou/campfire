import { createFileRoute } from "@tanstack/react-router";

import { DownloadsView } from "@/features/downloads/components/downloads-view";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { validateDownloadsSearch } from "@/routes/helpers/downloads-route.helper";

export const Route = createFileRoute("/_app/downloads/")({
  component: DownloadsRoute,
  validateSearch: validateDownloadsSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureInfiniteQueryData(
        mediaQueries.list({
          filter: "downloaded",
          type: deps.type,
          with_genres: deps.with_genres,
          sortBy: deps.sortBy,
          sortOrder: deps.sortOrder,
        }),
      ),
    ]),
});

function DownloadsRoute() {
  const search = Route.useSearch();
  return <DownloadsView search={search} />;
}
