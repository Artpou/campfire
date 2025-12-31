import { useMemo } from "react";

import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { Plus } from "lucide-react";
import type { AppendToResponse, Flatrate, MovieDetails, WatchLocale } from "tmdb-ts";

import { cn } from "@/lib/utils";
import { formatRuntime } from "@/shared/helpers/date";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { CircularProgress } from "@/shared/ui/circular-progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { getBackdropUrl } from "@/features/media/helpers/media.helper";

interface MovieInfoProps {
  movie: AppendToResponse<MovieDetails, "watch/providers"[], "movie">;
}

const ProviderIcon = ({ provider, movieName }: { provider: Flatrate; movieName: string }) => {
  const redirectUrl = useMemo(() => {
    const encodedMovieName = encodeURIComponent(movieName);
    switch (provider.provider_name.toLowerCase()) {
      case "netflix":
        return `https://www.netflix.com/search?q=${encodedMovieName}`;
      case "disney plus":
        return `https://www.disneyplus.com/`;
      case "canal+":
        return `https://www.canalplus.fr/`;
      case "hbo max":
        return `https://www.hbomax.com/`;
      case "amazon prime video":
        return `https://www.primevideo.com/search?phrase=${encodedMovieName}`;
      case "apple tv+":
        return `https://www.apple.com/apple-tv-plus/`;
      case "peacock":
        return `https://www.peacocktv.com/`;
      case "paramount+":
        return `https://www.paramountplus.com/`;
    }
  }, [provider.provider_name, movieName]);

  return (
    <button
      type="button"
      onClick={() => !!redirectUrl && window.open(redirectUrl, "_blank")}
      className={cn(
        "relative size-12 rounded-full border-2 border-border shadow-sm transition-all",
        redirectUrl && "cursor-pointer hover:border-primary/50 hover:scale-105",
      )}
      title={provider.provider_name}
      disabled={!redirectUrl}
    >
      <img
        src={getBackdropUrl(provider.logo_path, "original")}
        alt={provider.provider_name}
        className="size-full rounded-full object-cover"
      />
    </button>
  );
};

export function MovieInfo({ movie }: MovieInfoProps) {
  const { i18n } = useLingui();
  const tmdbLocale = countryToTmdbLocale(i18n.locale);

  const uniqueProviders = useMemo(() => {
    const countryProviders =
      movie["watch/providers"]?.results?.[(tmdbLocale?.split("-")[1] || "US") as keyof WatchLocale];
    if (!countryProviders) return { flatrate: [], buyRent: [] };

    const flatrate =
      "flatrate" in countryProviders
        ? countryProviders.flatrate?.filter(
            (v, i, a) => a.findIndex((t) => t.provider_id === v.provider_id) === i,
          )
        : [];

    const buy = "buy" in countryProviders ? countryProviders.buy || [] : [];
    const rent = "rent" in countryProviders ? countryProviders.rent || [] : [];

    const buyRent = [...buy, ...rent].filter(
      (v, i, a) => a.findIndex((t) => t.provider_id === v.provider_id) === i,
    );

    return { flatrate, buyRent };
  }, [movie, tmdbLocale]);

  const firstProviders = useMemo(() => {
    if (uniqueProviders.flatrate.length > 0) return uniqueProviders.flatrate.slice(0, 4);
    if (uniqueProviders.buyRent.length > 0) return uniqueProviders.buyRent.slice(0, 4);
    return [];
  }, [uniqueProviders]);

  return (
    <div className="dark text-foreground flex flex-col gap-4">
      <div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">{movie.title}</h1>
        {movie.title !== movie.original_title && (
          <p className="mt-1 text-sm text-muted-foreground font-medium">{movie.original_title}</p>
        )}
        <div className="flex items-center gap-2 text-sm font-medium mt-4">
          {movie.release_date && <span>{new Date(movie.release_date).getFullYear()}</span>}
          <span className="opacity-30">•</span>
          {movie.runtime && <span>{formatRuntime(movie.runtime)}</span>}
          <span className="opacity-30">•</span>
          {movie.genres && movie.genres.length > 0 && (
            <span className="max-w-[50%] truncate">
              {movie.genres
                .slice(0, 3)
                .map((genre) => (typeof genre === "string" ? genre : genre.name))
                .join(", ")}
            </span>
          )}
        </div>
      </div>

      {(movie.tagline || movie.overview) && (
        <div className="space-y-2">
          {movie.tagline && (
            <p className="text-muted-foreground italic font-bold">{movie.tagline}</p>
          )}
          {movie.overview && (
            <p className="text-sm font-medium leading-relaxed">{movie.overview}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <CircularProgress value={(movie.vote_average || 0) * 10} size={52} strokeWidth={5} />

        <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
          {firstProviders.map((provider) => (
            <ProviderIcon key={provider.provider_id} provider={provider} movieName={movie.title} />
          ))}
          {firstProviders.length <
            uniqueProviders.flatrate.length + uniqueProviders.buyRent.length && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="size-12 rounded-full border-2 border-border shadow-sm bg-background hover:border-primary/50 hover:scale-105 transition-all flex items-center justify-center cursor-pointer"
                  title={`See all (${uniqueProviders.flatrate.length + uniqueProviders.buyRent.length})`}
                >
                  <Plus className="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                {uniqueProviders.flatrate.length > 0 && (
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      <Trans>Streaming</Trans>
                    </DropdownMenuLabel>
                    <div className="flex flex-wrap gap-2 p-2">
                      {uniqueProviders.flatrate.map((provider) => (
                        <ProviderIcon
                          key={provider.provider_id}
                          provider={provider}
                          movieName={movie.title}
                        />
                      ))}
                    </div>
                  </DropdownMenuGroup>
                )}
                {uniqueProviders.buyRent.length > 0 && (
                  <>
                    {uniqueProviders.flatrate.length > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>
                        <Trans>Buy / Rent</Trans>
                      </DropdownMenuLabel>
                      <div className="flex flex-wrap gap-2 p-2">
                        {uniqueProviders.buyRent.map((provider) => (
                          <ProviderIcon
                            key={provider.provider_id}
                            provider={provider}
                            movieName={movie.title}
                          />
                        ))}
                      </div>
                    </DropdownMenuGroup>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
