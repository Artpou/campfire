import { createFileRoute } from "@tanstack/react-router";

import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";

import { mediaQueries } from "@/features/media/hooks/media.queries";
import { SearchView } from "@/features/search/components/search-view";
import { shouldLoadSearchResults, validateSearchRouteSearch } from "@/routes/helpers/search-route.helper";

export const Route = createFileRoute("/_app/search")({
  component: SearchRoute,
  validateSearch: validateSearchRouteSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    const locale = countryToTmdbLocale(context.language);
    if (!shouldLoadSearchResults(deps.q)) {
      return Promise.all([
        context.queryClient.ensureQueryData(mediaQueries.trending("movie", locale)),
        context.queryClient.ensureQueryData(mediaQueries.trending("tv", locale)),
      ]);
    }

    return Promise.all([context.queryClient.ensureQueryData(mediaQueries.search(deps.q, locale))]);
  },
});

function SearchRoute() {
  const { q, type } = Route.useSearch();
  return <SearchView q={q} type={type} />;
}
