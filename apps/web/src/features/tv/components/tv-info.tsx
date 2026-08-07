import { useMemo } from "react";

import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import type { TMDBTvDetails } from "@seedarr/sdk";
import { formatRuntime } from "@seedarr/shared";
import { ClockIcon, PlusIcon } from "lucide-react";
import type { WatchLocale } from "tmdb-ts";

import { Flag } from "@/shared/components/flag";
import { ProviderIcon } from "@/shared/components/provider-icon";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { Badge } from "@/shared/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { MediaRating } from "@/features/media/components/media-rating";

interface TvInfoProps {
  tv: TMDBTvDetails;
}

export function TvInfo({ tv }: TvInfoProps) {
  const { i18n } = useLingui();
  const tmdbLocale = countryToTmdbLocale(i18n.locale);

  const uniqueProviders = useMemo(() => {
    const countryProviders = tv["watch/providers"]?.results?.[(tmdbLocale?.split("-")[1] || "US") as keyof WatchLocale];
    if (!countryProviders) return { flatrate: [], buyRent: [] };

    const flatrate =
      "flatrate" in countryProviders
        ? (countryProviders.flatrate?.filter((v, i, a) => a.findIndex((t) => t.provider_id === v.provider_id) === i) ??
          [])
        : [];

    const buy = "buy" in countryProviders ? countryProviders.buy || [] : [];
    const rent = "rent" in countryProviders ? countryProviders.rent || [] : [];

    const buyRent = [...buy, ...rent].filter((v, i, a) => a.findIndex((t) => t.provider_id === v.provider_id) === i);

    return { flatrate, buyRent };
  }, [tv, tmdbLocale]);

  const firstProviders = useMemo(() => {
    if (uniqueProviders.flatrate.length > 0) return uniqueProviders.flatrate.slice(0, 4);
    if (uniqueProviders.buyRent.length > 0) return uniqueProviders.buyRent.slice(0, 4);
    return [];
  }, [uniqueProviders]);

  const episodeRuntime = tv.episode_run_time?.[0];
  const lastEpisode = tv.last_episode_to_air;
  const nextEpisode = tv.next_episode_to_air;

  return (
    <div className="dark text-foreground flex flex-col gap-4">
      <div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">{tv.name || tv.original_name || ""}</h1>
        <div className="flex items-center mt-1 gap-2">
          <Flag lang={tv.original_language ?? ""} />
          <p className="text-sm text-muted-foreground font-medium">{tv.original_name}</p>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium mt-4 flex-wrap">
          {tv.first_air_date && (
            <span>
              {new Date(tv.first_air_date).toLocaleDateString(undefined, {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}

          {episodeRuntime ? (
            <>
              <span className="opacity-30">•</span>
              <span>{formatRuntime(episodeRuntime)}</span>
            </>
          ) : null}
          {(tv.number_of_seasons ?? 0) > 0 && (
            <>
              <span className="opacity-30">•</span>
              <span>
                <Trans>
                  {tv.number_of_seasons} seasons · {tv.number_of_episodes} episodes
                </Trans>
              </span>
            </>
          )}
          {tv.genres && tv.genres.length > 0 && (
            <>
              <span className="opacity-30">•</span>
              <span className="max-w-[50%] truncate">
                {tv.genres
                  .slice(0, 3)
                  .map((genre) => (typeof genre === "string" ? genre : genre.name))
                  .join(", ")}
              </span>
            </>
          )}
        </div>
        {episodeRuntime && episodeRuntime > 0 && (
          <Badge variant="secondary" className="text-sm px-2.5 py-1 gap-1.5 mt-2">
            <ClockIcon className="size-3.5" />
            <Trans>Ends at</Trans>{" "}
            {new Date(Date.now() + episodeRuntime * 60000).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Badge>
        )}
        {nextEpisode?.air_date && (
          <Badge variant="secondary" className="mt-2">
            <Trans>
              Next episode: S{nextEpisode.season_number}E{nextEpisode.episode_number} -{" "}
              {new Date(nextEpisode.air_date).toLocaleDateString()}
            </Trans>
          </Badge>
        )}
        {!nextEpisode && lastEpisode?.air_date && (
          <Badge variant="secondary" className="mt-2">
            <Trans>
              Last episode: S{lastEpisode.season_number}E{lastEpisode.episode_number} -{" "}
              {new Date(lastEpisode.air_date).toLocaleDateString(undefined, {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Trans>
          </Badge>
        )}
      </div>

      {(tv.tagline || tv.overview) && (
        <div className="space-y-2">
          {tv.tagline && <p className="text-muted-foreground italic font-bold">{tv.tagline}</p>}
          {tv.overview && <p className="text-sm font-medium leading-relaxed">{tv.overview}</p>}
        </div>
      )}

      <div className="flex items-center gap-4">
        <MediaRating media={tv} size={52} strokeWidth={5} />

        <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
          {firstProviders.map((provider) => (
            <ProviderIcon key={provider.provider_id} provider={provider} name={tv.name ?? ""} />
          ))}
          {firstProviders.length < uniqueProviders.flatrate.length + uniqueProviders.buyRent.length && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="size-12 rounded-full border-2 border-border shadow-sm bg-background hover:border-primary/50 hover:scale-105 transition-all flex items-center justify-center cursor-pointer"
                  title={`See all (${uniqueProviders.flatrate.length + uniqueProviders.buyRent.length})`}
                >
                  <PlusIcon className="size-5" />
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
                        <ProviderIcon key={provider.provider_id} provider={provider} name={tv.name ?? ""} />
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
                          <ProviderIcon key={provider.provider_id} provider={provider} name={tv.name ?? ""} />
                        ))}
                      </div>
                    </DropdownMenuGroup>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {firstProviders.length > 0 && <ProviderIcon provider={firstProviders[0]} name={tv.name ?? ""} fullButton />}
        </div>
      </div>
    </div>
  );
}
