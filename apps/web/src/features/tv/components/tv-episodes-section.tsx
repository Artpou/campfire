import { useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import {
  CalendarIcon,
  CheckCircle2Icon,
  ClapperboardIcon,
  ClockIcon,
  MagnetIcon,
  PlayIcon,
} from "lucide-react";
import type { TvShowDetails } from "tmdb-ts";

import { formatRuntime } from "@/shared/helpers/date";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { useRole } from "@/features/auth/hooks/use-role";
import { getBackdropUrl } from "@/features/media/helpers/media.helper";
import { useTorrentDownloads } from "@/features/torrent/hooks/use-torrent-download";
import { formatSeasonEpisode, parseSeasonEpisode } from "@/features/tv/helpers/episode.helper";
import { useTVSeasonDetails } from "@/features/tv/hook/use-tv";

interface TvEpisodesSectionProps {
  tv: TvShowDetails;
}

export function TvEpisodesSection({ tv }: TvEpisodesSectionProps) {
  const { role } = useRole();
  const validSeasons = useMemo(
    () => (tv.seasons ?? []).filter((s) => s.season_number > 0),
    [tv.seasons],
  );

  const [selectedSeason, setSelectedSeason] = useState<string>(
    () => validSeasons[0]?.season_number?.toString() ?? "1",
  );

  const seasonNumber = Number(selectedSeason);

  const { data: seasonDetails, isLoading } = useTVSeasonDetails(
    { tvShowID: tv.id, seasonNumber },
    { enabled: validSeasons.length > 0 },
  );

  const { data: downloads } = useTorrentDownloads();

  const downloadMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!downloads) return map;
    for (const dl of downloads) {
      if (dl.mediaId !== tv.id) continue;
      const matches = parseSeasonEpisode(dl.name);
      for (const m of matches) {
        map.set(`${m.season}-${m.episode}`, dl.id);
      }
    }
    return map;
  }, [downloads, tv.id]);

  if (validSeasons.length === 0) return null;

  const episodes = (seasonDetails?.episodes ?? [])
    .slice()
    .sort((a, b) => a.episode_number - b.episode_number);

  return (
    <div className="space-y-4">
      <Tabs value={selectedSeason} onValueChange={setSelectedSeason}>
        <TabsList className="flex-wrap h-auto">
          {validSeasons.map((season) => (
            <TabsTrigger
              key={season.season_number}
              value={season.season_number.toString()}
              className="px-4 py-2"
            >
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
          <Card className="p-6 text-center text-muted-foreground">
            <Trans>No episodes available</Trans>
          </Card>
        ) : (
          episodes.map((episode) => {
            const episodeDownloadId = downloadMap.get(`${seasonNumber}-${episode.episode_number}`);
            const isDownloaded = !!episodeDownloadId;
            const endsAt =
              episode.runtime && episode.runtime > 0
                ? new Date(Date.now() + episode.runtime * 60000).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

            const seCode = formatSeasonEpisode(seasonNumber, episode.episode_number);

            return (
              <Card
                key={episode.id}
                className="p-3 flex flex-col sm:flex-row gap-4 overflow-hidden"
              >
                <div className="flex flex-col items-center gap-2">
                  {episode.still_path ? (
                    <div className="relative  shrink-0 w-full sm:w-48 aspect-video rounded-md overflow-hidden bg-muted">
                      <img
                        src={getBackdropUrl(episode.still_path, "w300")}
                        alt={episode.name}
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <ClapperboardIcon className="size-10 text-muted-foreground" />
                    </div>
                  )}

                  {isDownloaded && (
                    <Badge variant="default" className="absolute top-2 left-2">
                      <CheckCircle2Icon className="size-3 mr-1" />
                      <Trans>Downloaded</Trans>
                    </Badge>
                  )}

                  {episodeDownloadId && (
                    <Button size="sm" variant="secondary" className="w-full" asChild>
                      <Link to="/downloads/$id/play" params={{ id: episodeDownloadId }}>
                        <PlayIcon className="size-3 mr-1 fill-current" />
                        <Trans>Play</Trans>
                      </Link>
                    </Button>
                  )}

                  {role !== "viewer" && (
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
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {episode.air_date && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="size-3" />
                            {new Date(episode.air_date).toLocaleDateString()}
                          </span>
                        )}
                        {episode.runtime > 0 && (
                          <span className="flex items-center gap-1">
                            <ClockIcon className="size-3" />
                            {formatRuntime(episode.runtime)}
                          </span>
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
                    <p className="text-sm text-muted-foreground line-clamp-3">{episode.overview}</p>
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
