import { useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Download, Media, TMDBTvDetails } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDownIcon, ChevronUpIcon, ClapperboardIcon, MagnetIcon } from "lucide-react";

import { ResponsiveTabs } from "@/shared/components/responsive-tabs";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

import { useRole } from "@/features/auth/hooks/use-role";
import { getDownloadStatus } from "@/features/downloads/helpers/downloads.helper";
import { useDownloadDelete } from "@/features/downloads/hooks/download.queries";
import { MediaBadgeDate } from "@/features/media/components/badge/media-badge-date";
import { MediaBadgeRuntime } from "@/features/media/components/badge/media-badge-runtime";
import { MediaButtonPlay } from "@/features/media/components/button/media-button-play";
import { getBackdropUrl } from "@/features/media/helpers/media.helper";
import { type EpisodeDeleteLabel, TvEpisodeDeleteDialog } from "@/features/tv/components/tv-episode-delete-dialog";
import { TvEpisodeDownloadControls } from "@/features/tv/components/tv-episode-download-controls";
import { TvEpisodeDownloadPanel } from "@/features/tv/components/tv-episode-download-panel";
import { getEpisodesCoveredByDownload } from "@/features/tv/helpers/episode-downloads.helper";
import { formatSeasonEpisode } from "@/features/tv/helpers/episode.helper";
import { tvQueries } from "@/features/tv/hooks/tv.queries";
import { useEpisodeDownloadMap } from "@/features/tv/hooks/use-episode-download-map";

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

interface TvEpisodesSectionProps {
  tv: TMDBTvDetails;
  media?: Media;
  downloads: Download[];
}

export function TvEpisodesSection({ tv, media, downloads }: TvEpisodesSectionProps) {
  const { role } = useRole();
  const { t } = useLingui();
  const isMobile = useIsMobile();
  const locale = useTmdbLocale();
  const deleteTorrent = useDownloadDelete();
  const validSeasons = useMemo(() => (tv.seasons ?? []).filter((s) => s.season_number > 0), [tv.seasons]);

  const [selectedSeason, setSelectedSeason] = useState<string>(() => validSeasons[0]?.season_number?.toString() ?? "1");
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    downloadId: string;
    episodes: EpisodeDeleteLabel[];
  } | null>(null);

  const seasonNumber = Number(selectedSeason);

  const { data: seasonDetails, isLoading } = useQuery({
    ...tvQueries.season(tv.id, seasonNumber, locale),
    enabled: validSeasons.length > 0,
  });

  const episodeDownloadMap = useEpisodeDownloadMap(downloads);

  const episodeNameByKey = useMemo(() => {
    const names = new Map<string, string>();
    for (const episode of seasonDetails?.episodes ?? []) {
      names.set(`${seasonNumber}-${episode.episode_number}`, episode.name);
    }
    return names;
  }, [seasonDetails?.episodes, seasonNumber]);

  if (validSeasons.length === 0) return null;

  const episodes = (seasonDetails?.episodes ?? []).slice().sort((a, b) => a.episode_number - b.episode_number);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <ResponsiveTabs
          value={selectedSeason}
          onValueChange={setSelectedSeason}
          className="min-w-0 flex-1"
          options={validSeasons.map((season) => {
            const episodeCount = season.episode_count ?? 0;
            const downloaded = countSeasonDownloads(season.season_number, episodeCount, episodeDownloadMap);

            return {
              value: season.season_number.toString(),
              label: (
                <span className="flex items-center gap-2">
                  <Trans>Season {season.season_number}</Trans>
                  {downloaded > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {downloaded}/{episodeCount}
                    </Badge>
                  )}
                </span>
              ),
            };
          })}
        />
        <Button size={isMobile ? "icon-lg" : "default"} asChild icon={MagnetIcon}>
          <Link to="/tv/$id/torrents" params={{ id: tv.id.toString() }} search={{ season: seasonNumber }}>
            {!isMobile && <Trans>Torrents</Trans>}
          </Link>
        </Button>
      </div>

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
            const episodeDownload = episodeDownloadMap.get(`${seasonNumber}-${episode.episode_number}`);
            const episodeDownloadId = episodeDownload?.id;
            const episodeStatus = episodeDownload ? getDownloadStatus(episodeDownload) : null;
            const isDownloaded = episodeStatus === "completed";
            const isDownloading =
              episodeStatus === "downloading" || episodeStatus === "queued" || episodeStatus === "paused";
            const hasDownload = !!episodeDownloadId;
            const canPlay = Boolean(episodeDownload);

            const isProgressCompleted =
              !!media?.progress?.duration && media.progress.position >= media.progress.duration * 0.95;
            const _hasStarted =
              media?.progress &&
              media.progress.position > 0 &&
              !isProgressCompleted &&
              media.progress.downloadId === episodeDownloadId;

            const seCode = formatSeasonEpisode(seasonNumber, episode.episode_number);
            const _coveredEpisodes = episodeDownloadId
              ? getEpisodesCoveredByDownload(episodeDownloadId, episodeDownloadMap).map((covered) => ({
                  ...covered,
                  name: episodeNameByKey.get(`${covered.season}-${covered.episode}`),
                }))
              : [];

            const episodeKey = `${seasonNumber}-${episode.episode_number}`;
            const isExpanded = expandedEpisode === episodeKey;
            const toggleExpand = () => setExpandedEpisode(isExpanded ? null : episodeKey);

            return (
              <div key={episode.id} className="space-y-0">
                <Card className="p-3 flex flex-col sm:flex-row gap-4 overflow-hidden">
                  <div className="flex flex-col items-center gap-2 w-full sm:w-48">
                    {episode.still_path ? (
                      <div className="w-full">
                        <div className="group/poster relative shrink-0 w-full aspect-video rounded-md overflow-hidden bg-muted">
                          <img
                            src={getBackdropUrl(episode.still_path, "w300")}
                            alt={episode.name}
                            className="size-full object-cover"
                          />
                          {media && canPlay && episodeDownload && (
                            <MediaButtonPlay
                              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/poster:bg-black/50 transition-colors"
                              media={media}
                              downloadId={episodeDownload.id}
                              season={seasonNumber}
                              episode={episode.episode_number}
                              circular
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-video flex items-center justify-center rounded-md bg-muted">
                        <ClapperboardIcon className="size-10 text-muted-foreground" />
                      </div>
                    )}

                    {media && episodeDownload && (isDownloaded || isDownloading || canPlay) && (
                      <MediaButtonPlay
                        media={media}
                        downloadId={episodeDownload.id}
                        season={seasonNumber}
                        episode={episode.episode_number}
                        className="w-full"
                      />
                    )}

                    {role !== "viewer" && !hasDownload && (
                      <Button size="sm" className="w-full" asChild icon={MagnetIcon}>
                        <Link
                          to="/tv/$id/torrents"
                          params={{ id: tv.id.toString() }}
                          search={{
                            season: seasonNumber,
                            episode: episode.episode_number,
                          }}
                        >
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
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <MediaBadgeDate date={episode.air_date} />
                          <MediaBadgeRuntime minutes={episode.runtime} />
                        </div>
                      </div>
                      {hasDownload && (
                        <Button size="icon-sm" variant="ghost" onClick={toggleExpand} aria-label={t`Toggle details`}>
                          {isExpanded ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                        </Button>
                      )}
                    </div>
                    {episode.overview && (
                      <p className="text-sm text-popover-foreground line-clamp-3">{episode.overview}</p>
                    )}

                    {role !== "viewer" && episodeDownload && !isExpanded && (
                      <TvEpisodeDownloadControls download={episodeDownload} />
                    )}
                  </div>
                </Card>

                {isExpanded && episodeDownload && (
                  <div className="mt-2">
                    <TvEpisodeDownloadPanel download={episodeDownload} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <TvEpisodeDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteTorrent.mutate(
            { id: deleteTarget.downloadId },
            {
              onSuccess: () => setDeleteTarget(null),
            },
          );
        }}
        episodes={deleteTarget?.episodes ?? []}
        isPending={deleteTorrent.isPending}
      />
    </div>
  );
}
