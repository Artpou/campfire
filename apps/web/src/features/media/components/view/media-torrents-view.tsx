import { type ReactNode, useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { Select } from "@/shared/components/select/select";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Container } from "@/shared/ui/container";

import { MediaCardHorizontal } from "@/features/media/components/card/media-card-horizontal";
import { useIndexerModules } from "@/features/module/hooks/use-module";
import { movieQueries } from "@/features/movies/hooks/movie.queries";
import { TorrentIndexersTable } from "@/features/torrent/components/torrent-indexers-table";
import { TorrentTable } from "@/features/torrent/components/torrent-table";
import { useTorrents } from "@/features/torrent/hooks/torrent.queries";
import { tvQueries } from "@/features/tv/hooks/tv.queries";

const ALL_EPISODES = "all";

export interface MediaTorrentsViewProps {
  mediaId: string;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
}

export function MediaTorrentsView({ mediaId, mediaType, season, episode }: MediaTorrentsViewProps) {
  if (mediaType === "movie") {
    return <MovieTorrentsView mediaId={mediaId} />;
  }
  return <TvTorrentsView mediaId={mediaId} season={season} episode={episode} />;
}

function MovieTorrentsView({ mediaId }: { mediaId: string }) {
  const locale = useTmdbLocale();
  const { data: movie } = useSuspenseQuery(movieQueries.details(mediaId, locale));
  return <TorrentsBody media={movie.media} />;
}

function TvTorrentsView({ mediaId, season, episode }: { mediaId: string; season?: number; episode?: number }) {
  const navigate = useNavigate();
  const locale = useTmdbLocale();
  const { data: tvData } = useSuspenseQuery(tvQueries.details(mediaId, locale));
  const { tv, media } = tvData;

  const validSeasons = useMemo(() => (tv?.seasons ?? []).filter((s) => s.season_number > 0), [tv]);
  const selectedSeason = season ?? validSeasons[0]?.season_number;

  const { data: seasonDetails } = useQuery({
    ...tvQueries.season(Number(mediaId), selectedSeason ?? 1, locale),
    enabled: !!selectedSeason,
  });

  const handleSeasonChange = (value: string) => {
    navigate({
      to: "/tv/$id/torrents",
      params: { id: mediaId },
      search: { season: Number(value), episode: undefined },
      resetScroll: false,
    });
  };

  const handleEpisodeChange = (value: string) => {
    navigate({
      to: "/tv/$id/torrents",
      params: { id: mediaId },
      search: {
        season: selectedSeason,
        episode: value === ALL_EPISODES ? undefined : Number(value),
      },
      resetScroll: false,
    });
  };

  return (
    <TorrentsBody
      media={media}
      season={season}
      episode={episode}
      episodeSelectors={
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end mb-4">
          <div className="w-full sm:w-48">
            <Select
              value={selectedSeason?.toString() ?? ""}
              onValueChange={handleSeasonChange}
              triggerClassName="w-full"
              label={<Trans>Season</Trans>}
              options={validSeasons.map((s) => ({
                value: s.season_number.toString(),
                label: <Trans>Season {s.season_number}</Trans>,
              }))}
            />
          </div>

          <div className="w-full sm:w-64">
            <Select
              value={episode?.toString() ?? ALL_EPISODES}
              onValueChange={handleEpisodeChange}
              triggerClassName="w-full"
              label={<Trans>Episode</Trans>}
              options={[
                { value: ALL_EPISODES, label: <Trans>All episodes (full season)</Trans> },
                ...(seasonDetails?.episodes ?? [])
                  .slice()
                  .sort((a, b) => a.episode_number - b.episode_number)
                  .map((ep) => ({
                    value: ep.episode_number.toString(),
                    label: `E${ep.episode_number.toString().padStart(2, "0")} - ${ep.name}`,
                  })),
              ]}
            />
          </div>
        </div>
      }
    />
  );
}

function TorrentsBody({
  media,
  season,
  episode,
  episodeSelectors,
}: {
  media: Media;
  season?: number;
  episode?: number;
  episodeSelectors?: ReactNode;
}) {
  const { indexers: managers, hasIndexers } = useIndexerModules();
  const { torrents, sources, indexerStats, isLoading } = useTorrents(media, managers, { season, episode });
  const [visibleSources, setVisibleSources] = useState<Set<string>>(new Set());

  const filteredTorrents = useMemo(() => {
    if (visibleSources.size === 0) return torrents;
    return torrents.filter((torrent) => torrent.indexerId && visibleSources.has(torrent.indexerId));
  }, [torrents, visibleSources]);

  const torrentTable = (
    <TorrentTable torrents={filteredTorrents} media={media} isLoading={isLoading} hasIndexers={hasIndexers} />
  );

  return (
    <Container>
      <MediaCardHorizontal media={media} withOverview withSocialActions />
      {episodeSelectors}
      {sources.length > 1 ? (
        <div className="xl:grid xl:grid-cols-7 xl:gap-6">
          <div className="xl:col-span-5">{torrentTable}</div>
          <div className="hidden xl:block xl:col-span-2">
            <TorrentIndexersTable
              sources={sources}
              indexerStats={indexerStats}
              onVisibilityChange={setVisibleSources}
            />
          </div>
        </div>
      ) : (
        torrentTable
      )}
    </Container>
  );
}
