import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Play } from "lucide-react";
import { type AvailableLanguage, TMDB, WatchLocale } from "tmdb-ts";
import { MovieCard } from "@/components/movies/movie-card";
import { MovieDetailsSkeleton } from "@/components/movies/movie-details-skeleton";
import { TorrentTable } from "@/components/torrent/torrent-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { formatRuntime } from "@/helpers/date";
import { getBackdropUrl, getPosterUrl } from "@/helpers/movie.helper";
import { getTMDBLanguage } from "@/lib/local.server";

const getMovie = createServerFn({ method: "GET" })
  .inputValidator((movieId: string) => movieId)
  .handler(async ({ data: movieId }) => {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY || "";
    const language = await getTMDBLanguage();

    const tmdb = new TMDB(apiKey);

    const [movie, providers, similarMovies] = await Promise.all([
      tmdb.movies.details(Number(movieId), undefined, language),
      tmdb.movies.watchProviders(Number(movieId)),
      tmdb.movies.similar(Number(movieId), { language }),
    ]);

    return { language, movie, providers, similarMovies };
  });

export const Route = createFileRoute("/_app/movies/$movieId")({
  component: MovieDetails,
  loader: async ({ params }) => {
    return await getMovie({ data: params.movieId });
  },
  pendingComponent: () => <MovieDetailsSkeleton />,
});

function MovieDetails() {
  const { language, movie, providers: providersData, similarMovies } = Route.useLoaderData();

  // Extract country code from language (e.g., "fr-FR" -> "FR")
  const countryCode = language?.split("-")[1] as keyof WatchLocale | undefined;

  const providers =
    (countryCode && providersData?.results?.[countryCode]) || providersData?.results?.US;

  const allProviders = providers
    ? [...("flatrate" in providers ? providers.flatrate || [] : [])]
    : [];

  // Deduplicate providers by provider_id
  const uniqueProviders = allProviders.filter(
    (v, i, a) => a.findIndex((t) => t.provider_id === v.provider_id) === i,
  );

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

  const release_year = new Date(movie.release_date).getFullYear().toString();

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
                        {new Date(movie.release_date).toLocaleDateString(language)}
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
            <TorrentTable search={movie.original_title} year={release_year} />
          </div>
        </div>
      </div>
    </div>
  );
}
