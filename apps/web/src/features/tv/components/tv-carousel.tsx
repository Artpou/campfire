import { useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Download, Media, TMDBTvDetails } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, ChevronDownIcon, ClapperboardIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Button } from "@/shared/ui/button";
import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";
import {
  DropDrawer,
  DropDrawerContent,
  DropDrawerGroup,
  DropDrawerItem,
  DropDrawerTrigger,
} from "@/shared/ui/dropdrawer";

import { MediaBadgeDate } from "@/features/media/components/badge/media-badge-date";
import { MediaBadgeRuntime } from "@/features/media/components/badge/media-badge-runtime";
import { MediaButtonPlay } from "@/features/media/components/button/media-button-play";
import { MediaButtonTorrent } from "@/features/media/components/button/media-button-torrent";
import { getBackdropUrl } from "@/features/media/helpers/media.helper";
import { formatSeasonEpisode } from "@/features/tv/helpers/episode.helper";
import { tvQueries } from "@/features/tv/hooks/tv.queries";
import { useEpisodeDownloadMap } from "@/features/tv/hooks/use-episode-download-map";

interface TvCarouselProps {
  tv: TMDBTvDetails;
  media: Media;
  downloads: Download[];
  className?: string;
  activeSeason?: number;
  activeEpisode?: number;
}

export function TvCarousel({ tv, media, downloads, className, activeSeason, activeEpisode }: TvCarouselProps) {
  const locale = useTmdbLocale();
  const validSeasons = useMemo(() => (tv.seasons ?? []).filter((season) => season.season_number > 0), [tv.seasons]);
  const [selectedSeason, setSelectedSeason] = useState<number>(
    () => activeSeason ?? validSeasons[0]?.season_number ?? 1,
  );

  const episodeDownloadMap = useEpisodeDownloadMap(downloads);

  const { data: seasonDetails } = useQuery({
    ...tvQueries.season(tv.id, selectedSeason, locale),
    enabled: validSeasons.length > 0,
  });

  const episodes = useMemo(
    () => (seasonDetails?.episodes ?? []).slice().sort((a, b) => a.episode_number - b.episode_number),
    [seasonDetails?.episodes],
  );

  if (validSeasons.length === 0) return null;

  const selectedLabel = validSeasons.find((season) => season.season_number === selectedSeason);

  return (
    <div className="space-y-3">
      <CarouselWrapper
        title={
          <DropDrawer>
            <DropDrawerTrigger asChild>
              <Button variant="outline" className="w-fit justify-between gap-2">
                <span className="truncate font-medium">
                  {selectedLabel?.name || <Trans>Season {selectedSeason}</Trans>}
                </span>
                <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
              </Button>
            </DropDrawerTrigger>
            <DropDrawerContent>
              <DropDrawerGroup>
                {validSeasons.map((season) => (
                  <DropDrawerItem
                    key={season.season_number}
                    onSelect={() => setSelectedSeason(season.season_number)}
                    icon={season.season_number === selectedSeason ? <CheckIcon className="size-4" /> : undefined}
                  >
                    {season.name || <Trans>Season {season.season_number}</Trans>}
                  </DropDrawerItem>
                ))}
              </DropDrawerGroup>
            </DropDrawerContent>
          </DropDrawer>
        }
      >
        {episodes.map((episode) => {
          const download = episodeDownloadMap.get(`${selectedSeason}-${episode.episode_number}`);
          const isActive = activeSeason === selectedSeason && activeEpisode === episode.episode_number;

          return (
            <CarouselItem
              key={episode.id}
              className={cn(
                "w-auto p-1 basis-[70%] sm:basis-[42%] md:basis-[32%] lg:basis-[24%] xl:basis-[20%]",
                isActive && "border-2 border-primary rounded-md",
                className,
              )}
            >
              <div className="space-y-2">
                <div className="group/poster relative aspect-video overflow-hidden rounded-md bg-muted">
                  {episode.still_path ? (
                    <img
                      src={getBackdropUrl(episode.still_path, "w300")}
                      alt={episode.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <ClapperboardIcon className="size-8 text-muted-foreground" />
                    </div>
                  )}
                  {download && !isActive && (
                    <MediaButtonPlay
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/poster:bg-black/50 transition-colors"
                      media={media}
                      downloadId={download.id}
                      season={selectedSeason}
                      episode={episode.episode_number}
                      circular
                    />
                  )}
                  {!download && !isActive && (
                    <MediaButtonTorrent
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/poster:bg-black/50 transition-colors"
                      media={media}
                      season={selectedSeason}
                      episode={episode.episode_number}
                      circular
                    />
                  )}
                  {isActive && <div className="absolute inset-0 ring-2 ring-primary rounded-md pointer-events-none" />}
                </div>

                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium truncate">
                    <span className="text-muted-foreground mr-1">
                      {formatSeasonEpisode(selectedSeason, episode.episode_number)}
                    </span>
                    {episode.name}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <MediaBadgeDate date={episode.air_date} />
                    <MediaBadgeRuntime minutes={episode.runtime} />
                  </div>
                </div>
              </div>
            </CarouselItem>
          );
        })}
      </CarouselWrapper>
    </div>
  );
}
