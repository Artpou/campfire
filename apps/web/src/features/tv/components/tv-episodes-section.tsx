import { useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Download, Media, TMDBTvDetails } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarIcon, ClapperboardIcon, ClockIcon, MagnetIcon, PlayIcon } from "lucide-react";

import { formatRuntime } from "@/shared/helpers/date";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ProgressCircular } from "@/shared/ui/progress-circular";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { useRole } from "@/features/auth/hooks/use-role";
import { getDownloadStatus } from "@/features/downloads/helpers/downloads.helper";
import { getBackdropUrl } from "@/features/media/helpers/media.helper";
import { formatSeasonEpisode } from "@/features/tv/helpers/episode.helper";
import { tvQueries } from "@/features/tv/hooks/tv.queries";

interface TvEpisodesSectionProps {
  tv: TMDBTvDetails;
  media?: Media;
}

export function TvEpisodesSection({ tv, media }: TvEpisodesSectionProps) {
  const { role } = useRole();
  const locale = useTmdbLocale();
  const validSeasons = useMemo(() => (tv.seasons ?? []).filter((s) => s.season_number > 0), [tv.seasons]);

  const [selectedSeason, setSelectedSeason] = useState<string>(() => validSeasons[0]?.season_number?.toString() ?? "1");

  const seasonNumber = Number(selectedSeason);

  const { data: seasonDetails, isLoading } = useQuery({
    ...tvQueries.season(tv.id, seasonNumber, locale),
    enabled: validSeasons.length > 0,
  });

  if (validSeasons.length === 0) return null;

  const episodes = (seasonDetails?.episodes ?? []).slice().sort((a, b) => a.episode_number - b.episode_number);

  return (
    <div className="space-y-4">
      <Tabs value={selectedSeason} onValueChange={setSelectedSeason}>
        <TabsList size="lg" className="flex-wrap">
          {validSeasons.map((season) => (
            <TabsTrigger key={season.season_number} value={season.season_number.toString()} size="lg">
              <Trans>Season {season.season_number}</Trans>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={`ep-skel-${i.toString()}`} className="h-32 w-full rounded-lg" />
          ))
        ) : episodes.length === 0 ? (
          <Card className="p-6 text-center text-popover-foreground">
            <Trans>No episodes available</Trans>
          </Card>
        ) : (
          episodes.map((episode) => {
            // const episodeDownload = downloadMap.get(`${seasonNumber}-${episode.episode_number}`);
            // TODO: fix this by storing in download season + episode number
            const episodeDownload = {} as Download;
            const episodeDownloadId = episodeDownload?.id;
            const episodeStatus = getDownloadStatus(episodeDownload);
            const isDownloaded = episodeStatus === "completed";
            const isDownloading =
              episodeStatus === "downloading" || episodeStatus === "queued" || episodeStatus === "paused";
            const downloadProgress = episodeDownload.torrent?.progress ?? 0;
            const showDownloadProgress = isDownloading && downloadProgress < 0.95;
            const isPaused = episodeStatus === "paused";

            const isProgressCompleted =
              !!media?.progress?.duration && media.progress.position >= media.progress.duration * 0.95;
            const hasStarted =
              media?.progress &&
              media.progress.position > 0 &&
              !isProgressCompleted &&
              media.progress.downloadId === episodeDownloadId;

            const endsAt =
              episode.runtime && episode.runtime > 0
                ? new Date(Date.now() + episode.runtime * 60000).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

            const seCode = formatSeasonEpisode(seasonNumber, episode.episode_number);

            return (
              <Card key={episode.id} className="p-3 flex flex-col sm:flex-row gap-4 overflow-hidden">
                <div className="flex flex-col items-center gap-2">
                  {episode.still_path ? (
                    <div className="relative shrink-0 w-full sm:w-48 aspect-video rounded-md overflow-hidden bg-muted">
                      <img
                        src={getBackdropUrl(episode.still_path, "w300")}
                        alt={episode.name}
                        className="size-full object-cover"
                      />
                      {showDownloadProgress && (
                        <div className="absolute top-2 left-2">
                          <ProgressCircular
                            value={downloadProgress * 100}
                            size={40}
                            strokeWidth={3}
                            className={isPaused ? "text-orange-500" : "text-primary"}
                          />
                        </div>
                      )}
                      {hasStarted && media.progress && media.progress.duration > 0 && !showDownloadProgress && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-muted/60">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${Math.min(100, (media.progress.position / media.progress.duration) * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <ClapperboardIcon className="size-10 text-muted-foreground" />
                    </div>
                  )}

                  {episodeDownloadId && (isDownloaded || isDownloading) && (
                    <Button
                      size="sm"
                      variant={isDownloaded || isDownloading ? "default" : "secondary"}
                      className="w-full"
                      asChild
                    >
                      <Link to="/downloads/$id/play" params={{ id: episodeDownloadId }}>
                        <PlayIcon className="size-3 mr-1 fill-current" />
                        {hasStarted ? <Trans>Resume</Trans> : <Trans>Play</Trans>}
                      </Link>
                    </Button>
                  )}

                  {role !== "viewer" && !isDownloaded && !isDownloading && (
                    <Button size="sm" className="w-full" asChild>
                      <Link
                        to="/tv/$id/torrents"
                        params={{ id: tv.id.toString() }}
                        search={{
                          season: seasonNumber,
                          episode: episode.episode_number,
                        }}
                      >
                        <MagnetIcon className="size-3 mr-1" />
                        <Trans>Torrents</Trans>
                      </Link>
                    </Button>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base">
                        <span className="text-muted-foreground mr-2">{seCode}</span>
                        {episode.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-popover-foreground flex-wrap">
                        {episode.air_date && (
                          <Badge variant="outline">
                            <CalendarIcon className="size-3" />
                            {new Date(episode.air_date).toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </Badge>
                        )}
                        {episode.runtime && episode.runtime > 0 && (
                          <Badge variant="outline">
                            <ClockIcon className="size-3" />
                            {formatRuntime(episode.runtime)}
                          </Badge>
                        )}
                        {endsAt && (
                          <Badge variant="secondary">
                            <Trans>Ends at</Trans> {endsAt}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {episode.overview && (
                    <p className="text-sm text-popover-foreground line-clamp-3">{episode.overview}</p>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
