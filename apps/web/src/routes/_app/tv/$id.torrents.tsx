import { useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Container } from "@/shared/ui/container";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import { useAuth } from "@/features/auth/auth-store";
import { useMedia } from "@/features/media/hooks/use-media";
import { TorrentIndexersTable } from "@/features/torrent/components/torrent-indexers-table";
import { TorrentTable } from "@/features/torrent/components/torrent-table";
import { useIndexers } from "@/features/torrent/hooks/use-indexers";
import { useTorrents } from "@/features/torrent/hooks/use-torrent";
import { useTVDetails, useTVSeasonDetails } from "@/features/tv/hook/use-tv";

export interface TvTorrentsSearch {
  season?: number;
  episode?: number;
}

const optionalPositiveInt = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.floor(v);
  if (typeof v === "string" && v.length > 0) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return undefined;
};

export const Route = createFileRoute("/_app/tv/$id/torrents")({
  component: TVTorrentsPage,
  beforeLoad: () => {
    const user = useAuth.getState().user;
    if (user?.role === "viewer") {
      throw redirect({ to: "/404" });
    }
  },
  validateSearch: (search: Record<string, unknown>): TvTorrentsSearch => {
    return {
      season: optionalPositiveInt(search.season),
      episode: optionalPositiveInt(search.episode),
    };
  },
});

const ALL_EPISODES = "all";

function TVTorrentsPage() {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const { data: tvData } = useTVDetails(params.id);
  const { data: media, isLoading: isMediaLoading } = useMedia(Number(params.id), {
    enabled: !!tvData,
  });
  const { data: indexers, isLoading: isIndexersLoading } = useIndexers();
  const torrentQueries = useTorrents(media, indexers || [], {
    season: search.season,
    episode: search.episode,
  });

  const [visibleIndexers, setVisibleIndexers] = useState<Set<string>>(new Set());

  const tv = tvData?.tv;
  const validSeasons = useMemo(() => (tv?.seasons ?? []).filter((s) => s.season_number > 0), [tv]);

  const selectedSeason = search.season ?? validSeasons[0]?.season_number;

  const { data: seasonDetails } = useTVSeasonDetails(
    { tvShowID: Number(params.id), seasonNumber: selectedSeason ?? 1 },
    { enabled: !!selectedSeason },
  );

  const allTorrents = useMemo(() => {
    if (!indexers) return [];
    const torrents = torrentQueries.flatMap((query, index) => {
      if (!query.data) return [];
      const indexerId = indexers[index]?.id;
      return query.data.map((torrent) => ({ ...torrent, indexerId }));
    });

    return torrents.sort((a, b) => b.seeders - a.seeders);
  }, [torrentQueries, indexers]);

  const filteredTorrents = useMemo(() => {
    if (visibleIndexers.size === 0) return allTorrents;
    return allTorrents.filter((t) => t.indexerId && visibleIndexers.has(t.indexerId));
  }, [allTorrents, visibleIndexers]);

  const isLoading = isMediaLoading || isIndexersLoading;
  const isAnyTorrentLoading = torrentQueries.some((query) => query.isLoading);

  const handleSeasonChange = (value: string) => {
    navigate({
      to: "/tv/$id/torrents",
      params,
      search: { season: Number(value), episode: undefined },
    });
  };

  const handleEpisodeChange = (value: string) => {
    navigate({
      to: "/tv/$id/torrents",
      params,
      search: {
        season: selectedSeason,
        episode: value === ALL_EPISODES ? undefined : Number(value),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center size-full">
        <SeedarrLoader />
      </div>
    );
  }

  if (!media || !tv) return null;

  return (
    <Container>
      <AppBreadcrumb
        items={[
          { name: "TV Shows", link: "/tv" },
          { name: media.title, link: `/tv/${params.id}` },
          { name: "Torrents" },
        ]}
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end mb-4">
        <div className="flex flex-col gap-2 w-full sm:w-48">
          <Label>
            <Trans>Season</Trans>
          </Label>
          <Select
            value={selectedSeason?.toString() ?? ""}
            onValueChange={handleSeasonChange}
            disabled={validSeasons.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {validSeasons.map((season) => (
                <SelectItem key={season.season_number} value={season.season_number.toString()}>
                  <Trans>Season {season.season_number}</Trans>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-64">
          <Label>
            <Trans>Episode</Trans>
          </Label>
          <Select
            value={search.episode?.toString() ?? ALL_EPISODES}
            onValueChange={handleEpisodeChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_EPISODES}>
                <Trans>All episodes (full season)</Trans>
              </SelectItem>
              {(seasonDetails?.episodes ?? [])
                .slice()
                .sort((a, b) => a.episode_number - b.episode_number)
                .map((ep) => (
                  <SelectItem key={ep.id} value={ep.episode_number.toString()}>
                    {`E${ep.episode_number.toString().padStart(2, "0")} - ${ep.name}`}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="xl:grid xl:grid-cols-7 xl:gap-6">
        <div className="xl:col-span-5">
          <TorrentTable torrents={filteredTorrents} media={media} isLoading={isAnyTorrentLoading} />
        </div>
        <div className="hidden xl:block xl:col-span-2">
          <TorrentIndexersTable
            indexers={indexers || []}
            torrentQueries={torrentQueries}
            onVisibilityChange={setVisibleIndexers}
          />
        </div>
      </div>
    </Container>
  );
}
