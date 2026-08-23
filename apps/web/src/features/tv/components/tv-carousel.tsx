import { useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Download, Media, TMDBTvDetails } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClapperboardIcon, MagnetIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Select } from "@/shared/components/select/select";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";

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

function countSeasonDownloads(
  seasonNumber: number,
  episodeCount: number,
  episodeDownloadMap: Map<string, Download>,
): number {
  let downloaded = 0;
  for (let episode = 1; episode <= episodeCount; episode++) {
    if (episodeDownloadMap.has(`${seasonNumber}-${episode}`)) downloaded++;
  }
  return downloaded;
}

export function TvCarousel({ tv, media, downloads, className, activeSeason, activeEpisode }: TvCarouselProps) {
  const locale = useTmdbLocale();
  const isMobile = useIsMobile();
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

  const seasonOptions = validSeasons.map((season) => {
    const episodeCount = season.episode_count ?? 0;
    const downloaded = countSeasonDownloads(season.season_number, episodeCount, episodeDownloadMap);
    const seasonLabel = season.name || `Season ${season.season_number}`;

    return {
      value: season.season_number.toString(),
      label: (
        <span className="flex w-full items-center justify-between gap-2">
          <span className="truncate">{seasonLabel}</span>
          {downloaded > 0 && (
            <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
              {downloaded}/{episodeCount}
            </Badge>
          )}
        </span>
      ),
    };
  });

  return (
    <div className="space-y-3">
      <CarouselWrapper
        title={
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Select
              value={selectedSeason.toString()}
              onValueChange={(value) => setSelectedSeason(Number(value))}
              options={seasonOptions}
              triggerClassName="w-fit min-w-40"
              panelLabel={<Trans>Season</Trans>}
              placeholder={<Trans>Season</Trans>}
            />
            <Button
              variant="secondary"
              size={isMobile ? "icon-lg" : "default"}
              asChild
              icon={isMobile ? MagnetIcon : undefined}
            >
              <Link to="/tv/$id/torrents" params={{ id: tv.id.toString() }} search={{ season: selectedSeason }}>
                {!isMobile && <Trans>Torrents</Trans>}
              </Link>
            </Button>
          </div>
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
