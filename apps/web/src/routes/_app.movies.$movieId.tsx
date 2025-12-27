import type { Torrent } from "@basement/api/types";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { Dialog, DialogContent, DialogTrigger } from "@radix-ui/react-dialog";
import type { UseQueryResult } from "@tanstack/react-query";
import { useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Play } from "lucide-react";
import ms from "ms";
import { useMemo, useState } from "react";
import { TMDB, type WatchLocale } from "tmdb-ts";
import { MovieCard } from "@/components/movies/movie-card";
import { MovieDetailsSkeleton } from "@/components/movies/movie-details-skeleton";
import { TorrentTable } from "@/components/torrent/torrent-table";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { countryToTmdbLocale } from "@/i18n";
import { api } from "@/lib/api";
import { Badge } from "../components/ui/badge";
import { CircularProgress } from "../components/ui/circular-progress";
import { formatRuntime } from "../helpers/date";
import { getBackdropUrl, getPosterUrl } from "../helpers/movie.helper";

export const Route = createFileRoute("/_app/movies/$movieId")({
  component: MovieDetailsPage,
  pendingComponent: () => <MovieDetailsSkeleton />,
});

export type IndexerType = "jackett" | "prowlarr";

function MovieDetailsPage() {
  const params = Route.useParams();
  const { i18n } = useLingui();
  const tmdbLocale = countryToTmdbLocale(i18n.locale);

  const movieId = params.movieId;

  const [visibleIndexers, setVisibleIndexers] = useState<Set<string>>(new Set());

  const { data: { movie, providers, similarMovies } = {}, isLoading: isLoadingMovie } = useQuery({
    queryKey: ["movie", movieId, tmdbLocale],
    queryFn: async () => {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY || "";
      const tmdb = new TMDB(apiKey);

      const [movie, providers, similarMovies] = await Promise.all([
        tmdb.movies.details(Number(movieId), undefined, tmdbLocale),
        tmdb.movies.watchProviders(Number(movieId)),
        tmdb.movies.similar(Number(movieId), { language: tmdbLocale }),
      ]);

      api.media.track.post({
        ...movie,
        type: "movie",
        title: movie.title || movie.original_title,
      });

      return { movie, providers, similarMovies };
    },
    staleTime: ms("5m"),
  });

  const { data: indexers = [] } = useQuery({
    queryKey: ["indexers"],
    queryFn: async () => {
      const response = await api.torrents.indexers.get();
      if (!response.data) return [];
      return response.data;
    },
  });

  // Search query parameters
  const search = movie?.original_title || "";
  const release_year = movie?.release_date
    ? new Date(movie.release_date).getFullYear().toString()
    : undefined;

  // Fetch torrents from all indexers
  const { recommended, others, queries } = useQueries({
    queries: indexers.map((indexer) => ({
      queryKey: ["torrents", search, release_year, indexer.id],
      queryFn: () => {
        console.log("indexer", indexer);
        return api.torrents.search.get({
          query: {
            q: search,
            t: "movie",
            year: release_year,
            indexerId: indexer.id,
          },
        });
      },
      enabled: !!search,
      retry: 1,
    })),
    combine: (results) => {
      const recommended: Torrent[] = [];
      const others: Torrent[] = [];

      for (const [index, query] of results.entries()) {
        const indexerId = indexers[index]?.id;

        // Only include results from visible indexers
        if (
          query.data?.data &&
          indexerId &&
          visibleIndexers.has(indexerId) &&
          typeof query.data.data === "object" &&
          query.data.data !== null &&
          "recommended" in query.data.data &&
          "others" in query.data.data
        ) {
          const data = query.data.data as { recommended: Torrent[]; others: Torrent[] };
          recommended.push(...data.recommended);
          others.push(...data.others);
        }
      }

      return {
        recommended: recommended.sort((a, b) => b.seeders - a.seeders),
        others: others.sort((a, b) => b.seeders - a.seeders),
        queries: results,
      };
    },
  });

  const uniqueProviders = useMemo(() => {
    const countryCode = (tmdbLocale?.split("-")[1] || "US") as keyof WatchLocale;
    const countryProviders = providers?.results?.[countryCode];

    if (!countryProviders) return [];

    if ("flatrate" in countryProviders) {
      return countryProviders.flatrate?.filter(
        (v, i, a) => a.findIndex((t) => t.provider_id === v.provider_id) === i,
      );
    }

    return [];
  }, [providers, tmdbLocale]);

  if (isLoadingMovie) {
    return <MovieDetailsSkeleton />;
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center gap-4">
        <h1 className="text-2xl font-bold">
          <Trans>Movie not found</Trans>
        </h1>
        <Button onClick={() => window.history.back()}>
          <Trans>Go Back</Trans>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <div className="relative flex flex-col justify-end">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${getBackdropUrl(movie.backdrop_path)})`,
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-background/60 to-background" />
        </div>

        {/* Banner Content */}
        <div className="relative z-10 px-6 md:px-12 h-full flex flex-col justify-end pb-6 pt-12 w-full">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
            <div className="xl:col-span-3 flex flex-col md:flex-row gap-8 items-start">
              {/* Poster & Trailer */}
              <div className="hidden md:flex flex-col gap-0 w-56 shrink-0">
                <div className="aspect-2/3 rounded-md rounded-b-none! overflow-hidden border border-secondary shadow-2xl relative group">
                  <img
                    src={getPosterUrl(movie.poster_path, "w500")}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="rounded-t-none">
                      <Play className="size-3 fill-current" /> <Trans>WATCH TRAILER</Trans>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[800px] p-0 bg-black border-none overflow-hidden aspect-video">
                    {/* Trailer content */}
                  </DialogContent>
                </Dialog>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4 pb-4">
                <div className="flex flex-col gap-1">
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight">{movie.title}</h1>
                  <div className="flex items-center gap-3 text-sm font-medium">
                    {movie.release_date && (
                      <Badge variant="secondary">
                        {new Date(movie.release_date).toLocaleDateString(tmdbLocale)}
                      </Badge>
                    )}
                    <span className="opacity-30">•</span>
                    {movie.runtime && <span>{formatRuntime(movie.runtime)}</span>}
                    <span className="opacity-30">•</span>
                    {movie.genres && movie.genres.length > 0 && (
                      <span>
                        {movie.genres
                          .slice(0, 3)
                          .map((genre) => (typeof genre === "string" ? genre : genre.name))
                          .join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Synopsis in Hero */}
                {(movie.tagline || movie.overview) && (
                  <div className="max-w-3xl space-y-2">
                    {movie.tagline && (
                      <p className="text-muted-foreground italic font-bold">{movie.tagline}</p>
                    )}
                    {movie.overview && (
                      <p className="text-sm  leading-relaxed line-clamp-3 md:line-clamp-none">
                        {movie.overview}
                      </p>
                    )}
                  </div>
                )}

                {/* Stats & Providers */}
                <div className="flex items-center gap-4">
                  <CircularProgress
                    value={(movie.vote_average || 0) * 10}
                    size={52}
                    strokeWidth={5}
                  />

                  {uniqueProviders.length > 0 && (
                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                      {uniqueProviders.slice(0, 5).map((provider) => (
                        <div
                          key={provider.provider_id}
                          className="size-9 rounded-full overflow-hidden border border-white/10 shadow-sm transition-transform hover:scale-110"
                          title={provider.provider_name}
                        >
                          <img
                            src={getBackdropUrl(provider.logo_path, "original")}
                            alt={provider.provider_name}
                            className="size-full object-cover"
                          />
                        </div>
                      ))}
                      {uniqueProviders.length > 5 && (
                        <span className="text-[10px] text-white/50 font-bold ml-1">
                          +{uniqueProviders.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Similar Movies - Right Side */}
            <div className="hidden xl:block xl:col-span-1">
              <div className="sticky top-4 space-y-4 flex flex-col">
                <h2 className="text-xl font-bold tracking-tight px-1">
                  <Trans>Similar Movies</Trans>
                </h2>
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2">
                    {similarMovies?.results?.map((similar) => (
                      <CarouselItem key={similar.id} className="pl-2 basis-1/2">
                        <div className="p-1">
                          <MovieCard movie={similar} size="sm" />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <CarouselPrevious className="static translate-y-0" />
                    <CarouselNext className="static translate-y-0" />
                  </div>
                </Carousel>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 mt-6 flex flex-col gap-12 w-full">
        {/* Torrents List */}
        <div className="space-y-6 pt-10 pb-20 w-full">
          <div className="w-full">
            <TorrentTable
              recommended={recommended}
              others={others}
              indexers={indexers}
              torrentQueries={queries as UseQueryResult<unknown, Error>[]}
              visibleIndexers={visibleIndexers}
              onVisibilityChange={setVisibleIndexers}
            />{" "}
          </div>
        </div>
      </div>
    </div>
  );
}
