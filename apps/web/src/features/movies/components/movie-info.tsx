import { useMemo } from "react";

import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import type { AppendToResponse, MovieDetails, WatchLocale } from "tmdb-ts";

import { formatRuntime } from "@/shared/helpers/date";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
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
    if (uniqueProviders.flatrate.length > 0) return uniqueProviders.flatrate.slice(0, 5);
    if (uniqueProviders.buyRent.length > 0) return uniqueProviders.buyRent.slice(0, 5);
    return [];
  }, [uniqueProviders]);

  return (
    <div className="dark text-foreground flex flex-col gap-4">
      <div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">{movie.title}</h1>
        <div className="flex items-center gap-3 text-sm font-medium mt-4">
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

      {(movie.tagline || movie.overview) && (
        <div className="space-y-2">
          {movie.tagline && (
            <p className="text-muted-foreground italic font-bold">{movie.tagline}</p>
          )}
          {movie.overview && <p className="text-sm leading-relaxed">{movie.overview}</p>}
        </div>
      )}

      <div className="flex items-center gap-4">
        <CircularProgress value={(movie.vote_average || 0) * 10} size={52} strokeWidth={5} />

        <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
          {firstProviders.map((provider) => (
            <img
              key={provider.provider_id}
              src={getBackdropUrl(provider.logo_path, "original")}
              alt={provider.provider_name}
              title={provider.provider_name}
              className="size-9 rounded-full border border-white/10 shadow-sm transition-transform hover:scale-110"
            />
          ))}
          {firstProviders.length <
            uniqueProviders.flatrate.length + uniqueProviders.buyRent.length && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trans>
                    See all ({uniqueProviders.flatrate.length + uniqueProviders.buyRent.length})
                  </Trans>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                {uniqueProviders.flatrate.length > 0 && (
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      <Trans>Streaming</Trans>
                    </DropdownMenuLabel>
                    <div className="flex flex-wrap gap-2 p-2">
                      {uniqueProviders.flatrate.map((provider) => (
                        <img
                          key={provider.provider_id}
                          src={getBackdropUrl(provider.logo_path, "original")}
                          alt={provider.provider_name}
                          title={provider.provider_name}
                          className="size-9 rounded-full border border-white/10 shadow-sm"
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
                          <img
                            key={provider.provider_id}
                            src={getBackdropUrl(provider.logo_path, "original")}
                            alt={provider.provider_name}
                            title={provider.provider_name}
                            className="size-9 rounded-full border border-white/10 shadow-sm"
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
