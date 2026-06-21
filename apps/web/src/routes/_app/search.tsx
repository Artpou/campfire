import { useEffect, useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDebounce } from "@uidotdev/usehooks";
import { SearchIcon } from "lucide-react";

import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";

import { MediaCarousel } from "@/features/media/components/media-carousel";
import { MediaGrid } from "@/features/media/components/media-grid";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { shouldLoadSearchResults, validateSearchRouteSearch } from "@/routes/helpers/search-route.helper";

export const Route = createFileRoute("/_app/search")({
  component: SearchPage,
  validateSearch: validateSearchRouteSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    if (!shouldLoadSearchResults(deps.q)) {
      return Promise.all([
        context.queryClient.ensureQueryData(mediaQueries.trending("movie", context.language)),
        context.queryClient.ensureQueryData(mediaQueries.trending("tv", context.language)),
      ]);
    }

    return Promise.all([context.queryClient.ensureQueryData(mediaQueries.search(deps.q, context.language))]);
  },
});

function SearchPage() {
  const { q, type } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useLingui();
  const locale = useTmdbLocale();

  const [query, setQuery] = useState(q || "");
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    navigate({
      to: "/search",
      search: { q: debouncedQuery, type },
      replace: true,
      resetScroll: false,
    });
  }, [debouncedQuery, navigate, type]);

  const { data: searchResults = [], isLoading } = useQuery({
    ...mediaQueries.search(q || "", locale),
    enabled: q.trim().length >= 2,
  });
  const { data: trendingMovies = [] } = useSuspenseQuery(mediaQueries.trending("movie", locale));
  const { data: trendingTv = [] } = useSuspenseQuery(mediaQueries.trending("tv", locale));

  const filteredResults = useMemo(() => {
    return searchResults.filter((m: Media) => m.type === type);
  }, [searchResults, type]);

  return (
    <Container>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
            <Input
              h="lg"
              placeholder={t`Search movies and TV shows...`}
              value={query}
              search
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {!q ? (
          <div className="space-y-8">
            <MediaCarousel title={<Trans>Popular Movies</Trans>} data={trendingMovies} seeMoreTo="/movies" />
            <MediaCarousel title={<Trans>Popular TV Shows</Trans>} data={trendingTv} seeMoreTo="/tv" />
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <SeedarrLoader />
          </div>
        ) : filteredResults.length > 0 ? (
          <MediaGrid items={filteredResults} search />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <SearchIcon className="size-16 text-muted-foreground/20 mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              <Trans>No results found for "{q}"</Trans>
            </h2>
            <p className="text-muted-foreground">
              <Trans>Try a different search term</Trans>
            </p>
          </div>
        )}
      </div>
    </Container>
  );
}
