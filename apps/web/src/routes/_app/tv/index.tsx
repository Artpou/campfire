import { createFileRoute } from "@tanstack/react-router";

import { validateTvDiscoverSearch } from "@/features/media/helpers/discover-search.helper";
import { TvView } from "@/features/tv/components/tv-view";

export const Route = createFileRoute("/_app/tv/")({
  component: TvRoute,
  validateSearch: validateTvDiscoverSearch,
});

function TvRoute() {
  const search = Route.useSearch();
  return <TvView search={search} />;
}
