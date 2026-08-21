import { createFileRoute } from "@tanstack/react-router";

import { validateMovieDiscoverSearch } from "@/features/media/helpers/discover-search.helper";
import { MoviesView } from "@/features/movies/components/movies-view";

export const Route = createFileRoute("/_app/movies/")({
  component: MoviesRoute,
  validateSearch: validateMovieDiscoverSearch,
});

function MoviesRoute() {
  const search = Route.useSearch();
  return <MoviesView search={search} />;
}
